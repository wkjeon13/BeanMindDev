package com.beanmind.curator.domain.ai.service;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.common.service.GeminiService;
import com.beanmind.curator.domain.store.entity.Collection;
import com.beanmind.curator.domain.store.entity.CollectionItem;
import com.beanmind.curator.domain.store.entity.Store;
import com.beanmind.curator.domain.store.entity.CoffeeType;
import com.beanmind.curator.domain.store.repository.CollectionItemRepository;
import com.beanmind.curator.domain.store.repository.CollectionRepository;
import com.beanmind.curator.domain.store.repository.StoreRepository;
import com.beanmind.curator.domain.user.entity.TastingNote;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.TastingNoteRepository;
import com.beanmind.curator.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiService {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final TastingNoteRepository tastingNoteRepository;
    private final CollectionRepository collectionRepository;
    private final CollectionItemRepository collectionItemRepository;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    @Value("${kakao.api.key:}")
    private String kakaoApiKey;

    @Value("${google.places.api.key:}")
    private String googleApiKey;

    /**
     * Summarize Store Reviews
     */
    @Transactional
    public Mono<String> summarizeReviews(String storeId, String lang) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));

        if (store.getReviews() == null || store.getReviews().size() < 3) {
            return Mono.error(new CustomException(ErrorCode.BAD_REQUEST));
        }

        String reviewTexts = store.getReviews().stream()
                .map(r -> "Review: " + r.getContent())
                .collect(Collectors.joining("\n\n"));

        boolean isEnglish = "en".equalsIgnoreCase(lang);
        String prompt = isEnglish ? String.format(
            "You are an expert Cafe Review Summarizer.\n" +
            "Below are several user reviews for a coffee shop named \"%s\".\n" +
            "Please read them and provide a concise, engaging 3-sentence summary highlighting the main points (e.g., taste, atmosphere, standout features, or common complaints).\n" +
            "Please respond in English. Use friendly and natural tone, starting with \"Most visitors say...\".\n\n" +
            "Reviews:\n%s", store.getName(), reviewTexts
        ) : String.format(
            "You are an expert Cafe Review Summarizer.\n" +
            "Below are several user reviews for a coffee shop named \"%s\".\n" +
            "Please read them and provide a concise, engaging 3-sentence summary highlighting the main points (e.g., taste, atmosphere, standout features, or common complaints).\n" +
            "Please respond in Korean. Use friendly and natural tone, starting with \"방문객들은 주로...\".\n\n" +
            "Reviews:\n%s", store.getName(), reviewTexts
        );

        return geminiService.generateContent("gemini-2.5-flash", prompt, 0.7)
                .map(summary -> {
                    store.setAiReviewSummary(summary);
                    storeRepository.save(store);
                    return summary;
                });
    }

    /**
     * Map Shops Recommend
     */
    public Mono<Map<String, Object>> mapShops(Double lat, Double lng, String language, String promptStr) {
        boolean isKorea = (lat != null && lng != null && lat >= 33.0 && lat <= 38.5 && lng >= 124.5 && lng <= 132.0);

        if (isKorea && kakaoApiKey != null && !kakaoApiKey.trim().isEmpty()) {
            return searchKakaoShops(lat, lng);
        } else {
            return searchGooglePlaces(lat, lng, language);
        }
    }

    private Mono<Map<String, Object>> searchKakaoShops(Double lat, Double lng) {
        WebClient webClient = WebClient.builder()
                .baseUrl("https://dapi.kakao.com")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "KakaoAK " + kakaoApiKey.trim())
                .build();

        List<Mono<String>> pages = Arrays.asList(
                fetchKakaoPage(webClient, lat, lng, 1),
                fetchKakaoPage(webClient, lat, lng, 2),
                fetchKakaoPage(webClient, lat, lng, 3)
        );

        return Mono.zip(pages, results -> {
            List<Map<String, Object>> shops = new ArrayList<>();
            Set<String> uniqueIds = new HashSet<>();

            for (Object res : results) {
                try {
                    JsonNode root = objectMapper.readTree((String) res);
                    JsonNode documents = root.path("documents");
                    if (documents.isArray()) {
                        for (JsonNode doc : documents) {
                            String id = "kakao-" + doc.path("id").asText();
                            if (uniqueIds.add(id)) {
                                Map<String, Object> shop = new HashMap<>();
                                shop.put("id", id);
                                shop.put("name", doc.path("place_name").asText());
                                shop.put("lat", doc.path("y").asDouble());
                                shop.put("lng", doc.path("x").asDouble());
                                shop.put("address", doc.path("road_address_name").asText(doc.path("address_name").asText()));
                                shop.put("aiSummary", doc.path("category_name").asText());
                                shop.put("isGeneric", true);
                                shops.add(shop);
                            }
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Kakao Parse Error: " + e.getMessage());
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("shops", shops);
            response.put("chunks", new ArrayList<>());
            return response;
        });
    }

    private Mono<String> fetchKakaoPage(WebClient webClient, Double lat, Double lng, int page) {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v2/local/search/keyword.json")
                        .queryParam("query", "카페")
                        .queryParam("y", lat)
                        .queryParam("x", lng)
                        .queryParam("radius", 5000)
                        .queryParam("size", 15)
                        .queryParam("page", page)
                        .queryParam("sort", "accuracy")
                        .build())
                .retrieve()
                .bodyToMono(String.class)
                .onErrorReturn("{}");
    }

    private Mono<Map<String, Object>> searchGooglePlaces(Double lat, Double lng, String language) {
        if (lat == null || lng == null) {
            return Mono.error(new CustomException(ErrorCode.BAD_REQUEST));
        }

        WebClient webClient = WebClient.builder()
                .baseUrl("https://places.googleapis.com")
                .defaultHeader("X-Goog-Api-Key", googleApiKey)
                .defaultHeader("X-Goog-FieldMask", "places.displayName,places.location,places.formattedAddress,places.id,places.editorialSummary,places.primaryType")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();

        Map<String, Object> center = new HashMap<>();
        center.put("latitude", lat);
        center.put("longitude", lng);

        Map<String, Object> circle = new HashMap<>();
        circle.put("center", center);
        circle.put("radius", 10000.0);

        Map<String, Object> locationRestriction = new HashMap<>();
        locationRestriction.put("circle", circle);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("includedTypes", Arrays.asList("coffee_shop", "cafe"));
        requestBody.put("maxResultCount", 20);
        requestBody.put("locationRestriction", locationRestriction);
        requestBody.put("rankPreference", "POPULARITY");
        requestBody.put("languageCode", "Korean".equalsIgnoreCase(language) ? "ko" : "en");

        return webClient.post()
                .uri("/v1/places:searchNearby")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .map(rawJson -> {
                    List<Map<String, Object>> shops = new ArrayList<>();
                    try {
                        JsonNode root = objectMapper.readTree(rawJson);
                        JsonNode places = root.path("places");
                        if (places.isArray()) {
                            for (JsonNode p : places) {
                                Map<String, Object> shop = new HashMap<>();
                                shop.put("id", "google-" + p.path("id").asText());
                                shop.put("name", p.path("displayName").path("text").asText("Unknown Cafe"));
                                shop.put("lat", p.path("location").path("latitude").asDouble(lat));
                                shop.put("lng", p.path("location").path("longitude").asDouble(lng));
                                shop.put("address", p.path("formattedAddress").asText(""));
                                shop.put("aiSummary", p.path("editorialSummary").path("text").asText(p.path("primaryType").asText()));
                                shop.put("isGeneric", true);
                                shops.add(shop);
                            }
                        }
                    } catch (Exception e) {
                        System.err.println("Google Places Parse Error: " + e.getMessage());
                    }

                    Map<String, Object> response = new HashMap<>();
                    response.put("shops", shops);
                    response.put("chunks", new ArrayList<>());
                    return response;
                });
    }

    /**
     * Generate Curation Recommendation (curator-recommend)
     */
    public Mono<String> curatorRecommend(Map<String, Object> prefs, String userAgeGroup, String userGender, String language) {
        try {
            String prefsJson = objectMapper.writeValueAsString(prefs);
            String isEnglish = language != null && language.toLowerCase().startsWith("en") ? "English" : "Korean";

            String prompt = String.format(
                "You are a world-class coffee sommelier and Q-Grader.\n" +
                "A user has provided the following preferences and context:\n" +
                "Preferences: %s\n" +
                "Demographics: Age: %s, Gender: %s\n\n" +
                "Your task is to dynamically generate the absolute perfect coffee bean recommendation that matches their taste profile (Acidity: %s, Sweetness: %s, Bitterness: %s, Body: %s), health constraints (if any), and environmental context (Weather, Time, Mood).\n" +
                "You may invent a highly realistic specialty coffee profile or recommend a famous real-world coffee. \n\n" +
                "Respond ONLY with a valid JSON object matching the following structure exactly (DO NOT wrap in markdown blocks, just raw JSON):\n" +
                "{\n" +
                "  \"bean\": {\n" +
                "    \"id\": \"ai-generated-bean\",\n" +
                "    \"name\": \"[Creative but realistic bean name, e.g., 'Ethiopia Guji Anaerobic Natural']\",\n" +
                "    \"origin\": \"[Country]\",\n" +
                "    \"region\": \"[Region]\",\n" +
                "    \"processing\": \"[Processing Method]\",\n" +
                "    \"roastLevel\": \"[Light, Medium, or Dark]\",\n" +
                "    \"acidity\": [Number 1-5],\n" +
                "    \"body\": [Number 1-5],\n" +
                "    \"sweetness\": [Number 1-5],\n" +
                "    \"bitterness\": [Number 1-5],\n" +
                "    \"flavorNotes\": [\"[Flavor 1]\", \"[Flavor 2]\", \"[Flavor 3]\"],\n" +
                "    \"description\": \"[A short 1-sentence description of the coffee in %s]\",\n" +
                "    \"brewingGuide\": \"[A short brewing tip in %s]\",\n" +
                "    \"foodPairing\": []\n" +
                "  },\n" +
                "  \"brand\": {\n" +
                "    \"id\": \"ai-generated-brand\",\n" +
                "    \"name\": \"[A famous global or premium coffee brand that fits this roast, e.g., 'Blue Bottle Coffee', 'Fritz Coffee', 'Starbucks Reserve']\",\n" +
                "    \"description\": \"[Short description of the brand in %s]\",\n" +
                "    \"website\": \"\"\n" +
                "  }\n" +
                "}",
                prefsJson,
                userAgeGroup != null ? userAgeGroup : "Unknown",
                userGender != null ? userGender : "Unknown",
                prefs.getOrDefault("tasteAcidity", "3"),
                prefs.getOrDefault("tasteSweetness", "3"),
                prefs.getOrDefault("tasteBitterness", "3"),
                prefs.getOrDefault("tasteBody", "3"),
                isEnglish, isEnglish, isEnglish
            );

            return geminiService.generateContent("gemini-2.5-flash", prompt, 0.7, "application/json", false)
                    .map(this::cleanJsonText);
        } catch (Exception e) {
            return Mono.error(e);
        }
    }

    /**
     * Analyze Tasting Note
     */
    public Mono<String> analyzeTastingNote(String rawNote, String coffeeName, String brand) {
        String prompt = String.format(
            "You are an expert Coffee Q-Grader and Sommelier.\n" +
            "A user just drank coffee %s named \"%s\" and left this rough review:\n" +
            "\"%s\"\n\n" +
            "Analyze this rough note and return ONLY a JSON object containing the professional cupping attributes.\n" +
            "Format EXACTLY like this:\n" +
            "{\n" +
            "    \"aiTranslatedNote\": \"A professional, poetic 2-sentence cupping note in Korean.\",\n" +
            "    \"flavorTags\": \"ex) 초콜릿,견과류,약간의오렌지\",\n" +
            "    \"acidity\": 3.5, // 1 to 5 scale\n" +
            "    \"sweetness\": 4.0, // 1 to 5 scale\n" +
            "    \"bitterness\": 2.5, // 1 to 5 scale\n" +
            "    \"body\": 3.0, // 1 to 5 scale\n" +
            "    \"aroma\": 4 // 1 to 5 scale\n" +
            "}",
            (brand != null && !brand.isEmpty()) ? "from \"" + brand + "\"" : "",
            coffeeName != null ? coffeeName : "Unknown",
            rawNote
        );

        return geminiService.generateContent("gemini-2.5-flash", prompt, 0.3, "application/json", false)
                .map(this::cleanJsonText);
    }

    /**
     * Save Tasting Note and update user preferences (moving average)
     */
    @Transactional
    public TastingNote saveTastingNote(String email, Map<String, Object> payload) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        String coffeeName = (String) payload.get("coffeeName");
        String brand = (String) payload.get("brand");
        String rawUserNote = (String) payload.get("rawUserNote");
        String aiTranslatedNote = (String) payload.get("aiTranslatedNote");
        Double acidity = getDouble(payload.get("acidity"));
        Double sweetness = getDouble(payload.get("sweetness"));
        Double bitterness = getDouble(payload.get("bitterness"));
        Double body = getDouble(payload.get("body"));
        Integer aroma = getInteger(payload.get("aroma"));
        String flavorTags = (String) payload.get("flavorTags");

        TastingNote note = TastingNote.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .coffeeName(coffeeName)
                .brand(brand)
                .rawUserNote(rawUserNote)
                .aiTranslatedNote(aiTranslatedNote)
                .acidity(acidity)
                .sweetness(sweetness)
                .bitterness(bitterness)
                .body(body)
                .aroma(aroma)
                .flavorTags(flavorTags)
                .createdAt(LocalDateTime.now())
                .build();

        TastingNote savedNote = tastingNoteRepository.save(note);

        // Feedback loop: Update user moving average
        user.setPrefAcidity(calculateMovingAverage(user.getPrefAcidity(), acidity));
        user.setPrefSweetness(calculateMovingAverage(user.getPrefSweetness(), sweetness));
        user.setPrefBitterness(calculateMovingAverage(user.getPrefBitterness(), bitterness));
        user.setPrefBody(calculateMovingAverage(user.getPrefBody(), body));
        userRepository.save(user);

        return savedNote;
    }

    private Double calculateMovingAverage(Double current, Double incoming) {
        if (current == null || current == 0.0) return incoming;
        return Math.round(((current * 0.8) + (incoming * 0.2)) * 10) / 10.0;
    }

    /**
     * Get Taste Matrix
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getTasteMatrix(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        List<TastingNote> notes = tastingNoteRepository.findByUserIdOrderByCreatedAtDesc(user.getId());

        Map<String, Object> response = new HashMap<>();

        if (notes == null || notes.isEmpty()) {
            response.put("hasData", false);
            
            List<Map<String, Object>> matrix = new ArrayList<>();
            matrix.add(createMatrixItem("산미", user.getPrefAcidity() != null ? user.getPrefAcidity() : 0.0));
            matrix.add(createMatrixItem("단맛", user.getPrefSweetness() != null ? user.getPrefSweetness() : 0.0));
            matrix.add(createMatrixItem("쓴맛", user.getPrefBitterness() != null ? user.getPrefBitterness() : 0.0));
            matrix.add(createMatrixItem("바디감", user.getPrefBody() != null ? user.getPrefBody() : 0.0));
            matrix.add(createMatrixItem("아로마", 3.0)); // Default fallback
            
            response.put("matrix", matrix);
            return response;
        }

        double totalNotes = notes.size();
        double avgAcidity = notes.stream().mapToDouble(TastingNote::getAcidity).average().orElse(0.0);
        double avgSweetness = notes.stream().mapToDouble(TastingNote::getSweetness).average().orElse(0.0);
        double avgBitterness = notes.stream().mapToDouble(TastingNote::getBitterness).average().orElse(0.0);
        double avgBody = notes.stream().mapToDouble(TastingNote::getBody).average().orElse(0.0);
        double avgAroma = notes.stream().mapToDouble(TastingNote::getAroma).average().orElse(0.0);

        response.put("hasData", true);
        response.put("totalNotes", notes.size());

        List<Map<String, Object>> matrix = new ArrayList<>();
        matrix.add(createMatrixItem("산미", avgAcidity));
        matrix.add(createMatrixItem("단맛", avgSweetness));
        matrix.add(createMatrixItem("쓴맛", avgBitterness));
        matrix.add(createMatrixItem("바디감", avgBody));
        matrix.add(createMatrixItem("아로마", avgAroma));
        response.put("matrix", matrix);

        // Collect and distinct recent flavor tags (max 10)
        Set<String> tags = new LinkedHashSet<>();
        for (TastingNote note : notes) {
            if (note.getFlavorTags() != null) {
                String[] split = note.getFlavorTags().split(",");
                for (String tag : split) {
                    String cleanTag = tag.trim();
                    if (!cleanTag.isEmpty()) {
                        tags.add(cleanTag);
                        if (tags.size() >= 10) break;
                    }
                }
            }
            if (tags.size() >= 10) break;
        }
        response.put("recentTags", new ArrayList<>(tags));

        return response;
    }

    private Map<String, Object> createMatrixItem(String subject, Double value) {
        Map<String, Object> item = new HashMap<>();
        item.put("subject", subject);
        item.put("A", value);
        item.put("fullMark", 5);
        return item;
    }

    /**
     * Generate AI Cafe Tour Route (tour/generate)
     */
    @Transactional
    public Mono<Map<String, Object>> generateTour(String email, Map<String, Object> payload, String lang) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        String region = (String) payload.get("region");
        String theme = (String) payload.get("theme");
        Double lat = getDouble(payload.get("lat"));
        Double lng = getDouble(payload.get("lng"));

        if (region == null && (lat == null || lng == null)) {
            return Mono.error(new CustomException(ErrorCode.BAD_REQUEST));
        }

        String currentLang = "en".equalsIgnoreCase(lang) ? "English" : "Korean";
        String locationContext = region != null ? "region: " + region : String.format("coordinates: Latitude %s, Longitude %s", lat, lng);
        String themeContext = theme != null ? "The theme/vibe of this tour is: " + theme + "." : "Create a well-balanced coffee tour.";

        String prompt = String.format(
            "You are an expert specialty coffee curator.\n" +
            "Create a 1-day cafe tour route with exactly 3 to 4 stops around the following location: %s.\n" +
            "%s\n" +
            "Ensure the stops formulate a logical geographical walking or public transit route.\n" +
            "For each stop, provide the cafe name, latitude, longitude, address, and a very short 1-sentence reason for recommending it (in %s).\n\n" +
            "Respond ONLY with a valid JSON array of objects.\n" +
            "Format EXACTLY like this example: \n" +
            "[\n" +
            "    {\"name\": \"Anthracite Coffee\", \"lat\": 37.545, \"lng\": 126.918, \"address\": \"Seoul, Mapo-gu...\", \"reason\": \"A great place to start with a strong espresso.\"},\n" +
            "    {\"name\": \"Fritz Coffee Company\", \"lat\": 37.540, \"lng\": 126.945, \"address\": \"Seoul, Mapo-gu...\", \"reason\": \"Famous for their bakery and retro vibe.\"}\n" +
            "]",
            locationContext, themeContext, currentLang
        );

        return geminiService.generateContent("gemini-2.5-flash", prompt, 0.2, "application/json", true)
                .flatMap(rawJson -> {
                    try {
                        String cleaned = cleanJsonText(rawJson);
                        JsonNode stopsNode = objectMapper.readTree(cleaned);
                        if (!stopsNode.isArray() || stopsNode.isEmpty()) {
                            return Mono.error(new CustomException(ErrorCode.BAD_REQUEST));
                        }

                        List<CollectionItem> items = new ArrayList<>();
                        int orderIndex = 0;

                        for (JsonNode stop : stopsNode) {
                            String name = stop.path("name").asText();
                            Double stopLat = stop.path("lat").asDouble();
                            Double stopLng = stop.path("lng").asDouble();
                            String address = stop.path("address").asText("주소 정보 없음");
                            String reason = stop.path("reason").asText("AI 큐레이터 추천 카페");

                            if (name.isEmpty() || stopLat == 0.0 || stopLng == 0.0) continue;

                            // Find or Create Store (AI Suggested)
                            Store store = storeRepository.findFirstByNameContaining(name)
                                    .orElseGet(() -> {
                                        Store newStore = Store.builder()
                                                .id(UUID.randomUUID().toString())
                                                .owner(user)
                                                .name(name)
                                                .address(address)
                                                .hours("정보 없음")
                                                .shortDesc(reason)
                                                .longDesc("AI 자동 생성 코스 경유지입니다.")
                                                .signatureBean("스페셜티 커피")
                                                .acidity(3.0)
                                                .sweetness(3.0)
                                                .bitterness(3.0)
                                                .body(3.0)
                                                .equipment("기본 에스프레소 머신")
                                                .signatureMenu("브루잉 커피")
                                                .dessertPairing("추천 없음")
                                                .status("AI_SUGGESTED")
                                                .lat(stopLat)
                                                .lng(stopLng)
                                                .primaryCoffeeType(CoffeeType.GENERAL)
                                                .build();
                                        return storeRepository.save(newStore);
                                    });

                            CollectionItem item = CollectionItem.builder()
                                    .id(UUID.randomUUID().toString())
                                    .store(store)
                                    .orderIndex(orderIndex++)
                                    .build();
                            items.add(item);
                        }

                        if (items.isEmpty()) {
                            return Mono.error(new CustomException(ErrorCode.BAD_REQUEST));
                        }

                        String courseName = region != null ? region + " AI 추천 코스" : "AI 카페 투어 코스";
                        String courseDesc = String.format("%s AI가 구성한 1일 스페셜 카페 투어 코스입니다.", theme != null ? theme + " 테마의 " : "");

                        Collection collection = Collection.builder()
                                .id(UUID.randomUUID().toString())
                                .user(user)
                                .name(courseName)
                                .description(courseDesc)
                                .isPilgrimageCourse(true)
                                .isPublic(false)
                                .createdAt(LocalDateTime.now())
                                .updatedAt(LocalDateTime.now())
                                .build();

                        Collection savedCollection = collectionRepository.save(collection);

                        for (CollectionItem item : items) {
                            item.setCollection(savedCollection);
                            collectionItemRepository.save(item);
                        }

                        Map<String, Object> result = new HashMap<>();
                        result.put("success", true);
                        result.put("collectionId", savedCollection.getId());
                        result.put("totalStops", items.size());
                        result.put("tourName", savedCollection.getName());

                        return Mono.just(result);

                    } catch (Exception e) {
                        return Mono.error(new RuntimeException("Failed to generate and parse tour", e));
                    }
                });
    }

    /**
     * Gemini SSE stream proxy
     */
    public Flux<String> streamCurationProxy(String rawRequestBody) {
        return geminiService.streamCurationProxy("gemini-2.5-flash", rawRequestBody);
    }

    private String cleanJsonText(String text) {
        if (text == null) return "{}";
        String cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }

    private Double getDouble(Object obj) {
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        if (obj instanceof String) return Double.parseDouble((String) obj);
        return 0.0;
    }

    private Integer getInteger(Object obj) {
        if (obj instanceof Number) return ((Number) obj).intValue();
        if (obj instanceof String) return Integer.parseInt((String) obj);
        return 0;
    }
}
