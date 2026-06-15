package com.beanmind.curator.domain.user.controller;

import com.beanmind.curator.common.dto.ApiResponse;
import com.beanmind.curator.domain.user.dto.AuthResponse;
import com.beanmind.curator.domain.user.dto.LoginRequest;
import com.beanmind.curator.domain.user.dto.RegisterRequest;
import com.beanmind.curator.domain.user.dto.VerifyEmailRequest;
import com.beanmind.curator.domain.user.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest servletRequest) {
        
        String ipAddress = servletRequest.getHeader("X-Forwarded-For");
        if (ipAddress == null) {
            ipAddress = servletRequest.getRemoteAddr();
        }

        AuthResponse response = authService.register(request, ipAddress);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest) {

        String ipAddress = servletRequest.getHeader("X-Forwarded-For");
        if (ipAddress == null) {
            ipAddress = servletRequest.getRemoteAddr();
        }

        AuthResponse response = authService.login(request, ipAddress);
        
        // Handle unverified email fallback - Return 403 Forbidden with payload
        if (Boolean.TRUE.equals(response.getRequiresVerification())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.success(response));
        }

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request) {

        AuthResponse response = authService.verifyEmail(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
