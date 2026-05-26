import express from 'express';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import jwt from 'jsonwebtoken';

const router = express.Router();
import prisma from '../utils/prisma.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const JWT_SECRET = process.env.JWT_SECRET as string;

// Middleware to authenticate JWT token
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

const optionalAuthenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return next();

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (!err) req.user = user;
        next();
    });
};

router.post('/shop/:id/summarize-reviews', authenticateToken, async (req: any, res: any) => {
    try {
        const storeId = req.params.id;
        const { lang } = req.query;

        const store = await prisma.store.findUnique({
            where: { id: storeId },
            include: { reviews: true }
        });

        if (!store) {
            return res.status(404).json({ error: 'Store not found.' });
        }

        if (store.reviews.length < 3) {
            return res.status(400).json({ error: 'Not enough reviews to generate a summary (minimum 3 required).' });
        }

        // Check if there is already a summary generated recently to prevent abuse
        // For now we just over-write

        // Prepare the review texts for the prompt
        const reviewTexts = store.reviews.map((r, i) => `Review ${i+1}: ${r.content}`).join('\n\n');

        const isEnglish = lang === 'en';
        
        const prompt = isEnglish ? `
            You are an expert Cafe Review Summarizer.
            Below are several user reviews for a coffee shop named "${store.name}".
            Please read them and provide a concise, engaging 3-sentence summary highlighting the main points (e.g., taste, atmosphere, standout features, or common complaints).
            Please respond in English. Use friendly and natural tone, starting with "Most visitors say...".

            Reviews:
            ${reviewTexts}
        ` : `
            You are an expert Cafe Review Summarizer.
            Below are several user reviews for a coffee shop named "${store.name}".
            Please read them and provide a concise, engaging 3-sentence summary highlighting the main points (e.g., taste, atmosphere, standout features, or common complaints).
            Please respond in Korean. Use friendly and natural tone, starting with "방문?�들?� 주로...".

            Reviews:
            ${reviewTexts}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.7,
            }
        });

        const aiSummary = response.text?.trim() || "리뷰�??�약?????�습?�다.";

        // Update the DB
        await prisma.store.update({
            where: { id: storeId },
            data: { aiReviewSummary: aiSummary }
        });

        res.status(200).json({ summary: aiSummary });

    } catch (error) {
        console.error("AI Review Summarize Error:", error);
        res.status(500).json({ error: 'Failed to generate AI summary.' });
    }
});

router.post('/map-shops', optionalAuthenticateToken, async (req: any, res: any) => {
    try {
        const { currentLatitude, currentLongitude, language, promptStr } = req.body;
        
        const lat = parseFloat(currentLatitude);
        const lng = parseFloat(currentLongitude);
        
        // South Korea bounds roughly: Lat 33.0 to 38.5, Lng 124.5 to 132.0
        const isKorea = !isNaN(lat) && !isNaN(lng) && lat >= 33.0 && lat <= 38.5 && lng >= 124.5 && lng <= 132.0;

        if (isKorea && process.env.KAKAO_REST_API_KEY) {
            console.log(`[Kakao Hybrid] Intercepting AI map request for Korean coordinates (${lat}, ${lng})`);
            try {
                // query "\uce74\ud398" (카페)
                const kakaoUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent("\uce74\ud398")}&y=${lat}&x=${lng}&radius=10000&size=15&sort=accuracy`;
                const kakaoRes = await fetch(kakaoUrl, {
                    headers: {
                        "Authorization": `KakaoAK ${process.env.KAKAO_REST_API_KEY.trim()}`
                    }
                });
                if (kakaoRes.ok) {
                    const data = await kakaoRes.json();
                    const parsedData = (data.documents || []).map((d: any) => ({
                        id: `kakao-${d.id}`,
                        name: d.place_name,
                        lat: parseFloat(d.y),
                        lng: parseFloat(d.x),
                        address: d.road_address_name || d.address_name,
                        aiSummary: d.category_name, // fallback for description
                        isGeneric: true
                    }));
                    return res.status(200).json({ shops: parsedData, chunks: [] });
                } else {
                    console.error("[Kakao Hybrid] Kakao API failed, falling back to Gemini", await kakaoRes.text());
                }
            } catch (kErr) {
                console.error("[Kakao Hybrid] Fetch error", kErr);
            }
        }

        // If not Korea (or Kakao failed), use Google Places API
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Missing coordinates for global search' });
        }

        console.log(`[Google Hybrid] Fetching from Google Places API for coordinates (${lat}, ${lng})`);
        const googleUrl = 'https://places.googleapis.com/v1/places:searchNearby';
        const googleRes = await fetch(googleUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY as string,
                'X-Goog-FieldMask': 'places.displayName,places.location,places.formattedAddress,places.id,places.editorialSummary,places.primaryType'
            },
            body: JSON.stringify({
                includedTypes: ['coffee_shop', 'cafe'],
                maxResultCount: 20,
                locationRestriction: {
                    circle: {
                        center: { latitude: lat, longitude: lng },
                        radius: 10000.0
                    }
                },
                rankPreference: 'POPULARITY',
                languageCode: language === 'Korean' ? 'ko' : 'en'
            })
        });

        if (!googleRes.ok) {
            const errorText = await googleRes.text();
            console.error('[Google Hybrid] Places API failed', errorText);
            return res.status(500).json({ error: 'Google Places API failed' });
        }

        const data = await googleRes.json();
        const parsedData = (data.places || []).map((p: any) => ({
            id: `google-${p.id}`,
            name: p.displayName?.text || 'Unknown Cafe',
            lat: p.location?.latitude || lat,
            lng: p.location?.longitude || lng,
            address: p.formattedAddress,
            aiSummary: p.editorialSummary?.text || p.primaryType,
            isGeneric: true
        }));

        res.status(200).json({ shops: parsedData, chunks: [] });
    } catch (error) {
        console.error('AI Map Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch AI map shops' });
    }
});

