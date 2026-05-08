import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY || "AIzaSy..."; // fallback if dot env misses

const genai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function run() {
    console.log("Starting stream test...");
    try {
        const stream = await genai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: "Write a 200 word story about coffee streaming slowly.",
            config: { temperature: 0.4 }
        });
        
        const t0 = performance.now();
        let chunkCount = 0;
        for await (const chunk of stream) {
            chunkCount++;
            const diff = performance.now() - t0;
            console.log(`[${diff.toFixed(0)}ms] Chunk ${chunkCount}: ${chunk.text.length} chars`);
        }
        console.log("Stream native chunking works!");
    } catch (e) {
        console.error("Stream failed:", e);
    }
}
run();
