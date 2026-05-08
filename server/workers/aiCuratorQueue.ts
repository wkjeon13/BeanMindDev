import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';

import prisma from '../utils/prisma.js';
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Robust Redis connection logic for fail-safes during development or production without taking entire NodeJS down
const redisConnection = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null, // Required by BullMQ
    retryStrategy: (times) => {
        return Math.min(times * 100, 3000); // Reconnect backoff
    }
});

redisConnection.on('error', (err) => {
    console.error('[AI Queue] Redis Connection Error. Queue may not function until Redis is available:', err.message);
});

// Exports the queue so routes can add jobs to it
export const curationQueue = new Queue('ai-curation', { 
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,         // Try 3 times on failure before completely failing
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,   // Keep last 1000 completed jobs in redis
        removeOnFail: 5000        // Keep last 5000 failed jobs
    }
});

// Create background worker process
export const curationWorker = new Worker('ai-curation', async (job: Job) => {
    console.log(`[AI Queue] Processing Job ${job.id}`);
    
    const { 
        targetLanguage, 
        countryName, 
        userAgeGroup, 
        userGender, 
        userFavCafe, 
        weatherInfo, 
        prefs, 
        bestBean, 
        bestBrand 
    } = job.data;

    await job.updateProgress(10); // Initiation phase

    try {
        const prompt = `Explain why this coffee is perfect for the user given their current context. 
        Please provide a highly detailed, emotionally resonant, and professional response.
        CRITICAL INSTRUCTION: You MUST write the ENTIRE response strictly in ${targetLanguage.toUpperCase()}. Do not use any other language!
        
        You MUST write exactly in this format structure with these EXACT headers:

        [1~2 sentence poetic introduction mentioning the user's weather/time/condition]

        ### 🌸 [Creative Title], ${targetLanguage === 'English' ? 'Why it is the perfect choice for you' : '당신을 위한 완벽한 선택인 이유'}

        **1. [Catchy Point 1]**
        [Why flavor profile or acidity matches condition]

        **2. [Catchy Point 2]**
        [Why roast level or body matches condition]

        ---
        
        ### 🥐 ${targetLanguage === 'English' ? 'Recommended Dessert Pairing' : '추천 디저트 페어링'}
        [Suggest a specific bakery item like bread, cake, cookie, or chocolate that pairs perfectly with this bean, explaining WHY it matches the flavor profile. Make it sound delicious!]
        [CRITICAL INSTRUCTION: You MUST wrap the specific dessert name in bold markdown (**Dessert Name**) so it can be highlighted in the UI.]

        ### 🎵 ${targetLanguage === 'English' ? 'Recommended Music Playlist' : '추천 음악 플레이리스트'}
        [Suggest at least one domestic song (from ${countryName}) and at least one international/foreign song. If the user selected a specific music genre ("${prefs?.music || prefs?.musicGenre}"), you MUST prioritize that genre. If it is "Any", choose whatever fits best. The songs must fit the ${prefs?.timeOfDay}, ${prefs?.weather}, and the mood of drinking this coffee. Add a short reason why for each.]
        [CRITICAL INSTRUCTION: Combine the user's demographic (${userAgeGroup}, ${userGender}), weather (${prefs?.weather}), time (${prefs?.timeOfDay}), and mood (${prefs?.condition}) to explore a massive pool of music.]
        [CRITICAL INSTRUCTION: Use the random seed (${Date.now() + Math.random() * 10000}) to ensure diverse selections and avoid reusing the same cliché tracks every time, BUT YOU MUST STILL ENSURE that the song's vibe, lyrics, and rhythm perfectly match the recommended coffee's flavor, the current weather (${prefs?.weather}), and the user's mood (${prefs?.condition}). The song MUST feel like a natural pairing to this specific coffee tasting experience.]
        [CRITICAL INSTRUCTION: If you mention a specific song title, you MUST wrap ONLY the song title itself in a Markdown hyperlink pointing to YouTube Music. DO NOT create a separate button at the end. Format the text naturally like this: "...Artist의 [Song Title](https://music.youtube.com/search?q=Artist+Song+Title)는 분위기와..."]
        [CRITICAL INSTRUCTION: DO NOT use cliché or overly common song recommendations (e.g. IU's Through the Night / 아이유 밤편지). Dig deeper to recommend unique indie, lesser-known, or highly specific tracks that exactly match the mood.]

        Context: ${prefs?.season} season, ${prefs?.timeOfDay} time, feeling ${prefs?.condition}.
        User Demographics: Age Group: ${userAgeGroup}, Gender: ${userGender}, Favorite Cafe: ${userFavCafe}.
        User Health Status/Concerns: ${prefs?.healthStatus}
        Current Weather (Detected): ${weatherInfo}
        User Selected Weather: ${prefs?.weather}
        User Preferences: ${JSON.stringify(prefs)}
        Recommended Bean: ${JSON.stringify(bestBean)}
        Recommended Brand: ${JSON.stringify(bestBrand)}
        Food Pairings: ${JSON.stringify(bestBean?.foodPairing)}`;

        await job.updateProgress(40); // AI Gen starting

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("AI generation timed out after 30 seconds")), 30000);
        });

        const response: any = await Promise.race([
            genai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: prompt,
                config: {
                    temperature: 0.95,
                    topP: 0.95,
                }
            }),
            timeoutPromise
        ]);

        await job.updateProgress(90); // AI Gen success

        const outputText = response.text || "";

        return {
            success: true,
            text: outputText,
            timestamp: Date.now()
        };
    } catch (error: any) {
        console.error(`[AI Queue] Generation failed for job ${job.id}:`, error);
        throw new Error(error.message || "Failed to generate AI response");
    }
}, { connection: redisConnection });

curationWorker.on('completed', (job) => {
    console.log(`[AI Queue] Job ${job.id} has completed successfully.`);
});

curationWorker.on('failed', (job, err) => {
    console.log(`[AI Queue] Job ${job?.id} has failed with error: ${err.message}`);
});
