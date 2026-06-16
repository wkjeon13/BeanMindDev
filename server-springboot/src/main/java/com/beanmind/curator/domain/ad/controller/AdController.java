package com.beanmind.curator.domain.ad.controller;

import com.beanmind.curator.domain.ad.service.AdService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AdController {

    private final AdService adService;

    @GetMapping("/ads/serve")
    public ResponseEntity<Map<String, Object>> serveAd(
            @AuthenticationPrincipal Object principal,
            @RequestParam(name = "tab", required = false) String tab,
            @RequestParam(name = "lang", defaultValue = "en") String lang,
            @RequestParam(name = "placementKey", required = false) String placementKey) {
        String email = null;
        if (principal instanceof UserDetails) {
            email = ((UserDetails) principal).getUsername();
        }
        Map<String, Object> ad = adService.serveAd(email, tab, lang, placementKey);
        return ResponseEntity.ok(ad);
    }

    @PostMapping("/ads/track")
    public ResponseEntity<Map<String, Object>> trackAd(
            @AuthenticationPrincipal Object principal,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        String email = null;
        if (principal instanceof UserDetails) {
            email = ((UserDetails) principal).getUsername();
        }
        String creativeId = body.get("creativeId");
        String actionType = body.get("actionType");

        if (creativeId == null || actionType == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing parameters"));
        }

        String ipAddress = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");

        adService.trackAd(email, creativeId, actionType, ipAddress, userAgent);

        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/community/ads")
    public ResponseEntity<List<Map<String, Object>>> getCommunityAds(
            @RequestParam(name = "country", required = false) String country,
            @RequestParam(name = "tags", required = false) String tags) {
        List<Map<String, Object>> ads = adService.getCommunityAds(country, tags);
        return ResponseEntity.ok(ads);
    }

    @PostMapping("/community/ads/{id}/click")
    public ResponseEntity<Map<String, Object>> clickAd(
            @PathVariable("id") String creativeId,
            HttpServletRequest request) {
        String ipAddress = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");
        adService.trackAd(null, creativeId, "CLICK", ipAddress, userAgent);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/community/ads/{id}/impression")
    public ResponseEntity<Map<String, Object>> impressionAd(
            @PathVariable("id") String creativeId,
            HttpServletRequest request) {
        String ipAddress = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");
        adService.trackAd(null, creativeId, "IMPRESSION", ipAddress, userAgent);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
