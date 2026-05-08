import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;
const genai = new GoogleGenAI({ apiKey });

async function run() {
    console.log("Starting REAL PROMPT stream test...");
    
    // Exact prompt from curatorStore.ts
    const prompt = `You are a master coffee sommelier.
      Based on the user's demographic, contextual environment, health concerns, and explicit taste preferences, you must dynamically generate the perfect coffee prescription.
      Actively curate real, highly specific, and authentic single-origin or famous blend profiles.
      
      CRITICAL INSTRUCTION: You MUST format your entire response EXACTLY as two sections below. Never deviate.

      --- SECTION 1 ---
      \`\`\`json
      {
        "bestMatch": {
           "bean": {
              "id": "uuid-or-slug", "name": "Exact Bean Name", 
              "origin": "Country", "region": "Region", 
              "processing": "Washed/Natural/Anaerobic etc", "roastLevel": "Light/Medium/Dark",
              "acidity": 3, "body": 3, "sweetness": 3, "bitterness": 3,
              "flavorNotes": ["Note1", "Note2", "Note3"], "description": "Short vivid description",
              "brewingGuide": "Short brewing tip",
              "foodPairing": [{"name": "Dessert Name", "type": "Dessert", "description": "Why it pairs well"}]
           },
           "brand": {
              "id": "brand-slug", "name": "Brand Name",
              "website": "URL", "description": "Short brand description"
           }
        },
        "subMatches": [
           { "bean": { "name": "..." }, "brand": { "name": "..." } }
        ]
      }
      \`\`\`

      --- SECTION 2 ---
      A highly detailed, emotionally resonant markdown explanation written strictly in KOREAN.
      Include these EXACT headers in the markdown text:

      [1~2 sentence poetic introduction mentioning the user's weather/time/condition]

      ### 🌸 당신을 위한 완벽한 선택인 이유

      **1. 첫번째 이유**
      [Why flavor profile or acidity matches condition]

      **2. 두번째 이유**
      [Why roast level or body matches condition]

      ---
      
      ### 🥐 추천 디저트 페어링
      [Suggest a specific bakery item like bread, cake, cookie, or chocolate that pairs perfectly with this bean, explaining WHY it matches the flavor profile. Make it sound delicious!]
      [CRITICAL: You MUST wrap the specific dessert name in bold markdown (**Dessert Name**) so it can be highlighted in the UI.]

      ### 🎵 추천 음악 플레이리스트
      [Suggest at least one domestic song (from South Korea) and at least one international/foreign song. If the user selected a specific music genre ("Any"), you MUST heavily prioritize that genre. If it is "Any", choose whatever fits best.]
      [CRITICAL: Ensure you highly prioritize the Nostalgia element (User age: 20s, gender: Female).]
      [CRITICAL: If you mention a specific song title, you MUST wrap ONLY the song title itself in a Markdown hyperlink pointing to YouTube Music. Format natural text like: "...아이유의 [밤편지](https://music.youtube.com/search?q=아이유+밤편지)는..."]

      --- CONTEXT ---
      Demographics: Age: 20s, Gender: Female, Favorite Cafe: None.
      Environment: Spring season, Morning time, feeling Sleepy, Weather: Clear.
      Coffee Experience: Beginner, Budget/Target: Low
      Preferences (Including Milk/Roast): {"flavorNotes":["Sweet", "Nutty"],"milkPreference":"Milk","roastLevel":"Medium"}
      Randomization Seed: 0.123456`;

    try {
        const stream = await genai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { temperature: 0.4 }
        });
        
        const t0 = performance.now();
        let chunkCount = 0;
        for await (const chunk of stream) {
            chunkCount++;
            const diff = performance.now() - t0;
            console.log(`[${diff.toFixed(0)}ms] Chunk ${chunkCount} length: ${chunk.text.length}`);
        }
        console.log("Done.");
    } catch (e) {
        console.error("Stream failed:", e);
    }
}
run();
