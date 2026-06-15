package com.beanmind.curator.domain.ad.controller;

import com.beanmind.curator.domain.ad.service.AdService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ads")
@RequiredArgsConstructor
public class AdController {

    private final AdService adService;

    @GetMapping("/serve")
    public ResponseEntity<Map<String, Object>> serveAd(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(name = "tab", required = false) String tab,
            @RequestParam(name = "lang", defaultValue = "en") String lang,
            @RequestParam(name = "placementKey", required = false) String placementKey) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        Map<String, Object> ad = adService.serveAd(email, tab, lang, placementKey);
        return ResponseEntity.ok(ad);
    }

    @PostMapping("/track")
    public ResponseEntity<Map<String, Object>> trackAd(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        String email = userDetails != null ? userDetails.getUsername() : null;
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
}