// Generate Dynamic Coffee Recommendation JSON
router.post('/curator-recommend', optionalAuthenticateToken, async (req: any, res: any) => {
    try {
        const { prefs, userAgeGroup, userGender, language } = req.body;
        
        const prompt = `You are a world-class coffee sommelier and Q-Grader.
        A user has provided the following preferences and context:
        Preferences: ${JSON.stringify(prefs)}
        Demographics: Age: ${userAgeGroup || 'Unknown'}, Gender: ${userGender || 'Unknown'}
        
        Your task is to dynamically generate the absolute perfect coffee bean recommendation that matches their taste profile (Acidity: ${prefs?.tasteAcidity}, Sweetness: ${prefs?.tasteSweetness}, Bitterness: ${prefs?.tasteBitterness}, Body: ${prefs?.tasteBody}), health constraints (if any), and environmental context (Weather, Time, Mood).
        You may invent a highly realistic specialty coffee profile or recommend a famous real-world coffee. 
        
        Respond ONLY with a valid JSON object matching the following structure exactly (DO NOT wrap in markdown blocks, just raw JSON):
        {
          "bean": {
            "id": "ai-generated-bean",
            "name": "[Creative but realistic bean name, e.g., 'Ethiopia Guji Anaerobic Natural']",
            "origin": "[Country]",
            "region": "[Region]",
            "processing": "[Processing Method]",
            "roastLevel": "[Light, Medium, or Dark]",
            "acidity": [Number 1-5],
            "body": [Number 1-5],
            "sweetness": [Number 1-5],
            "bitterness": [Number 1-5],
            "flavorNotes": ["[Flavor 1]", "[Flavor 2]", "[Flavor 3]"],
            "description": "[A short 1-sentence description of the coffee in ${language?.startsWith('en') ? 'English' : 'Korean'}]",
            "brewingGuide": "[A short brewing tip in ${language?.startsWith('en') ? 'English' : 'Korean'}]",
            "foodPairing": []
          },
          "brand": {
            "id": "ai-generated-brand",
            "name": "[A famous global or premium coffee brand that fits this roast, e.g., 'Blue Bottle Coffee', 'Fritz Coffee', 'Starbucks Reserve']",
            "description": "[Short description of the brand in ${language?.startsWith('en') ? 'English' : 'Korean'}]",
            "website": ""
          }
        }`;

        const aiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { temperature: 0.7 }
        });

        let text = aiResponse.text || "{}";
        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) text = jsonMatch[0];

        const parsed = JSON.parse(text);
        res.status(200).json(parsed);
    } catch (error) {
        console.error("AI Curator Recommend Error:", error);
        res.status(500).json({ error: "Failed to generate AI recommendation." });
    }
});

