package com.beanmind.curator.domain.admin.controller;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.domain.admin.entity.*;
import com.beanmind.curator.domain.admin.repository.*;
import com.beanmind.curator.domain.admin.service.AdminService;
import com.beanmind.curator.domain.post.entity.BannedWord;
import com.beanmind.curator.domain.post.repository.BannedWordRepository;
import com.beanmind.curator.domain.store.entity.Store;
import com.beanmind.curator.domain.store.repository.StoreRepository;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final BannedWordRepository bannedWordRepository;
    private final UserAccessLogRepository userAccessLogRepository;
    private final AdminActionLogRepository adminActionLogRepository;

    private User validateAdmin(UserDetails userDetails) {
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

    private void validateSuperAdmin(User user) {
        if (!"ADMIN".equals(user.getRole().name())) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
    }

    @PutMapping("/shops/{id}/status")
    public ResponseEntity<Map<String, Object>> updateShopStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("id") String storeId,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        User admin = validateAdmin(userDetails);
        String status = body.get("status");
        String rejectionReason = body.get("rejectionReason");

        Store store = adminService.updateShopStatus(storeId, status, rejectionReason);

        adminService.logAdminAction(admin.getId(), admin.getEmail(), admin.getRole().name(),
                "UPDATE", "STORE", storeId,
                String.format("매장 승인 상태 변경: %s -> %s (사유: %s)", storeId, status, rejectionReason),
                request.getRemoteAddr());

        return ResponseEntity.ok(Map.of("message", "Shop status updated successfully", "shop", store));
    }

    @PostMapping("/content/delete")
    public ResponseEntity<Map<String, Object>> deleteContent(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        User admin = validateAdmin(userDetails);
        String type = body.get("type"); // POST or COMMENT
        String id = body.get("id");
        String reason = body.get("reason");

        if (type == null || id == null || reason == null) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }

        adminService.deleteContent(type, id, reason, admin.getEmail());

        adminService.logAdminAction(admin.getId(), admin.getEmail(), admin.getRole().name(),
                "DELETE", "CONTENT", id,
                String.format("%s 강제 삭제: %s (사유: %s)", type, id, reason),
                request.getRemoteAddr());

        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/content/restore")
    public ResponseEntity<Map<String, Object>> restoreContent(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        User admin = validateAdmin(userDetails);
        String type = body.get("type");
        String id = body.get("id");

        if (type == null || id == null) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }

        adminService.restoreContent(type, id);

        adminService.logAdminAction(admin.getId(), admin.getEmail(), admin.getRole().name(),
                "UPDATE", "CONTENT", id,
                String.format("%s 복구: %s", type, id),
                request.getRemoteAddr());

        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/banned-words")
    public ResponseEntity<List<BannedWord>> getBannedWords(
            @AuthenticationPrincipal UserDetails userDetails) {
        validateAdmin(userDetails);
        List<BannedWord> words = bannedWordRepository.findAll();
        return ResponseEntity.ok(words);
    }

    @PostMapping("/banned-words")
    public ResponseEntity<BannedWord> createBannedWord(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        User admin = validateAdmin(userDetails);
        String word = body.get("word");
        String category = body.get("category");
        String locale = body.get("locale");

        if (word == null) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }

        BannedWord banned = adminService.createBannedWord(word, category, locale);

        adminService.logAdminAction(admin.getId(), admin.getEmail(), admin.getRole().name(),
                "CREATE", "BANNED_WORD", banned.getId(),
                String.format("금칙어 등록: %s (%s)", word, locale),
                request.getRemoteAddr());

        return ResponseEntity.status(201).body(banned);
    }

    @DeleteMapping("/banned-words/{id}")
    public ResponseEntity<Map<String, Object>> deleteBannedWord(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("id") String id,
            HttpServletRequest request) {
        User admin = validateAdmin(userDetails);
        adminService.deleteBannedWord(id);

        adminService.logAdminAction(admin.getId(), admin.getEmail(), admin.getRole().name(),
                "DELETE", "BANNED_WORD", id,
                String.format("금칙어 삭제: %s", id),
                request.getRemoteAddr());

        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/pairings/translate")
    public Mono<ResponseEntity<String>> translatePairing(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {
        validateAdmin(userDetails);
        return adminService.translatePairing(body)
                .map(json -> ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(json));
    }

    @PostMapping("/payments/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelPayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("id") String id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        User admin = validateAdmin(userDetails);
        boolean force = body.get("force") != null && (Boolean) body.get("force");
        String reason = (String) body.get("reason");

        Map<String, Object> result = adminService.cancelPayment(id, force, reason);

        if (result.containsKey("error")) {
            return ResponseEntity.status(400).body(result);
        }

        adminService.logAdminAction(admin.getId(), admin.getEmail(), admin.getRole().name(),
                "UPDATE", "PAYMENT", id,
                String.format("결제 취소 처리: %s (force: %b, 사유: %s)", id, force, reason),
                request.getRemoteAddr());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/access-logs")
    public ResponseEntity<Map<String, Object>> getAccessLogs(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(name = "email", required = false) String email,
            @RequestParam(name = "ipAddress", required = false) String ipAddress,
            @RequestParam(name = "deviceOS", required = false) String deviceOS,
            @RequestParam(name = "actionType", required = false) String actionType,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "limit", defaultValue = "50") int limit) {
        User admin = validateAdmin(userDetails);
        
        Pageable pageable = PageRequest.of(page - 1, limit);
        Page<UserAccessLog> logPage;

        if (email != null && !email.isEmpty()) {
            logPage = userAccessLogRepository.findByEmailContaining(email, pageable);
        } else if (ipAddress != null && !ipAddress.isEmpty()) {
            logPage = userAccessLogRepository.findByIpAddressContaining(ipAddress, pageable);
        } else if (deviceOS != null && !deviceOS.isEmpty()) {
            logPage = userAccessLogRepository.findByDeviceOS(deviceOS, pageable);
        } else if (actionType != null && !actionType.isEmpty()) {
            logPage = userAccessLogRepository.findByActionType(actionType, pageable);
        } else {
            logPage = userAccessLogRepository.findAll(pageable);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("logs", logPage.getContent());
        response.put("total", logPage.getTotalElements());
        response.put("page", page);
        response.put("totalPages", logPage.getTotalPages());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/compliance/admin-actions")
    public ResponseEntity<Map<String, Object>> getAdminActions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(name = "adminEmail", required = false) String adminEmail,
            @RequestParam(name = "actionType", required = false) String actionType,
            @RequestParam(name = "targetType", required = false) String targetType,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "limit", defaultValue = "50") int limit) {
        User admin = validateAdmin(userDetails);
        
        Pageable pageable = PageRequest.of(page - 1, limit);
        Page<AdminActionLog> logPage;

        if (adminEmail != null && !adminEmail.isEmpty()) {
            logPage = adminActionLogRepository.findByAdminEmailContaining(adminEmail, pageable);
        } else if (actionType != null && !actionType.isEmpty()) {
            logPage = adminActionLogRepository.findByActionType(actionType, pageable);
        } else if (targetType != null && !targetType.isEmpty()) {
            logPage = adminActionLogRepository.findByTargetType(targetType, pageable);
        } else {
            logPage = adminActionLogRepository.findAll(pageable);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("logs", logPage.getContent());
        response.put("total", logPage.getTotalElements());
        response.put("page", page);
        response.put("totalPages", logPage.getTotalPages());

        return ResponseEntity.ok(response);
    }
}
