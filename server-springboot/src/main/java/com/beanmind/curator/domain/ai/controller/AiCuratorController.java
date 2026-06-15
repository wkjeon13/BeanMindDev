package com.beanmind.curator.domain.ai.controller;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.domain.ai.service.AiCuratorService;
import com.beanmind.curator.domain.ai.service.CurationJobManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai-curator")
@RequiredArgsConstructor
public class AiCuratorController {

    private final AiCuratorService aiCuratorService;
    private final CurationJobManager curationJobManager;

    @PostMapping("/verify-cost")
    public ResponseEntity<Map<String, Object>> verifyCost(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        Map<String, Object> result = aiCuratorService.verifyCost(email);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generate(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> payload) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        String jobId = aiCuratorService.generatePrescription(email, payload);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Job enqueued successfully");
        response.put("jobId", jobId);
        
        return ResponseEntity.status(202).body(response);
    }

    @GetMapping("/status/{jobId}")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable("jobId") String jobId) {
        CurationJobManager.CurationJob job = curationJobManager.getJob(jobId);
        if (job == null) {
            throw new CustomException(ErrorCode.PRESCRIPTION_NOT_FOUND);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", job.getStatus());
        response.put("progress", job.getProgress());

        if ("completed".equals(job.getStatus())) {
            response.put("result", job.getResult());
            return ResponseEntity.ok(response);
        } else if ("failed".equals(job.getStatus())) {
            response.put("error", job.getError());
            return ResponseEntity.status(500).body(response);
        }

        return ResponseEntity.ok(response);
    }
}
