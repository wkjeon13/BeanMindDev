package com.beanmind.curator.domain.ai.controller;

import com.beanmind.curator.domain.ai.service.AiService;
import com.beanmind.curator.domain.user.entity.TastingNote;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/ai-features")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/shop/{id}/summarize-reviews")
    public Mono<ResponseEntity<Map<String, String>>> summarizeReviews(
            @PathVariable("id") String storeId,
            @RequestParam(name = "lang", defaultValue = "ko") String lang) {
        return aiService.summarizeReviews(storeId, lang)
                .map(summary -> ResponseEntity.ok(Map.of("summary", summary)));
    }

    @PostMapping("/map-shops")
    public Mono<ResponseEntity<Map<String, Object>>> mapShops(
            @RequestBody Map<String, Object> body) {
        Double lat = getDouble(body.get("currentLatitude"));
        Double lng = getDouble(body.get("currentLongitude"));
        String language = (String) body.get("language");
        String promptStr = (String) body.get("promptStr");

        return aiService.mapShops(lat, lng, language, promptStr)
                .map(ResponseEntity::ok);
    }

    @PostMapping("/curator-recommend")
    public Mono<ResponseEntity<String>> curatorRecommend(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> prefs = (Map<String, Object>) body.get("prefs");
        String userAgeGroup = (String) body.get("userAgeGroup");
        String userGender = (String) body.get("userGender");
        String language = (String) body.get("language");

        return aiService.curatorRecommend(prefs, userAgeGroup, userGender, language)
                .map(json -> ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(json));
    }

    @PostMapping("/tasting-note/analyze")
    public Mono<ResponseEntity<String>> analyzeTastingNote(
            @RequestBody Map<String, Object> body) {
        String rawNote = (String) body.get("rawNote");
        String coffeeName = (String) body.get("coffeeName");
        String brand = (String) body.get("brand");

        return aiService.analyzeTastingNote(rawNote, coffeeName, brand)
                .map(json -> ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(json));
    }

    @PostMapping("/tasting-note")
    public ResponseEntity<TastingNote> saveTastingNote(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {
        String email = userDetails.getUsername();
        TastingNote note = aiService.saveTastingNote(email, body);
        return ResponseEntity.status(201).body(note);
    }

    @GetMapping("/tasting-note/matrix")
    public ResponseEntity<Map<String, Object>> getTasteMatrix(
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        Map<String, Object> matrix = aiService.getTasteMatrix(email);
        return ResponseEntity.ok(matrix);
    }

    @PostMapping("/tour/generate")
    public Mono<ResponseEntity<Map<String, Object>>> generateTour(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body,
            @RequestParam(name = "lang", defaultValue = "ko") String lang) {
        String email = userDetails.getUsername();
        return aiService.generateTour(email, body, lang)
                .map(ResponseEntity::ok);
    }

    @PostMapping(value = "/stream-curation", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamCurationProxy(
            @RequestBody String rawBody) {
        return aiService.streamCurationProxy(rawBody);
    }

    private Double getDouble(Object obj) {
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        if (obj instanceof String) return Double.parseDouble((String) obj);
        return 0.0;
    }
}
