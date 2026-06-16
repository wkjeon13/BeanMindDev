package com.beanmind.curator.domain.compliance.controller;

import com.beanmind.curator.domain.compliance.dto.ComplianceRequestDto;
import com.beanmind.curator.domain.compliance.service.ComplianceService;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/compliance")
@RequiredArgsConstructor
public class ComplianceController {

    private final ComplianceService complianceService;
    private final UserRepository userRepository;

    @GetMapping("/policies/active")
    public ResponseEntity<Map<String, Object>> getActivePolicies() {
        return ResponseEntity.ok(complianceService.getActivePolicies());
    }

    @PostMapping("/request")
    public ResponseEntity<Map<String, Object>> submitRequest(
            @RequestBody ComplianceRequestDto dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        if (dto.getRequestEmail() == null || dto.getRequestType() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "MISSING_REQUIRED_FIELDS"));
        }

        String userId = null;
        if (userDetails != null) {
            User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
            if (user != null) {
                userId = user.getId();
            }
        }

        try {
            Map<String, Object> result = complianceService.submitRequest(dto.getRequestEmail(), dto.getRequestType(), userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/my-data")
    public ResponseEntity<Map<String, Object>> getMyData(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "UNAUTHORIZED"));
        }

        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "USER_NOT_FOUND"));
        }

        try {
            return ResponseEntity.ok(complianceService.getMyData(user.getId()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }
}
