package com.beanmind.curator.domain.point.controller;

import com.beanmind.curator.common.dto.ApiResponse;
import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.domain.point.dto.EarnSpendResponse;
import com.beanmind.curator.domain.point.dto.PointRequestDto;
import com.beanmind.curator.domain.point.dto.PointResponse;
import com.beanmind.curator.domain.point.service.PointService;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/points")
@RequiredArgsConstructor
public class PointController {

    private final PointService pointService;
    private final UserRepository userRepository;

    private String getRequiredUserId(Principal principal) {
        if (principal == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findByEmail(principal.getName())
                .map(User::getId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    @GetMapping
    public ResponseEntity<PointResponse> getPointBalanceAndHistory(Principal principal) {
        String userId = getRequiredUserId(principal);
        PointResponse points = pointService.getPointBalanceAndHistory(userId);
        return ResponseEntity.ok(points);
    }

    @PostMapping("/earn")
    public ResponseEntity<EarnSpendResponse> earnPoints(
            @RequestBody PointRequestDto.EarnSpend request,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        EarnSpendResponse result = pointService.earnPoints(userId, request.getAmount(), request.getDescription());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/spend")
    public ResponseEntity<EarnSpendResponse> spendPoints(
            @RequestBody PointRequestDto.EarnSpend request,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        EarnSpendResponse result = pointService.spendPoints(userId, request.getAmount(), request.getDescription());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/charge")
    public ResponseEntity<EarnSpendResponse> chargePoints(
            @RequestBody PointRequestDto.Charge request,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        EarnSpendResponse result = pointService.chargePoints(userId, request.getAmount());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/verify-iap")
    public ResponseEntity<EarnSpendResponse> verifyIapCharge(
            @RequestBody PointRequestDto.VerifyIap request,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        EarnSpendResponse result = pointService.verifyIapCharge(userId, request.getAmount(), request.getTransactionId());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/reward")
    public ResponseEntity<EarnSpendResponse> rewardPoints(
            @RequestBody PointRequestDto.Reward request,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        EarnSpendResponse result = pointService.rewardPoints(
                userId, request.getTargetUserId(), request.getAmount(),
                request.getDescription(), request.getTargetType(), request.getTargetEntityId()
        );
        return ResponseEntity.ok(result);
    }
}
