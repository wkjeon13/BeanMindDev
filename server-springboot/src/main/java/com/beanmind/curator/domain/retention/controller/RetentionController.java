package com.beanmind.curator.domain.retention.controller;

import com.beanmind.curator.domain.admin.entity.FlashDrop;
import com.beanmind.curator.domain.retention.service.RetentionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/retention")
@RequiredArgsConstructor
public class RetentionController {

    private final RetentionService retentionService;

    @GetMapping("/daily-status")
    public ResponseEntity<Map<String, Object>> getDailyStatus(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        Map<String, Object> status = retentionService.getDailyStatus(principal.getName());
        return ResponseEntity.ok(status);
    }

    @PostMapping("/daily-checkin")
    public ResponseEntity<Map<String, Object>> dailyCheckIn(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            Map<String, Object> result = retentionService.dailyCheckIn(principal.getName());
            return ResponseEntity.ok(result);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/flash-drops")
    public ResponseEntity<List<FlashDrop>> getFlashDrops(
            @RequestParam(value = "countryCode", required = false) String countryCode) {
        List<FlashDrop> drops = retentionService.getFlashDrops(countryCode);
        return ResponseEntity.ok(drops);
    }
}
