import { GoogleGenAI } from '@google/genai';
async function test() {
    const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
    const promptStr = 'List up to 30 specialty coffee shops in 판교. Maximize the number of results up to 30.';
    console.log('Sending query...');
    const mapsResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptStr + '\nRespond ONLY with a valid JSON array. Format: [{\
name\: \Shop\, \lat\: 37.5, \lng\: 126.9}]',
        config: { 
            tools: [{ googleMaps: {} }],
            maxOutputTokens: 8192,
            temperature: 0.1
        },
    });
    console.log(mapsResponse.text);
}
test();
