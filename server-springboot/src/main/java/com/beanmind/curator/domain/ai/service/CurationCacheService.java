package com.beanmind.curator.domain.ai.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CurationCacheService {

    private final StringRedisTemplate redisTemplate;

    // In-Memory Fallback Cache if Redis Connection is unavailable
    private final Map<String, LocalCacheEntry> memoryCache = new ConcurrentHashMap<>();

    private static class LocalCacheEntry {
        final String data;
        final long expireAt;

        LocalCacheEntry(String data, long ttlSeconds) {
            this.data = data;
            this.expireAt = System.currentTimeMillis() + (ttlSeconds * 1000);
        }

        boolean isExpired() {
            return System.currentTimeMillis() > expireAt;
        }
    }

    /**
     * Generate Precise HASH Key for User Curation Context including all preferences and user identifier
     */
    public String generateCurationKey(Map<String, Object> prefs, String userAgeGroup, String userGender, String language, String userId) {
        if (prefs == null) prefs = Map.of();

        Object flavorNotesObj = prefs.get("flavorNotes");
        String flavorNotesStr = flavorNotesObj != null ? flavorNotesObj.toString() : "";

        String raw = String.format("%s_%s_%s_%s_%s_%s_%s_%s_%s_%s_%s_%s_%s_%s_%s_%s_%s_%s",
                language != null ? language : "ko",
                userId != null ? userId : "anon",
                prefs.getOrDefault("base", "Drip"),
                prefs.getOrDefault("caffeine", "Regular"),
                prefs.getOrDefault("equipment", "Hand Drip"),
                flavorNotesStr,
                prefs.getOrDefault("tasteAcidity", "3"),
                prefs.getOrDefault("tasteSweetness", "3"),
                prefs.getOrDefault("tasteBitterness", "3"),
                prefs.getOrDefault("tasteBody", "3"),
                prefs.getOrDefault("roastLevel", "Medium"),
                prefs.getOrDefault("season", "Spring"),
                prefs.getOrDefault("timeOfDay", "Day"),
                prefs.getOrDefault("condition", "Normal"),
                prefs.getOrDefault("weather", "Sunny"),
                prefs.getOrDefault("musicGenre", "Any"),
                userAgeGroup != null ? userAgeGroup : "Anon",
                userGender != null ? userGender : "Anon"
        );

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return "curation_essay:" + hexString.toString().substring(0, 16);
        } catch (Exception e) {
            return "curation_essay:" + Math.abs(raw.hashCode());
        }
    }

    /**
     * Overloaded method for backward compatibility
     */
    public String generateCurationKey(Map<String, Object> prefs, String userAgeGroup, String userGender, String language) {
        return generateCurationKey(prefs, userAgeGroup, userGender, language, "anon");
    }

    /**
     * Get Curation Essay from Redis or Memory Cache
     */
    public Optional<String> getCurationEssayCache(String cacheKey) {
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                log.info("⚡ [Redis Cache HIT] Curation Essay Key: {}", cacheKey);
                return Optional.of(cached);
            }
        } catch (Exception e) {
            log.warn("⚠️ Redis fetch failed, trying memory cache fallback: {}", e.getMessage());
            LocalCacheEntry entry = memoryCache.get(cacheKey);
            if (entry != null && !entry.isExpired()) {
                log.info("⚡ [Memory Cache HIT] Curation Essay Key: {}", cacheKey);
                return Optional.of(entry.data);
            }
        }
        return Optional.empty();
    }

    /**
     * Save Curation Essay to Redis & Memory Cache (Default TTL: 24 Hours)
     */
    public void putCurationEssayCache(String cacheKey, String essay, long ttlHours) {
        long ttlSeconds = ttlHours * 3600;
        try {
            redisTemplate.opsForValue().set(cacheKey, essay, Duration.ofSeconds(ttlSeconds));
            log.info("💾 [Redis Cache SAVE] Key: {}, TTL: {}h", cacheKey, ttlHours);
        } catch (Exception e) {
            log.warn("⚠️ Redis save failed, storing in memory fallback: {}", e.getMessage());
            memoryCache.put(cacheKey, new LocalCacheEntry(essay, ttlSeconds));
        }
    }

    /**
     * Get Weather Cache
     */
    public Optional<String> getWeatherCache(String geoGridKey) {
        String key = "weather_grid:" + geoGridKey;
        try {
            String cached = redisTemplate.opsForValue().get(key);
            if (cached != null) {
                log.info("⚡ [Redis Weather Cache HIT] Key: {}", key);
                return Optional.of(cached);
            }
        } catch (Exception e) {
            LocalCacheEntry entry = memoryCache.get(key);
            if (entry != null && !entry.isExpired()) {
                return Optional.of(entry.data);
            }
        }
        return Optional.empty();
    }

    /**
     * Save Weather Cache (Default TTL: 30 Minutes)
     */
    public void putWeatherCache(String geoGridKey, String weatherData, long ttlMinutes) {
        String key = "weather_grid:" + geoGridKey;
        long ttlSeconds = ttlMinutes * 60;
        try {
            redisTemplate.opsForValue().set(key, weatherData, Duration.ofSeconds(ttlSeconds));
        } catch (Exception e) {
            memoryCache.put(key, new LocalCacheEntry(weatherData, ttlSeconds));
        }
    }
}
