import express from 'express';
import fs from 'fs';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import { encryptPII, decryptPII } from '../utils/encryption.js';
import jwt from 'jsonwebtoken';
import { uploadLimiter } from '../utils/uploadLimiter.js';

const router = express.Router();
import prisma from '../utils/prisma.js';
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

// POST: Register a new shop
router.post('/register', authenticateToken, uploadLimiter, async (req: any, res: any) => {
    try {
        const {
            name, address, phone, hours, shortDesc, longDesc, signatureBean,
            acidity, sweetness, bitterness, body, equipment, signatureMenu,
            dessertPairing, hasDecaf, hasOatMilk, mediaUrls, websiteUrl,
            lat, lng, markerImageIndex, primaryCoffeeType,
            coffeeMenuImageUrl, popularMenuImageUrl, beanOrigin, beanRoastLevel, beanNotes,
            translations, menuItems, // expected to be [{ languageCode: 'en', shortDesc: '...', longDesc: '...' }]
            businessNumber, ownerName, settlementAccount,
            hasParking, hasWifi, hasPetFriendly, hasPowerOutlets
        } = req.body;

        const ownerId = req.user.id; // Extracted from JWT

        // Enforce 1 store per account rule
        const existingStore = await prisma.store.findFirst({ where: { ownerId } });
        if (existingStore) {
            return res.status(403).json({ error: '이미 등록된 매장이 있습니다. 1계정당 1개의 매장만 등록할 수 있습니다.' });
        }

        const owner = await prisma.user.findUnique({ where: { id: ownerId } });
        const userProfileImageUrl = owner?.profileImageUrl || null;

        // Process base64 files and create public URLs
        const processedUrls: string[] = [];
        if (mediaUrls && Array.isArray(mediaUrls)) {
            // Predict the new Store ID using a UUID (Prisma lets us set the ID upfront if we want, or we can just generate a UUID for the folder logic)
            // Wait, since we need the storeId for the folder, we can just use a temporary folder or create the store first, then update it.
            // Let's create the store first, then process media, then add media.
        }

        const newStore = await (prisma as any).store.create({
            data: {
                ownerId,
                name,
                address: encryptPII(address),
                phone: phone ? encryptPII(phone) : null,
                hours,
                shortDesc,
                longDesc,
                signatureBean,
                primaryCoffeeType: primaryCoffeeType || 'GENERAL',
                acidity: Number(acidity),
                sweetness: Number(sweetness),
                bitterness: Number(bitterness),
                body: Number(body),
                equipment,
                signatureMenu,
                dessertPairing,
                hasDecaf: Boolean(hasDecaf),
                hasOatMilk: Boolean(hasOatMilk),
                websiteUrl: websiteUrl || null,
                lat: lat !== undefined ? Number(lat) : null,
                lng: lng !== undefined ? Number(lng) : null,
                status: 'PENDING',
                coffeeMenuImageUrl,
                popularMenuImageUrl,
                beanOrigin,
                beanRoastLevel,
                beanNotes,
                businessNumber: businessNumber || null,
                ownerName: ownerName || null,
                settlementAccount: settlementAccount || null,
                hasParking: Boolean(hasParking),
                hasWifi: Boolean(hasWifi),
                hasPetFriendly: Boolean(hasPetFriendly),
                hasPowerOutlets: Boolean(hasPowerOutlets)
            }
        });

        // 1.5 Handle Translations
        if (translations && Array.isArray(translations)) {
            await prisma.storeTranslation.createMany({
                data: translations.map((t: any) => ({
                    storeId: newStore.id,
                    languageCode: t.languageCode,
                    shortDesc: t.shortDesc,
                    longDesc: t.longDesc
                }))
            });
        }

        // 2. Process Media now that we have the newStore.id
        if (mediaUrls && Array.isArray(mediaUrls)) {
            for (const url of mediaUrls) {
                if (url.startsWith('data:')) {
                    const matches = url.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const type = matches[1];
                        const data = Buffer.from(matches[2], 'base64');
                        const ext = type.split('/')[1] || 'jpg';
                        const filename = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;

                        const relativeDir = path.join('users', ownerId, 'shops', newStore.id);
                        const uploadPath = path.join(process.cwd(), 'uploads', relativeDir);

                        if (!fs.existsSync(uploadPath)) {
                            fs.mkdirSync(uploadPath, { recursive: true });
                        }

                        fs.writeFileSync(path.join(uploadPath, filename), data);
                        const publicUrl = `/uploads/${relativeDir.split(path.sep).join('/')}/${filename}`;
                        processedUrls.push(publicUrl);
                    }
                } else {
                    processedUrls.push(url);
                }
            }

            // 3. Save Media records linked to the new Store
            if (processedUrls.length > 0) {
                await prisma.media.createMany({
                    data: processedUrls.map((url: string) => ({
                        storeId: newStore.id,
                        url,
                        type: url.match(/\.(mp4|mov|webm)$/i) ? 'VIDEO' : 'IMAGE'
                    }))
                });

                // 4. Update the Store with the selected Main and Marker images
                const mainUrl = processedUrls[0] || null;
                const markerUrl = userProfileImageUrl || processedUrls[0] || null;

                await prisma.store.update({
                    where: { id: newStore.id },
                    data: {
                        mainImageUrl: mainUrl,
                        markerImageUrl: markerUrl
                    }
                });
            }
        }

        
        // 5. Handle Detailed MenuItems
        if (menuItems && Array.isArray(menuItems)) {
            const processedItems = menuItems.map((item: any, idx: number) => {
                let imageUrl = item.imageUrl || null;
                if (imageUrl && imageUrl.startsWith('data:')) {
                    const matches = imageUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const type = matches[1];
                        const data = Buffer.from(matches[2], 'base64');
                        const ext = type.split('/')[1] || 'jpg';
                        const filename = `menu_${Date.now()}_${idx}.${ext}`;
                        const relativeDir = path.join('users', ownerId, 'shops', newStore.id, 'menu');
                        const uploadPath = path.join(process.cwd(), 'uploads', relativeDir);
                        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
                        fs.writeFileSync(path.join(uploadPath, filename), data);
                        imageUrl = `/uploads/${relativeDir.split(path.sep).join('/')}/${filename}`;
                    }
                }
                return {
                    storeId: newStore.id,
                    name: item.name,
                    price: item.price,
                    description: item.description || null,
                    imageUrl,
                    category: item.category || 'COFFEE',
                    orderIndex: idx
                };
            });
            if (processedItems.length > 0) {
                await (prisma as any).menuItem.createMany({ data: processedItems });
            }
        }
        // 6. Update user role to OWNER
        if (owner?.role === 'USER') {
            await prisma.user.update({
                where: { id: ownerId },
                data: { role: 'OWNER' }
            });
        }

        res.status(201).json({ message: 'Store registered successfully', storeId: newStore.id });
    } catch (error) {
        console.error("Shop registration error:", error);
        res.status(500).json({ error: 'Internal server error while defining shop.' });
    }
});

