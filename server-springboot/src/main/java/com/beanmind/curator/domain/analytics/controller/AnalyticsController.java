package com.beanmind.curator.domain.analytics.controller;

import com.beanmind.curator.domain.analytics.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @PostMapping("/visit")
    public ResponseEntity<Map<String, Object>> trackVisit(@RequestBody Map<String, String> body) {
        String visitorId = body.get("visitorId");
        if (visitorId == null || visitorId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "visitorId is required"));
        }
        analyticsService.trackVisit(visitorId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/ai-usage")
    public ResponseEntity<Map<String, Object>> trackAiUsage(@RequestBody Map<String, String> body) {
        String visitorId = body.get("visitorId");
        if (visitorId == null || visitorId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "visitorId is required"));
        }
        analyticsService.trackAiUsage(visitorId);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
