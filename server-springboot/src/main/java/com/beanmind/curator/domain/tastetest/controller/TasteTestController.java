package com.beanmind.curator.domain.tastetest.controller;

import com.beanmind.curator.domain.tastetest.dto.*;
import com.beanmind.curator.domain.tastetest.service.TasteTestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class TasteTestController {

    private final TasteTestService tasteTestService;

    // 모바일/메인 서비스용 API (일반 공개)
    @GetMapping("/taste-test/active")
    public ResponseEntity<TasteTestResponse> getActiveTest() {
        return ResponseEntity.ok(tasteTestService.getActiveTest());
    }

    @PostMapping("/taste-test/submit")
    public ResponseEntity<TasteTestSubmissionResponse> submitTest(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody TasteTestSubmissionRequest request) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(tasteTestService.submitTest(request, email));
    }

    // 어드민용 관리 API
    @GetMapping("/admin/taste-tests")
    public ResponseEntity<List<TasteTestResponse>> getAllTests() {
        return ResponseEntity.ok(tasteTestService.getAllTests());
    }

    @PostMapping("/admin/taste-tests")
    public ResponseEntity<TasteTestResponse> saveTasteTest(@RequestBody AdminTasteTestRequest request) {
        return ResponseEntity.ok(tasteTestService.saveTasteTest(request));
    }

    @DeleteMapping("/admin/taste-tests/{id}")
    public ResponseEntity<Void> deleteTasteTest(@PathVariable String id) {
        tasteTestService.deleteTasteTest(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/admin/taste-tests/{id}/toggle-active")
    public ResponseEntity<Void> toggleActive(@PathVariable String id, @RequestParam boolean active) {
        tasteTestService.toggleActive(id, active);
        return ResponseEntity.ok().build();
    }
}