// Helper to get user context optionally (without rejecting like authenticateToken)
const optionalAuthenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded;
    } catch {
        req.user = null;
    }
    next();
};

// GET: Fetch trending shops based on recent 3-month community tags
router.get('/trending', optionalAuthenticate, async (req: any, res: any) => {
    try {
        const { countryCode } = req.query;
        let finalCountryCode = countryCode && countryCode !== 'GLOBAL' ? String(countryCode) : undefined;
        
        if (req.user?.id) {
            try {
                const dbUser = await (prisma as any).user.findUnique({ where: { id: req.user.id }, select: { countryCode: true } });
                if (dbUser && dbUser.countryCode && dbUser.countryCode !== 'GLOBAL') {
                    finalCountryCode = dbUser.countryCode;
                }
            } catch (e) {}
        }

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const whereClause: any = {
            createdAt: { gte: threeMonthsAgo },
            storeId: { not: null },
            postType: 'NORMAL'
        };
        if (finalCountryCode) {
            whereClause.countryCode = finalCountryCode;
        }

        const trendingGroups = await (prisma as any).post.groupBy({
            by: ['storeId'],
            where: whereClause,
            _count: { storeId: true },
            orderBy: { _count: { storeId: 'desc' } },
            take: 5
        });

        const topStoreIds = trendingGroups.map((g: any) => g.storeId).filter(Boolean) as string[];

        let stores: any[] = [];
        
        if (topStoreIds.length > 0) {
            stores = await prisma.store.findMany({
                where: { id: { in: topStoreIds }, status: 'APPROVED' },
                include: { media: true }
            });
        }

        // Fallback: If no trending shops found or they are not approved/available, fetch recently approved stores
        if (stores.length === 0) {
            const fallbackWhere: any = { status: 'APPROVED' };
            
            stores = await prisma.store.findMany({
                where: fallbackWhere,
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { media: true }
            });
        }

        // Map and Decrypt PII
        const publicStores = stores.map((store: any) => {
            return {
                id: store.id,
                name: store.name,
                address: store.address ? decryptPII(store.address) : '',
                lat: store.lat,
                lng: store.lng,
                mainImageUrl: store.mainImageUrl,
                markerImageUrl: store.markerImageUrl,
                primaryCoffeeType: store.primaryCoffeeType,
                isPremiumTop: store.isPremiumTop
            };
        });

        // Restore sort order based on tag frequency
        publicStores.sort((a: any, b: any) => topStoreIds.indexOf(a.id) - topStoreIds.indexOf(b.id));

        res.status(200).json(publicStores);
    } catch (error) {
        console.error("Fetch trending shops error:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// GET: Fetch all public shops for the ShopBrowser (Map)
router.get('/', optionalAuthenticate, async (req: any, res: any) => {
    try {
        const { lat, lng, radius, minLat, maxLat, minLng, maxLng, q, regionQuery, type, lang, hasParking, hasWifi, hasPetFriendly, hasPowerOutlets, countryCode } = req.query;

        // Fetch user preferences for AI Match Rate if logged in
        let userPrefs = null;
        if (req.user && req.user.id) {
            const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
            if (dbUser && dbUser.prefAcidity != null) {
                userPrefs = dbUser;
            }
        }

        // If no coordinates provided, default to fetching standard 50 recent shops
        let whereClause: any = { status: 'APPROVED' };

        if (countryCode && countryCode !== 'GLOBAL') {
            if (countryCode === 'KR') {
                whereClause.lng = { gte: 120, lte: 135 }; // Approximate bounds for KR
            } else if (countryCode === 'US') {
                whereClause.lng = { gte: -180, lte: -60 }; // Approximate bounds for US
            } else if (countryCode === 'JP') {
                whereClause.lng = { gte: 128, lte: 150 }; // Approximate bounds for JP
            } else if (countryCode === 'CN') {
                whereClause.lng = { gte: 73, lte: 135 }; // Approximate bounds for CN
            }
        }

        if (type && type !== 'ALL') {
            if (type === 'SINGLE_ORIGIN') {
                whereClause.primaryCoffeeType = { in: ['SINGLE_ORIGIN', 'SPECIALTY_ROASTERY'] };
            } else if (type === 'BLENDED') {
                whereClause.primaryCoffeeType = { in: ['BLENDED', 'SPECIALTY_ROASTERY'] };
            } else {
                whereClause.primaryCoffeeType = String(type);
            }
        }

        if (hasParking === 'true') whereClause.hasParking = true;
        if (hasWifi === 'true') whereClause.hasWifi = true;
        if (hasPetFriendly === 'true') whereClause.hasPetFriendly = true;
        if (hasPowerOutlets === 'true') whereClause.hasPowerOutlets = true;

        if (q) {
            const queryStr = String(q);
            whereClause = {
                ...whereClause,
                OR: [
                    { name: { contains: queryStr } },
                    { signatureBean: { contains: queryStr } }
                ]
            };
        }

        // Custom region query (to exclude enclaves like Seoul when searching Gyeonggi)
        // Note: since address is encrypted PII in DB, exact substring search on the DB level is impossible. 
        // We MUST NOT add it to whereClause. Instead, we filter them AFTER DB fetch in memory.
        if (regionQuery) {
            // Region filtering strategy is handled in post-processing below after DecryptPII.
        }

        // Bounding Box Coordinates (Preferred over radius)
        if (minLat && maxLat && minLng && maxLng) {
            whereClause = {
                ...whereClause,
                lat: {
                    gte: parseFloat(minLat as string),
                    lte: parseFloat(maxLat as string)
                },
                lng: {
                    gte: parseFloat(minLng as string),
                    lte: parseFloat(maxLng as string)
                }
            };
        } 
        // Fallback: If bounding coordinates are provided
        else if (lat && lng) {
            const centerLat = parseFloat(lat);
            const centerLng = parseFloat(lng);
            const r = radius ? parseFloat(radius) : 10; // Default 10km

            if (!isNaN(centerLat) && !isNaN(centerLng)) {
                const latDelta = r / 111; 
                const lngDelta = r / (111 * Math.cos(centerLat * (Math.PI / 180)));

                whereClause = {
                    ...whereClause,
                    lat: {
                        gte: centerLat - latDelta,
                        lte: centerLat + latDelta
                    },
                    lng: {
                        gte: centerLng - lngDelta,
                        lte: centerLng + lngDelta
                    }
                };
            }
        }

        // (We can't filter by `regionQuery` on encrypted DB column, so we just use bounding box in DB and filter post-fetch)

        const includeObj: any = { 
            media: true,
            reviews: { select: { overall: true } }
        };
        if (lang) {
            includeObj.translations = { where: { languageCode: String(lang) } };
        }

        const stores = await prisma.store.findMany({
            where: whereClause,
            include: includeObj,
            orderBy: [
                { isPremiumTop: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 300 // Increased from 100 to prevent shops from disappearing during map pan
        });

        // Omit some sensitive PII, but send address and phone and others
        const publicStores = stores.map((store: any) => {
            let shortDesc = store.shortDesc;
            let longDesc = store.longDesc;
            
            if (store.translations && store.translations.length > 0) {
                const tr = store.translations[0];
                if (tr.shortDesc) shortDesc = tr.shortDesc;
                if (tr.longDesc) longDesc = tr.longDesc;
            }

            const reviewCount = store.reviews?.length || 0;
            const averageRating = reviewCount > 0 
                ? store.reviews.reduce((acc: number, r: any) => acc + (r.overall || 5), 0) / reviewCount
                : 0;

            return {
                id: store.id,
                name: store.name,
                address: store.address ? decryptPII(store.address) : '',
                phone: store.phone ? decryptPII(store.phone) : null,
                shortDesc,
                longDesc,
                websiteUrl: store.websiteUrl,
                lat: store.lat,
                lng: store.lng,
                signatureBean: store.signatureBean,
                primaryCoffeeType: store.primaryCoffeeType,
                acidity: store.acidity,
                sweetness: store.sweetness,
                bitterness: store.bitterness,
                body: store.body,
                equipment: store.equipment,
                signatureMenu: store.signatureMenu,
                dessertPairing: store.dessertPairing,
                hasDecaf: store.hasDecaf,
                hasOatMilk: store.hasOatMilk,
                hasParking: store.hasParking,
                hasWifi: store.hasWifi,
                hasPetFriendly: store.hasPetFriendly,
                hasPowerOutlets: store.hasPowerOutlets,
                hours: store.hours,
                status: store.status,
                mainImageUrl: store.mainImageUrl,
                markerImageUrl: store.markerImageUrl,
                coffeeMenuImageUrl: store.coffeeMenuImageUrl,
                popularMenuImageUrl: store.popularMenuImageUrl,
                beanOrigin: store.beanOrigin,
                beanRoastLevel: store.beanRoastLevel,
                beanNotes: store.beanNotes,
                media: store.media,
                menuItems: (store as any).menuItems,
                isPremiumTop: store.isPremiumTop,
                reviewCount,
                averageRating,
                matchRate: (() => {
                    if (!userPrefs || store.acidity == null) return null;
                    // Euclidean distance for match rate
                    // Max distance = sqrt((5-1)^2 * 4) = sqrt(16 * 4) = sqrt(64) = 8
                    const dist = Math.sqrt(
                        Math.pow(userPrefs.prefAcidity! - store.acidity, 2) +
                        Math.pow(userPrefs.prefSweetness! - store.sweetness, 2) +
                        Math.pow(userPrefs.prefBitterness! - store.bitterness, 2) +
                        Math.pow(userPrefs.prefBody! - store.body, 2)
                    );
                    const matchPercent = Math.max(0, 100 - (dist / 8) * 100);
                    return Math.round(matchPercent);
                })()
            };
        });

        // Post-fetch filtering for regionQuery since DB is encrypted
        let filteredStores = publicStores;
        if (regionQuery) {
            const rString = String(regionQuery).trim();
            // Special rules to exclude Seoul when searching Gyeonggi-do
            if (rString === '경기도' || rString === '경기') {
                filteredStores = publicStores.filter((store: any) => {
                    const addr = store.address || '';
                    return addr.includes('경기') && !addr.includes('서울');
                });
            } else if (rString === '서울' || rString === '서울특별시') {
                filteredStores = publicStores.filter((store: any) => {
                    const addr = store.address || '';
                    return addr.includes('서울');
                });
            } else {
                // Generic fallback
                filteredStores = publicStores.filter((store: any) => {
                    return (store.address || '').includes(rString);
                });
            }
        }

        // Sort by primaryCoffeeType: SINGLE_ORIGIN -> SPECIALTY_ROASTERY -> BLENDED -> GENERAL
        const sortOrder: Record<string, number> = {
            'SINGLE_ORIGIN': 1,
            'SPECIALTY_ROASTERY': 2,
            'BLENDED': 3,
            'GENERAL': 4
        };

        filteredStores.sort((a, b) => {
            const orderA = sortOrder[a.primaryCoffeeType as string] || 5;
            const orderB = sortOrder[b.primaryCoffeeType as string] || 5;
            return orderA - orderB;
        });

        // Increment AI Recommend Count for returned stores (background process)
        if (filteredStores.length > 0) {
            const storeIds = filteredStores.map((s: any) => s.id);
            prisma.store.updateMany({
                where: { id: { in: storeIds } },
                data: { aiRecommendCount: { increment: 1 } }
            }).catch(e => console.error('Failed to increment aiRecommendCount', e));
        }

        res.status(200).json(filteredStores);
    } catch (error) {
        console.error("Fetch all shops error:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// GET: Fetch all shops for the logged-in owner
router.get('/my', authenticateToken, async (req: any, res: any) => {
    try {
        console.log("Fetching my shops for user:", req.user.id);
        const ownerId = req.user.id;
        const stores = await prisma.store.findMany({
            where: { ownerId },
            include: { 
                media: true,
                menuItems: { orderBy: { orderIndex: 'asc' } },
                _count: { select: { bookmarks: true } } 
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log("Found stores:", stores.length);

        // Decrypt PII before sending
        const safeStores = stores.map(store => {
            let safeAddress = store.address;
            let safePhone = store.phone;
            try {
                if (store.address) safeAddress = decryptPII(store.address);
            } catch (e) {
                console.error(`Address decryption failed for store ${store.id}`);
            }
            try {
                if (store.phone) safePhone = decryptPII(store.phone);
            } catch (e) {
                console.error(`Phone decryption failed for store ${store.id}`);
            }

            const premiumStats = store.storePlan === 'PREMIUM' ? {
                totalViews: store.viewCount || 0,
                totalBookmarks: (store as any)._count?.bookmarks || 0,
                searchAppearances: store.aiRecommendCount || 0,
                recentVisitors: store.recentVisitorCount || 0
            } : null;

            return {
                ...store,
                address: safeAddress,
                phone: safePhone,
                rejectionReason: store.rejectionReason,
                approvalRequestsCount: store.approvalRequestsCount,
                mainImageUrl: store.mainImageUrl,
                markerImageUrl: store.markerImageUrl,
                primaryCoffeeType: store.primaryCoffeeType,
                media: store.media,
                menuItems: (store as any).menuItems,
                storePlan: store.storePlan,
                planExpiresAt: store.planExpiresAt,
                premiumStats
            };
        });

        console.log("Successfully processed all stores");
        res.status(200).json(safeStores);
    } catch (error) {
        console.error("Fetch my shops error:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ----------------------------
// REVIEWS
// ----------------------------

// GET: Fetch reviews for a store
router.get('/:id/reviews', async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const skip = parseInt(req.query.skip) || 0;
        const safeLimit = limit > 50 ? 50 : limit;

        const reviews = await prisma.storeReview.findMany({
            where: { storeId: id },
            take: safeLimit,
            skip: skip,
            include: {
                user: {
                    select: {
                        nickname: true,
                        profileImageUrl: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(reviews);
    } catch (error) {
        console.error("Fetch reviews error:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// POST: Create a new review
router.post('/:id/reviews', authenticateToken, uploadLimiter, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { taste, atmosphere, interior, service, price, cleanliness, content, imageUrls } = req.body;

        const store = await prisma.store.findUnique({ where: { id } });
        if (!store) return res.status(404).json({ error: 'Store not found.' });

        // Calculate overall average
        const overall = (taste + atmosphere + interior + service + price + cleanliness) / 6.0;

        // --- BASE64 DECODING FOR REVIEW IMAGES ---
        let finalImageUrls: string[] = [];
        if (imageUrls && Array.isArray(imageUrls)) {
            finalImageUrls = imageUrls.map((url, idx) => {
                if (url && url.startsWith('data:image')) {
                    try {
                        const base64MimeType = url.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';
                        const extension = base64MimeType.split('/')[1] || 'jpg';
                        const base64Data = url.split(';base64,').pop();

                        if (base64Data) {
                            const fileName = `review_${Date.now()}_${idx}_Math.floor(Math.random() * 1000).${extension}`;
                            // Store in /uploads/users/{userId}/reviews/
                            const relativeDir = path.join('users', userId, 'reviews');
                            const uploadPath = path.join(process.cwd(), 'uploads', relativeDir);
                            
                            if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

                            fs.writeFileSync(path.join(uploadPath, fileName), base64Data, { encoding: 'base64' });
                            return `/uploads/${relativeDir.split(path.sep).join('/')}/${fileName}`;
                        }
                    } catch (err) {
                        console.error("Failed to decode store review image:", err);
                    }
                }
                return url; // Return as-is if it's already a URL
            }).filter(Boolean); // Clean any nulls
        }

        const newReview = await prisma.storeReview.create({
            data: {
                storeId: id,
                userId,
                taste,
                atmosphere,
                interior,
                service,
                price,
                cleanliness,
                overall,
                content,
                imageUrls: finalImageUrls.length > 0 ? JSON.stringify(finalImageUrls) : null
            },
            include: {
                user: {
                    select: {
                        nickname: true,
                        profileImageUrl: true
                    }
                }
            }
        });

        // Reward 50 beans to user for creating a review
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { pointBalance: { increment: 50 } }
            }),
            prisma.pointTransaction.create({
                data: {
                    userId,
                    amount: 50,
                    type: 'EARN',
                    description: '카페 리뷰 작성 보상'
                }
            })
        ]);

        res.status(201).json(newReview);
    } catch (error) {
        console.error("Create review error:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ----------------------------
// FOLLOWS
// ----------------------------

// GET: Check follow status
router.get('/:id/follow-status', authenticateToken, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const follow = await prisma.storeFollow.findUnique({
            where: {
                userId_storeId: { userId, storeId: id }
            }
        });
        res.status(200).json({ isFollowing: !!follow });
    } catch (error) {
        console.error("Check follow status error:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// POST: Toggle follow status
router.post('/:id/follow', authenticateToken, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const store = await prisma.store.findUnique({ where: { id } });
        if (!store) return res.status(404).json({ error: 'Store not found.' });

        const existingFollow = await prisma.storeFollow.findUnique({
            where: {
                userId_storeId: { userId, storeId: id }
            }
        });

        if (existingFollow) {
            // Unfollow
            await prisma.storeFollow.delete({
                where: { id: existingFollow.id }
            });
            return res.status(200).json({ isFollowing: false });
        } else {
            // Follow
            await prisma.storeFollow.create({
                data: { userId, storeId: id }
            });
            return res.status(201).json({ isFollowing: true });
        }
    } catch (error) {
        console.error("Toggle follow error:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// GET: Fetch shop details (with Decryption example)
// Note: Only authenticated users/admins should normally see decrypted PII.
router.get('/:id', optionalAuthenticate, async (req: any, res: any) => {
    try {
        const { lang } = req.query;
        const includeObj: any = { media: true, menuItems: { orderBy: { orderIndex: 'asc' } } };
        if (lang) {
            includeObj.translations = { where: { languageCode: String(lang) } };
        }

        const store = await prisma.store.findUnique({
            where: { id: req.params.id },
            include: includeObj
        });

        if (!store) {
            return res.status(404).json({ error: 'Store not found.' });
        }

        // On-the-fly decryption to send to authorized user
        const decryptedAddress = decryptPII(store.address);
        const decryptedPhone = store.phone ? decryptPII(store.phone) : null;

        let shortDesc = store.shortDesc;
        let longDesc = store.longDesc;
        
        const trs = (store as any).translations;
        if (trs && trs.length > 0) {
            const tr = trs[0];
            if (tr.shortDesc) shortDesc = tr.shortDesc;
            if (tr.longDesc) longDesc = tr.longDesc;
        }

        // Calculate Match Rate if user has preferences
        let matchRate = null;
        if (req.user && req.user.id) {
            const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
            if (dbUser && dbUser.prefAcidity != null && store.acidity != null) {
                const dist = Math.sqrt(
                    Math.pow(dbUser.prefAcidity! - store.acidity, 2) +
                    Math.pow(dbUser.prefSweetness! - store.sweetness, 2) +
                    Math.pow(dbUser.prefBitterness! - store.bitterness, 2) +
                    Math.pow(dbUser.prefBody! - store.body, 2)
                );
                matchRate = Math.round(Math.max(0, 100 - (dist / 8) * 100));
            }
        }

        const safeStoreResponse = {
            ...store,
            shortDesc,
            longDesc,
            address: decryptedAddress,
            menuItems: (store as any).menuItems,
            phone: decryptedPhone,
            matchRate
        };

        // Increment view and visitor counts (background process)
        const nowUTC = new Date();
        // Calculate the most recent Monday 00:00:00 in KST
        const kstTime = new Date(nowUTC.getTime() + 9 * 60 * 60 * 1000); // UTC+9
        const day = kstTime.getUTCDay(); // 0: Sun, 1: Mon...
        const diffToMonday = day === 0 ? 6 : day - 1;
        
        const lastMondayKST = new Date(kstTime);
        lastMondayKST.setUTCDate(kstTime.getUTCDate() - diffToMonday);
        lastMondayKST.setUTCHours(0, 0, 0, 0);
        
        // Convert back to UTC to compare with DB timestamp
        const lastMondayUTC = new Date(lastMondayKST.getTime() - 9 * 60 * 60 * 1000);

        const countsToUpdate: any = { viewCount: { increment: 1 } };
        
        // Weekly Reset Logic
        const lastReset = (store as any).lastWeeklyViewReset;
        if (!lastReset || new Date(lastReset) < lastMondayUTC) {
            // It's a new week, reset the counter
            countsToUpdate.recentVisitorCount = 1;
            countsToUpdate.lastWeeklyViewReset = nowUTC;
        } else {
            // Still in the same week, just increment
            countsToUpdate.recentVisitorCount = { increment: 1 };
        }

        prisma.store.update({
            where: { id: store.id },
            data: countsToUpdate
        }).catch(e => console.error('Failed to increment view/visitor count', e));

        res.status(200).json(safeStoreResponse);

    } catch (error) {
        console.error("Fetch shop error:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// PUT: Update an existing shop
router.put('/:id', authenticateToken, uploadLimiter, async (req: any, res: any) => {
    try {
        console.log(`[PUT /shops/:id] Starting update for shop ${req.params.id}`);
        const ownerId = req.user.id;
        const storeId = req.params.id;
        const {
            name, address, phone, hours, shortDesc, longDesc, signatureBean,
            acidity, sweetness, bitterness, body, equipment, signatureMenu,
            dessertPairing, hasDecaf, hasOatMilk, mediaUrls, websiteUrl,
            lat, lng, markerImageIndex, primaryCoffeeType,
            coffeeMenuImageUrl, popularMenuImageUrl, beanOrigin, beanRoastLevel, beanNotes,
            translations, menuItems,
            businessNumber, ownerName, settlementAccount,
            hasParking, hasWifi, hasPetFriendly, hasPowerOutlets
        } = req.body;

        console.log(`[PUT /shops/:id] Payload keys:`, Object.keys(req.body));
        console.log(`[PUT /shops/:id] mediaUrls count:`, mediaUrls?.length);

        // Verify the store belongs to this user
        console.log(`[PUT /shops/:id] Finding existing store...`);
        const existingStore = await prisma.store.findUnique({ where: { id: storeId } });
        if (!existingStore) {
            return res.status(404).json({ error: 'Store not found.' });
        }
        if (existingStore.ownerId !== ownerId) {
            return res.status(403).json({ error: 'Unauthorized to update this store.' });
        }

        const owner = await prisma.user.findUnique({ where: { id: ownerId } });
        const userProfileImageUrl = owner?.profileImageUrl || null;

        // Handle re-encryption of PII fields if provided
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (address !== undefined) updateData.address = encryptPII(address);
        if (phone !== undefined) updateData.phone = phone ? encryptPII(phone) : null;
        if (hours !== undefined) updateData.hours = hours;
        if (shortDesc !== undefined) updateData.shortDesc = shortDesc;
        if (longDesc !== undefined) updateData.longDesc = longDesc;
        if (signatureBean !== undefined) updateData.signatureBean = signatureBean;
        if (acidity !== undefined) updateData.acidity = Number(acidity);
        if (sweetness !== undefined) updateData.sweetness = Number(sweetness);
        if (bitterness !== undefined) updateData.bitterness = Number(bitterness);
        if (body !== undefined) updateData.body = Number(body);
        if (equipment !== undefined) updateData.equipment = equipment;
        if (signatureMenu !== undefined) updateData.signatureMenu = signatureMenu;
        if (dessertPairing !== undefined) updateData.dessertPairing = dessertPairing;
        if (hasDecaf !== undefined) updateData.hasDecaf = Boolean(hasDecaf);
        if (hasOatMilk !== undefined) updateData.hasOatMilk = Boolean(hasOatMilk);
        if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl || null;
        if (lat !== undefined) updateData.lat = lat ? Number(lat) : null;
        if (lng !== undefined) updateData.lng = lng ? Number(lng) : null;
        if (primaryCoffeeType) updateData.primaryCoffeeType = primaryCoffeeType;
        if (coffeeMenuImageUrl !== undefined) updateData.coffeeMenuImageUrl = coffeeMenuImageUrl;
        if (popularMenuImageUrl !== undefined) updateData.popularMenuImageUrl = popularMenuImageUrl;
        if (beanOrigin !== undefined) updateData.beanOrigin = beanOrigin;
        if (beanRoastLevel !== undefined) updateData.beanRoastLevel = beanRoastLevel;
        if (beanNotes !== undefined) updateData.beanNotes = beanNotes;
        if (businessNumber !== undefined) updateData.businessNumber = businessNumber;
        if (ownerName !== undefined) updateData.ownerName = ownerName;
        if (settlementAccount !== undefined) updateData.settlementAccount = settlementAccount;
        if (hasParking !== undefined) updateData.hasParking = Boolean(hasParking);
        if (hasWifi !== undefined) updateData.hasWifi = Boolean(hasWifi);
        if (hasPetFriendly !== undefined) updateData.hasPetFriendly = Boolean(hasPetFriendly);
        if (hasPowerOutlets !== undefined) updateData.hasPowerOutlets = Boolean(hasPowerOutlets);

        console.log(`[PUT /shops/:id] Updating store base properties...`);
        const updatedStore = await (prisma as any).store.update({
            where: { id: storeId },
            data: updateData
        });

        // Handle Translations
        if (translations && Array.isArray(translations)) {
            for (const t of translations) {
                if (t.languageCode) {
                    await (prisma as any).storeTranslation.upsert({
                        where: {
                            storeId_languageCode: {
                                storeId: storeId,
                                languageCode: t.languageCode
                            }
                        },
                        update: {
                            shortDesc: t.shortDesc,
                            longDesc: t.longDesc
                        },
                        create: {
                            storeId: storeId,
                            languageCode: t.languageCode,
                            shortDesc: t.shortDesc,
                            longDesc: t.longDesc
                        }
                    });
                }
            }
        }

        // Handle Media replacement if provided
        console.log(`[PUT /shops/:id] Handling Media replacement... mediaUrls present?`, !!mediaUrls);
        if (mediaUrls && Array.isArray(mediaUrls)) {
            // Remove existing media
            console.log(`[PUT /shops/:id] Deleting existing media records...`);
            await prisma.media.deleteMany({ where: { storeId } });

            // Process base64 files and keep existing URLs
            console.log(`[PUT /shops/:id] Processing new media base64 strings...`);
            const processedUrls = mediaUrls.map((url, idx) => {
                if (url.startsWith('data:')) {
                    const matches = url.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
                    console.log(`[PUT /shops/:id] Media idx ${idx} base64 match result length:`, matches ? matches.length : 'null');
                    if (matches && matches.length === 3) {
                        const type = matches[1];
                        console.log(`[PUT /shops/:id] Media idx ${idx} type:`, type);
                        const data = Buffer.from(matches[2], 'base64');
                        const ext = type.split('/')[1] || 'jpg';
                        // Add some randomness to filename to avoid collisions
                        const filename = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;

                        // Scalable Directory Partitioning: /uploads/users/{userId}/shops/{shopId}/
                        const relativeDir = path.join('users', ownerId, 'shops', storeId);
                        const uploadPath = path.join(process.cwd(), 'uploads', relativeDir);

                        if (!fs.existsSync(uploadPath)) {
                            fs.mkdirSync(uploadPath, { recursive: true });
                        }

                        fs.writeFileSync(path.join(uploadPath, filename), data);

                        // DB saves the relative public path
                        // Normalize path separators to forward slash for web URLs
                        return `/uploads/${relativeDir.split(path.sep).join('/')}/${filename}`;
                    }
                }
                return url; // Return existing URL if not base64
            });

            // Ensure no duplicate URLs are saved to the DB if frontend sends dupes
            const uniqueUrls = Array.from(new Set(processedUrls));

            // Insert new media list
            if (uniqueUrls.length > 0) {
                await prisma.media.createMany({
                    data: uniqueUrls.map((url: string) => ({
                        storeId,
                        url,
                        type: url.match(/\.(mp4|mov|webm)$/i) ? 'VIDEO' : 'IMAGE'
                    }))
                });

                const mainUrl = uniqueUrls[0] || existingStore.mainImageUrl;
                const markerUrl = userProfileImageUrl || uniqueUrls[0] || existingStore.markerImageUrl;

                await prisma.store.update({
                    where: { id: storeId },
                    data: {
                        mainImageUrl: mainUrl,
                        markerImageUrl: markerUrl
                    }
                });
            }
        }

        // Handle Detailed MenuItems replacement
        if (menuItems && Array.isArray(menuItems)) {
            await (prisma as any).menuItem.deleteMany({ where: { storeId } });
            
            const processedItems = menuItems.map((item: any, idx: number) => {
                let imageUrl = item.imageUrl || null;
                if (imageUrl && imageUrl.startsWith('data:')) {
                    const matches = imageUrl.match(/^data:([A-Za-z0-9-+\\/]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const type = matches[1];
                        const data = Buffer.from(matches[2], 'base64');
                        const ext = type.split('/')[1] || 'jpg';
                        const filename = `menu_${Date.now()}_${idx}.${ext}`;
                        const relativeDir = path.join('users', ownerId, 'shops', storeId, 'menu');
                        const uploadPath = path.join(process.cwd(), 'uploads', relativeDir);
                        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
                        fs.writeFileSync(path.join(uploadPath, filename), data);
                        imageUrl = `/uploads/${relativeDir.split(path.sep).join('/')}/${filename}`;
                    }
                }
                return {
                    storeId,
                    name: item.name,
                    price: item.price,
                    description: item.description || null,
                    imageUrl,
                    category: item.category || 'COFFEE',
                    orderIndex: idx
                };
            });
            if (processedItems.length > 0) {
                await (prisma as any).menuItem.createMany({ data: processedItems });
            }
        }

        res.status(200).json({
            message: 'Shop updated successfully.',
            storeId: updatedStore.id
        });

    } catch (error) {
        console.error("Update shop error:", error);
        res.status(500).json({ error: 'Internal server error while updating shop.' });
    }
});

// PUT: Resubmit a rejected shop
router.put('/:id/resubmit', authenticateToken, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const ownerId = req.user.id;

        const store = await prisma.store.findUnique({
            where: { id }
        });

        if (!store) {
            return res.status(404).json({ error: 'Store not found.' });
        }

        if (store.ownerId !== ownerId) {
            return res.status(403).json({ error: 'Not authorized to resubmit this store.' });
        }

        if (store.status !== 'REJECTED') {
            return res.status(400).json({ error: 'Only rejected stores can be resubmitted.' });
        }

        if (store.approvalRequestsCount >= 3) {
            return res.status(400).json({ error: 'Maximum approval requests (3/3) reached. Cannot resubmit.' });
        }

        const updatedStore = await prisma.store.update({
            where: { id },
            data: {
                status: 'PENDING',
                rejectionReason: null,
                approvalRequestsCount: {
                    increment: 1
                }
            }
        });

        res.status(200).json({ message: 'Shop successfully resubmitted for approval.', store: updatedStore });
    } catch (error) {
        console.error("Resubmit store error:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// POST: Handle AI Regional Data Harvester imports
router.post('/ai-import', authenticateToken, async (req: any, res: any) => {
    try {
        // Ensure user is ADMIN or MODERATOR (compatible with both legacy role and Spring Boot auth claim)
        const userRole = req.user.role || (req.user.auth ? req.user.auth.replace('ROLE_', '') : null);
        if (userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
            return res.status(403).json({ error: 'Require Admin privilege' });
        }
        
        const { shops } = req.body;
        if (!shops || !Array.isArray(shops)) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        let importedCount = 0;
        let updatedCount = 0;

        for (const shop of shops) {
            if (!shop.name || shop.lat === undefined || shop.lng === undefined) continue;

            const existingStore = await prisma.store.findFirst({
                where: {
                    name: shop.name
                }
            });

            if (existingStore) {
                // Update coordinates & URI if needed
                await prisma.store.update({
                    where: { id: existingStore.id },
                    data: {
                         lat: shop.lat,
                         lng: shop.lng,
                         websiteUrl: shop.uri || existingStore.websiteUrl
                    }
                });
                updatedCount++;
            } else {
                // Create new Store with AI generated defaults
                const encryptAddr = encryptPII(`위도 ${shop.lat}, 경도 ${shop.lng}`);
                
                await (prisma as any).store.create({
                    data: {
                        ownerId: req.user.id,
                        name: shop.name,
                        address: encryptAddr,
                        hours: "영업시간 미정 (AI 탐색)",
                        shortDesc: "AI가 발굴한 카페/명소입니다.",
                        longDesc: "AI 자동 탐색을 통해 찾아낸 매장입니다. 향후 상세 정보가 업데이트될 예정입니다.",
                        signatureBean: "스페셜티/시그니처 향미",
                        primaryCoffeeType: "GENERAL",
                        acidity: 0,
                        sweetness: 0,
                        bitterness: 0,
                        body: 0,
                        equipment: "기본 시설",
                        signatureMenu: "대표 메뉴 (상세 미정)",
                        dessertPairing: "추천 정보 없음",
                        websiteUrl: shop.uri || null,
                        lat: shop.lat,
                        lng: shop.lng,
                        status: "APPROVED" // Make it public immediately
                    }
                });
                importedCount++;
            }
        }
        
        res.status(200).json({ importedCount, updatedCount });
    } catch (error) {
        console.error("AI Import error:", error);
        res.status(500).json({ error: 'Internal server error during AI import.' });
    }
});

// DELETE: Delete a shop
router.delete('/:id', authenticateToken, async (req: any, res: any) => {
    try {
        const ownerId = req.user.id;
        const storeId = req.params.id;

        const store = await prisma.store.findUnique({ where: { id: storeId } });
        if (!store) return res.status(404).json({ error: 'Store not found.' });
        if (store.ownerId !== ownerId) return res.status(403).json({ error: 'Not authorized to delete this store.' });

        await prisma.store.delete({ where: { id: storeId } });
        
        res.status(200).json({ message: 'Store deleted successfully.' });
    } catch (error) {
        console.error("Delete shop error:", error);
        res.status(500).json({ error: 'Internal server error during deletion.' });
    }
});

export default router;