// AI Tasting Note Analysis
router.post('/tasting-note/analyze', authenticateToken, async (req: any, res: any) => {
    try {
        const { rawNote, coffeeName, brand } = req.body;
        if (!rawNote) return res.status(400).json({ error: "Missing rawNote" });

        const prompt = `
            You are an expert Coffee Q-Grader and Sommelier.
            A user just drank coffee ${brand ? `from "${brand}"` : ''} named "${coffeeName}" and left this rough review:
            "${rawNote}"

            Analyze this rough note and return ONLY a JSON object containing the professional cupping attributes.
            Format EXACTLY like this:
            {
                "aiTranslatedNote": "A professional, poetic 2-sentence cupping note in Korean.",
                "flavorTags": "ex) 초콜�?견과�??�간???��?",
                "acidity": 3.5, // 1 to 5 scale
                "sweetness": 4.0, // 1 to 5 scale
                "bitterness": 2.5, // 1 to 5 scale
                "body": 3.0, // 1 to 5 scale
                "aroma": 4 // 1 to 5 scale
            }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { temperature: 0.3 }
        });

        let text = response.text || "{}";
        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) text = jsonMatch[0];

        const parsed = JSON.parse(text);
        res.status(200).json(parsed);
    } catch (error) {
        console.error("AI Tasting Note Error:", error);
        res.status(500).json({ error: "Failed to analyze tasting note." });
    }
});

// Save Tasting Note
router.post('/tasting-note', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { coffeeName, brand, rawUserNote, aiTranslatedNote, acidity, sweetness, bitterness, body, aroma, flavorTags } = req.body;

        // Note: Using any type bypass for missing TS Generation (since prisma generate might fail)
        const newNote = await (prisma as any).tastingNote.create({
            data: {
                userId, coffeeName, brand, rawUserNote, aiTranslatedNote,
                acidity, sweetness, bitterness, body, aroma, flavorTags
            }
        });

        // Feedback loop: Update user preferences (moving average)
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            const updatePref = (current: number | null, incoming: number) => {
                if (current === null || current === 0) return incoming;
                return Math.round(((current * 0.8) + (incoming * 0.2)) * 10) / 10;
            };

            await prisma.user.update({
                where: { id: userId },
                data: {
                    prefAcidity: updatePref(user.prefAcidity, acidity),
                    prefSweetness: updatePref(user.prefSweetness, sweetness),
                    prefBitterness: updatePref(user.prefBitterness, bitterness),
                    prefBody: updatePref(user.prefBody, body),
                    // aroma isn't widely stored historically, keep it optionally
                }
            });
        }

        res.status(201).json(newNote);
    } catch (error) {
        console.error("Save Tasting Note Error:", error);
        res.status(500).json({ error: "Failed to save tasting note." });
    }
});

// Get Taste Matrix
router.get('/tasting-note/matrix', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        
        // Try getting averaged notes directly
        const notes = await (prisma as any).tastingNote.findMany({ where: { userId } });
        
        if (!notes || notes.length === 0) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return res.status(404).json({ error: "User not found" });
            return res.status(200).json({
                hasData: false,
                matrix: [
                    { subject: '산미', A: user.prefAcidity || 0, fullMark: 5 },
                    { subject: '단맛', A: user.prefSweetness || 0, fullMark: 5 },
                    { subject: '쓴맛', A: user.prefBitterness || 0, fullMark: 5 },
                    { subject: '바디감', A: user.prefBody || 0, fullMark: 5 },
                    { subject: '아로마', A: 3, fullMark: 5 } // Default or fallback
                ]
            });
        }

        const count = notes.length;
        const avg = (field: string) => notes.reduce((sum: number, note: any) => sum + (note[field] || 0), 0) / count;

        res.status(200).json({
            hasData: true,
            totalNotes: count,
            matrix: [
                { subject: '산미', A: avg('acidity'), fullMark: 5 },
                { subject: '단맛', A: avg('sweetness'), fullMark: 5 },
                { subject: '쓴맛', A: avg('bitterness'), fullMark: 5 },
                { subject: '바디감', A: avg('body'), fullMark: 5 },
                { subject: '아로마', A: avg('aroma'), fullMark: 5 }
            ],
            recentTags: [...new Set(notes.map((n:any) => (n.flavorTags || '').split(',')).flat())].filter(Boolean).slice(0, 10)
        });
    } catch (error) {
        console.error("Fetch Matrix Error:", error);
        res.status(500).json({ error: "Failed to fetch matrix." });
    }
});
// Generate AI Cafe Tour Route
router.post('/tour/generate', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { region, theme, lat, lng } = req.body;

        if (!region && (!lat || !lng)) {
            return res.status(400).json({ error: "지??�� ?�는 ??경도 좌표가 ?�요?�니??" });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const currentLang = req.query.lang === 'en' ? 'English' : 'Korean';
        const locationContext = region ? `region: ${region}` : `coordinates: Latitude ${lat}, Longitude ${lng}`;
        const themeContext = theme ? `The theme/vibe of this tour is: ${theme}.` : 'Create a well-balanced coffee tour.';

        const prompt = `You are an expert specialty coffee curator.
        Create a 1-day cafe tour route with exactly 3 to 4 stops around the following location: ${locationContext}.
        ${themeContext}
        Ensure the stops formulate a logical geographical walking or public transit route.
        For each stop, provide the cafe name, latitude, longitude, address, and a very short 1-sentence reason for recommending it (in ${currentLang}).
        
        Respond ONLY with a valid JSON array of objects.
        Format EXACTLY like this example: 
        [
            {"name": "Anthracite Coffee", "lat": 37.545, "lng": 126.918, "address": "Seoul, Mapo-gu...", "reason": "A great place to start with a strong espresso."},
            {"name": "Fritz Coffee Company", "lat": 37.540, "lng": 126.945, "address": "Seoul, Mapo-gu...", "reason": "Famous for their bakery and retro vibe."}
        ]`;

        const mapsResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { 
                tools: [{ googleMaps: {} }],
                maxOutputTokens: 8192,
                temperature: 0.2
            },
        });

        let text = mapsResponse.text || "[]";
        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) text = jsonMatch[0];

        let parsedStops: any[] = [];
        try {
            parsedStops = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse tour JSON:", e);
            return res.status(500).json({ error: "AI ?�답 ?�싱???�패?�습?�다." });
        }

        if (!Array.isArray(parsedStops) || parsedStops.length === 0) {
            return res.status(404).json({ error: "?�당 지??��???�절???�어 코스�??�성?��? 못했?�니??" });
        }

        const itemsData = [];
        let orderIndex = 0;

        for (const stop of parsedStops) {
            if (!stop.name || !stop.lat || !stop.lng) continue;

            // Try to find an existing store in DB
            let store = await (prisma as any).store.findFirst({
                where: { 
                    name: { contains: stop.name }
                }
            });

            // If not found, create a generic one for the route
            if (!store) {
                store = await (prisma as any).store.create({
                    data: {
                        ownerId: userId, // Mark the requester as the owner temporarily
                        name: stop.name,
                        address: stop.address || "주소 ?�보 ?�음",
                        lat: parseFloat(stop.lat),
                        lng: parseFloat(stop.lng),
                        status: "AI_SUGGESTED",
                        shortDesc: stop.reason || "AI ?�레?�터 추천 카페",
                        longDesc: "AI ?�동 ?�성 코스 경유지?�니??",
                        hours: "?�보 ?�이",
                        signatureBean: "?�페?�티 커피",
                        acidity: 3, sweetness: 3, bitterness: 3, body: 3,
                        equipment: "기본 ?�스?�레??머신",
                        signatureMenu: "브루??커피",
                        dessertPairing: "추천 없음",
                        primaryCoffeeType: "GENERAL"
                    }
                });
            }

            itemsData.push({
                storeId: store.id,
                orderIndex: orderIndex++
            });
        }

        if (itemsData.length === 0) {
            return res.status(500).json({ error: "?�어 경유지�??�성?��? 못했?�니??" });
        }

        const courseName = region ? `${region} AI 추천 코스` : `AI 카페 ?�어 코스`;
        
        // Create the Collection (Course)
        const collection = await (prisma as any).collection.create({
            data: {
                userId,
                name: courseName,
                description: `${theme ? theme + ' ?�마�?' : ''}AI가 구성??1???��??��? ?�별 코스?�니??`,
                isPilgrimageCourse: true,
                isPublic: false,
                items: {
                    create: itemsData
                }
            }
        });

        res.status(200).json({ 
            success: true, 
            collectionId: collection.id,
            totalStops: itemsData.length,
            tourName: collection.name
        });

    } catch (error) {
        console.error("Generate Tour Error:", error);
        res.status(500).json({ error: "?�버 ?�류�??�해 ?�어 코스�??�성?��? 못했?�니??" });
    }
});
router.post('/stream-curation', optionalAuthenticateToken, async (req: any, res: any) => {
    try {
        const fetchRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        if (fetchRes.body) {
            // The body is a ReadableStream in native Node 18+ fetch
            const reader = fetchRes.body.getReader();
            const processStream = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        res.write(value);
                    }
                } catch (err) {
                    console.error("Stream reading error:", err);
                } finally {
                    res.end();
                }
            };
            processStream();
        } else {
            res.end();
        }
    } catch (error) {
        console.error("Proxy stream error:", error);
        res.status(500).json({ error: "Failed to proxy stream." });
    }
});

export default router;

