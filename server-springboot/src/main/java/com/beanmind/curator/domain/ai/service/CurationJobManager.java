package com.beanmind.curator.domain.ai.service;

import com.beanmind.curator.common.service.GeminiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.Setter;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CurationJobManager {

    private final ConcurrentHashMap<String, CurationJob> jobs = new ConcurrentHashMap<>();
    private final GeminiService geminiService;

    public CurationJobManager(GeminiService geminiService) {
        this.webClientGeminiService = geminiService; // Mapping directly
        this.geminiService = geminiService;
    }

    private final GeminiService webClientGeminiService;

    public String createJob() {
        String jobId = UUID.randomUUID().toString();
        CurationJob job = new CurationJob();
        job.setId(jobId);
        job.setStatus("pending");
        job.setProgress(0);
        jobs.put(jobId, job);
        return jobId;
    }

    public CurationJob getJob(String jobId) {
        return jobs.get(jobId);
    }

    @Async
    public void runCurationJob(String jobId, Map<String, Object> payload) {
        CurationJob job = jobs.get(jobId);
        if (job == null) return;

        try {
            job.setStatus("active");
            job.setProgress(10); // Initiation phase

            String targetLanguage = (String) payload.getOrDefault("targetLanguage", "Korean");
            String countryName = (String) payload.getOrDefault("countryName", "South Korea");
            String userAgeGroup = (String) payload.getOrDefault("userAgeGroup", "Unknown");
            String userGender = (String) payload.getOrDefault("userGender", "Unknown");
            String userFavCafe = (String) payload.getOrDefault("userFavCafe", "Unknown");
            String weatherInfo = (String) payload.getOrDefault("weatherInfo", "");
            Map<String, Object> prefs = (Map<String, Object>) payload.getOrDefault("prefs", new HashMap<>());
            Map<String, Object> bestBean = (Map<String, Object>) payload.getOrDefault("bestBean", new HashMap<>());
            Map<String, Object> bestBrand = (Map<String, Object>) payload.getOrDefault("bestBrand", new HashMap<>());

            job.setProgress(20);

            // Construct prompt exactly like Node.js
            ObjectMapper mapper = new ObjectMapper();
            String prefsJson = mapper.writeValueAsString(prefs);
            String bestBeanJson = mapper.writeValueAsString(bestBean);
            String bestBrandJson = mapper.writeValueAsString(bestBrand);
            String foodPairingJson = mapper.writeValueAsString(bestBean.getOrDefault("foodPairing", "[]"));

            String prompt = String.format(
                "Explain why this coffee is perfect for the user given their current context. \n" +
                "Please provide a highly detailed, emotionally resonant, and professional response.\n" +
                "CRITICAL INSTRUCTION: You MUST write the ENTIRE response strictly in %s. Do not use any other language!\n\n" +
                "You MUST write exactly in this format structure with these EXACT headers:\n\n" +
                "[1~2 sentence poetic introduction mentioning the user's weather/time/condition]\n\n" +
                "### 🌸 [Creative Title], %s\n\n" +
                "**1. [Catchy Point 1]**\n" +
                "[Why flavor profile or acidity matches condition]\n\n" +
                "**2. [Catchy Point 2]**\n" +
                "[Why roast level or body matches condition]\n\n" +
                "---\n\n" +
                "### 🥐 %s\n" +
                "[Suggest a specific bakery item like bread, cake, cookie, or chocolate that pairs perfectly with this bean, explaining WHY it matches the flavor profile. Make it sound delicious!]\n" +
                "[CRITICAL INSTRUCTION: You MUST wrap the specific dessert name in bold markdown (**Dessert Name**) so it can be highlighted in the UI.]\n\n" +
                "### 🎵 %s\n" +
                "[Suggest at least one domestic song (from %s) and at least one international/foreign song. If the user selected a specific music genre (\"%s\"), you MUST prioritize that genre. If it is \"Any\", choose whatever fits best. The songs must fit the %s, %s, and the mood of drinking this coffee. Add a short reason why for each.]\n" +
                "[CRITICAL INSTRUCTION: Combine the user's demographic (%s, %s), weather (%s), time (%s), and mood (%s) to explore a massive pool of music.]\n" +
                "[CRITICAL INSTRUCTION: Use the random seed (%d) to ensure diverse selections and avoid reusing the same cliché tracks every time, BUT YOU MUST STILL ENSURE that the song's vibe, lyrics, and rhythm perfectly match the recommended coffee's flavor, the current weather (%s), and the user's mood (%s). The song MUST feel like a natural pairing to this specific coffee tasting experience.]\n" +
                "[CRITICAL INSTRUCTION: If you mention a specific song title, you MUST wrap ONLY the song title itself in a Markdown hyperlink pointing to YouTube Music. DO NOT create a separate button at the end. Format the text naturally like this: \"...Artist의 [Song Title](https://music.youtube.com/search?q=Artist+Song+Title)는 분위기와...\"]\n" +
                "[CRITICAL INSTRUCTION: DO NOT use cliché or overly common song recommendations (e.g. IU's Through the Night / 아이유 밤편지). Dig deeper to recommend unique indie, lesser-known, or highly specific tracks that exactly match the mood.]\n\n" +
                "Context: %s season, %s time, feeling %s.\n" +
                "User Demographics: Age Group: %s, Gender: %s, Favorite Cafe: %s.\n" +
                "User Health Status/Concerns: %s\n" +
                "Current Weather (Detected): %s\n" +
                "User Selected Weather: %s\n" +
                "User Preferences: %s\n" +
                "Recommended Bean: %s\n" +
                "Recommended Brand: %s\n" +
                "Food Pairings: %s",
                targetLanguage.toUpperCase(),
                targetLanguage.equalsIgnoreCase("English") ? "Why it is the perfect choice for you" : "당신을 위한 완벽한 선택인 이유",
                targetLanguage.equalsIgnoreCase("English") ? "Recommended Dessert Pairing" : "추천 디저트 페어링",
                targetLanguage.equalsIgnoreCase("English") ? "Recommended Music Playlist" : "추천 음악 플레이리스트",
                countryName,
                prefs.getOrDefault("music", prefs.getOrDefault("musicGenre", "Any")),
                prefs.getOrDefault("timeOfDay", "Any"),
                prefs.getOrDefault("weather", "Any"),
                userAgeGroup,
                userGender,
                prefs.getOrDefault("weather", "Any"),
                prefs.getOrDefault("timeOfDay", "Any"),
                prefs.getOrDefault("condition", "Any"),
                (long) (System.currentTimeMillis() + Math.random() * 10000),
                prefs.getOrDefault("weather", "Any"),
                prefs.getOrDefault("condition", "Any"),
                prefs.getOrDefault("season", "Any"),
                prefs.getOrDefault("timeOfDay", "Any"),
                prefs.getOrDefault("condition", "Any"),
                userAgeGroup,
                userGender,
                userFavCafe,
                prefs.getOrDefault("healthStatus", "None"),
                weatherInfo,
                prefs.getOrDefault("weather", "Any"),
                prefsJson,
                bestBeanJson,
                bestBrandJson,
                foodPairingJson
            );

            job.setProgress(40); // AI Gen starting

            // Call Gemini API (1.5-flash since original worker used 1.5-flash)
            geminiService.generateContent("gemini-1.5-flash", prompt, 0.95)
                    .doOnSuccess(text -> {
                        job.setProgress(100);
                        job.setStatus("completed");
                        
                        Map<String, Object> result = new HashMap<>();
                        result.put("success", true);
                        result.put("text", text);
                        result.put("timestamp", System.currentTimeMillis());
                        
                        job.setResult(result);
                    })
                    .doOnError(err -> {
                        job.setStatus("failed");
                        job.setError(err.getMessage());
                    })
                    .subscribe();

        } catch (Exception e) {
            job.setStatus("failed");
            job.setError(e.getMessage());
        }
    }

    @Getter
    @Setter
    public static class CurationJob {
        private String id;
        private String status; // pending, active, completed, failed
        private int progress;
        private Map<String, Object> result;
        private String error;
    }
}
