package com.beanmind.curator.domain.ad.controller;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.domain.ad.entity.AdInquiry;
import com.beanmind.curator.domain.ad.service.AdInquiryService;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AdInquiryController {

    private final AdInquiryService adInquiryService;
    private final UserRepository userRepository;

    private User validateAdminOrModerator(UserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (!"ADMIN".equals(user.getRole().name()) && !"MODERATOR".equals(user.getRole().name())) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
        return user;
    }

    private User validateHost(UserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (!"OWNER".equals(user.getRole().name()) && !"ADMIN".equals(user.getRole().name())) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
        return user;
    }

    // ==========================================
    // HOST Endpoints (파트너용)
    // ==========================================
    @PostMapping("/api/host/ad-inquiries")
    public ResponseEntity<AdInquiry> createInquiry(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody AdInquiry inquiryRequest) {
        User host = validateHost(userDetails);
        AdInquiry created = adInquiryService.createAdInquiry(inquiryRequest, host.getEmail());
        return ResponseEntity.status(201).body(created);
    }

    @GetMapping("/api/host/ad-inquiries")
    public ResponseEntity<List<AdInquiry>> getMyInquiries(
            @AuthenticationPrincipal UserDetails userDetails) {
        User host = validateHost(userDetails);
        List<AdInquiry> list = adInquiryService.getInquiriesByHost(host.getEmail());
        return ResponseEntity.ok(list);
    }

    // ==========================================
    // ADMIN Endpoints (관리자용)
    // ==========================================
    @GetMapping("/api/admin/ad-inquiries")
    public ResponseEntity<List<AdInquiry>> getAllInquiries(
            @AuthenticationPrincipal UserDetails userDetails) {
        validateAdminOrModerator(userDetails);
        List<AdInquiry> list = adInquiryService.getAllInquiries();
        return ResponseEntity.ok(list);
    }

    @PutMapping("/api/admin/ad-inquiries/{id}/status")
    public ResponseEntity<AdInquiry> updateInquiryStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("id") String id,
            @RequestBody Map<String, String> body) {
        validateAdminOrModerator(userDetails);
        String status = body.get("status");
        String adminMemo = body.get("adminMemo");
        AdInquiry updated = adInquiryService.updateStatus(id, status, adminMemo);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/api/admin/ad-inquiries/{id}/email")
    public ResponseEntity<Map<String, Object>> sendInquiryEmail(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("id") String id,
            @RequestBody Map<String, String> body) {
        validateAdminOrModerator(userDetails);
        String subject = body.get("subject");
        String message = body.get("message");
        String newStatus = body.get("newStatus");

        try {
            boolean success = adInquiryService.sendEmail(id, subject, message, newStatus);
            return ResponseEntity.ok(Map.of("success", success));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage() != null ? e.getMessage() : "SMTP Mail dispatch error"));
        }
    }
}
