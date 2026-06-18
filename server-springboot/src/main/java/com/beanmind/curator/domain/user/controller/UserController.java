package com.beanmind.curator.domain.user.controller;

import com.beanmind.curator.common.dto.ApiResponse;
import com.beanmind.curator.domain.user.dto.*;
import com.beanmind.curator.domain.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getMyProfile(Principal principal) {
        String email = principal.getName();
        UserResponse response = userService.getUserProfile(email);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/profile/nickname")
    public ResponseEntity<ApiResponse<UserResponse>> updateNickname(
            @Valid @RequestBody NicknameRequest request,
            Principal principal) {
        String email = principal.getName();
        UserResponse response = userService.updateNickname(email, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/profile/password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @Valid @RequestBody PasswordChangeRequest request,
            Principal principal) {
        String email = principal.getName();
        userService.updatePassword(email, request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PutMapping("/profile/language")
    public ResponseEntity<ApiResponse<UserResponse>> updateLanguage(
            @Valid @RequestBody LanguageRequest request,
            Principal principal) {
        String email = principal.getName();
        UserResponse response = userService.updateLanguage(email, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(Principal principal) {
        String email = principal.getName();
        userService.deleteAccount(email);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PutMapping("/me/taste")
    public ResponseEntity<ApiResponse<UserResponse>> updateTaste(
            @RequestBody TasteRequest request,
            Principal principal) {
        String email = principal.getName();
        UserResponse response = userService.updateTaste(email, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/profile-image")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfileImage(
            @Valid @RequestBody ProfileImageRequest request,
            Principal principal) {
        String email = principal.getName();
        UserResponse response = userService.updateProfileImage(email, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/reward-tiers")
    public ResponseEntity<RewardTiersDto> getRewardTiers(Principal principal) {
        String email = principal.getName();
        RewardTiersDto response = userService.getRewardTiers(email);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/reward-tiers")
    public ResponseEntity<RewardTiersDto> updateRewardTiers(
            @Valid @RequestBody RewardTiersDto request,
            Principal principal) {
        String email = principal.getName();
        RewardTiersDto response = userService.updateRewardTiers(email, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me/home-layout")
    public ResponseEntity<ApiResponse<UserResponse>> updateHomeLayout(
            @RequestBody HomeLayoutRequest request,
            Principal principal) {
        String email = principal.getName();
        UserResponse response = userService.updateHomeLayout(email, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/ai-eligibility")
    public ResponseEntity<AiEligibilityDto> checkAiEligibility(Principal principal) {
        String email = principal.getName();
        AiEligibilityDto response = userService.checkAiEligibility(email);
        if (!response.isEligible()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).body(response);
        }
        return ResponseEntity.ok(response);
    }
}

