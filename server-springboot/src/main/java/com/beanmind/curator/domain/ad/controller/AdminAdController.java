package com.beanmind.curator.domain.ad.controller;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.domain.ad.entity.Advertiser;
import com.beanmind.curator.domain.ad.entity.Advertiser.AdvertiserStatus;
import com.beanmind.curator.domain.ad.repository.AdvertiserRepository;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminAdController {

    private final AdvertiserRepository advertiserRepository;
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

    // ==========================================
    // Advertisers CRUD Endpoints
    // ==========================================
    @GetMapping("/advertisers")
    public ResponseEntity<List<Advertiser>> getAllAdvertisers(
            @AuthenticationPrincipal UserDetails userDetails) {
        validateAdminOrModerator(userDetails);
        List<Advertiser> list = advertiserRepository.findAll();
        return ResponseEntity.ok(list);
    }

    @PostMapping("/advertisers")
    public ResponseEntity<Advertiser> createAdvertiser(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {
        validateAdminOrModerator(userDetails);

        String companyName = (String) body.get("companyName");
        String managerName = (String) body.get("managerName");
        String managerEmail = (String) body.get("managerEmail");
        String managerPhone = (String) body.get("managerPhone");
        String statusStr = (String) body.getOrDefault("status", "PENDING");
        String gradeStr = (String) body.getOrDefault("grade", "STANDARD");
        String userId = (String) body.get("userId");

        User targetUser = null;
        if (userId != null && !userId.isEmpty()) {
            targetUser = userRepository.findById(userId).orElse(null);
        }

        Advertiser advertiser = Advertiser.builder()
                .id(UUID.randomUUID().toString())
                .companyName(companyName)
                .managerName(managerName)
                .managerEmail(managerEmail)
                .managerPhone(managerPhone)
                .status(AdvertiserStatus.valueOf(statusStr.toUpperCase()))
                .grade(Advertiser.AdvertiserGrade.valueOf(gradeStr.toUpperCase()))
                .user(targetUser)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Advertiser saved = advertiserRepository.save(advertiser);
        return ResponseEntity.status(201).body(saved);
    }

    @PutMapping("/advertisers/{id}")
    public ResponseEntity<Advertiser> updateAdvertiser(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("id") String id,
            @RequestBody Map<String, Object> body) {
        validateAdminOrModerator(userDetails);

        Advertiser advertiser = advertiserRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.BAD_REQUEST));

        if (body.containsKey("companyName")) advertiser.setCompanyName((String) body.get("companyName"));
        if (body.containsKey("managerName")) advertiser.setManagerName((String) body.get("managerName"));
        if (body.containsKey("managerEmail")) advertiser.setManagerEmail((String) body.get("managerEmail"));
        if (body.containsKey("managerPhone")) advertiser.setManagerPhone((String) body.get("managerPhone"));
        if (body.containsKey("status")) advertiser.setStatus(AdvertiserStatus.valueOf(((String) body.get("status")).toUpperCase()));
        if (body.containsKey("grade")) advertiser.setGrade(Advertiser.AdvertiserGrade.valueOf(((String) body.get("grade")).toUpperCase()));
        
        if (body.containsKey("userId")) {
            String userId = (String) body.get("userId");
            if (userId == null || userId.isEmpty()) {
                advertiser.setUser(null);
            } else {
                User targetUser = userRepository.findById(userId).orElse(null);
                advertiser.setUser(targetUser);
            }
        }

        advertiser.setUpdatedAt(LocalDateTime.now());
        Advertiser saved = advertiserRepository.save(advertiser);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/advertisers/{id}")
    public ResponseEntity<Map<String, Object>> deleteAdvertiser(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("id") String id) {
        validateAdminOrModerator(userDetails);
        advertiserRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ==========================================
    // Hosts Search Endpoint
    // ==========================================
    @GetMapping("/hosts/search")
    public ResponseEntity<List<Map<String, Object>>> searchHosts(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("q") String query) {
        validateAdminOrModerator(userDetails);
        List<User> hosts = userRepository.searchHosts(query);
        
        List<Map<String, Object>> result = hosts.stream().map(h -> {
            // 점주 닉네임, 이메일, 프로필사진, 매장명 정보 등을 포함한 맵 리턴
            return Map.<String, Object>of(
                    "id", h.getId(),
                    "nickname", h.getNickname(),
                    "email", h.getEmail(),
                    "profileImageUrl", h.getPhone() != null ? h.getPhone() : "" // fallback 용이성 보존
            );
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}
