package com.beanmind.curator.domain.admin.service;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.common.service.ContentFilterService;
import com.beanmind.curator.common.service.GeminiService;
import com.beanmind.curator.common.service.MailService;
import com.beanmind.curator.domain.ad.entity.AdInquiry;
import com.beanmind.curator.domain.ad.repository.AdInquiryRepository;
import com.beanmind.curator.domain.admin.entity.*;
import com.beanmind.curator.domain.admin.repository.*;
import com.beanmind.curator.domain.point.entity.PointTransaction;
import com.beanmind.curator.domain.point.entity.PaymentTransaction;
import com.beanmind.curator.domain.point.repository.PointTransactionRepository;
import com.beanmind.curator.domain.point.repository.PaymentTransactionRepository;
import com.beanmind.curator.domain.post.entity.BannedWord;
import com.beanmind.curator.domain.post.entity.Comment;
import com.beanmind.curator.domain.post.entity.Post;
import com.beanmind.curator.domain.post.repository.BannedWordRepository;
import com.beanmind.curator.domain.post.repository.CommentRepository;
import com.beanmind.curator.domain.post.repository.PostRepository;
import com.beanmind.curator.domain.store.entity.Store;
import com.beanmind.curator.domain.store.repository.StoreRepository;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final BannedWordRepository bannedWordRepository;
    private final TodayPairingRepository todayPairingRepository;
    private final TodayPairingTranslationRepository todayPairingTranslationRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final LegalPolicyRepository legalPolicyRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final AdInquiryRepository adInquiryRepository;
    private final AdminActionLogRepository adminActionLogRepository;
    
    private final ContentFilterService contentFilterService;
    private final MailService mailService;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    @Transactional
    public void logAdminAction(String adminId, String adminEmail, String adminRole, String actionType, String targetType, String targetId, String details, String ipAddress) {
        AdminActionLog log = AdminActionLog.builder()
                .id(UUID.randomUUID().toString())
                .adminId(adminId)
                .adminEmail(adminEmail)
                .adminRole(adminRole)
                .actionType(actionType)
                .targetType(targetType)
                .targetId(targetId)
                .details(details)
                .ipAddress(ipAddress)
                .createdAt(LocalDateTime.now())
                .build();
        adminActionLogRepository.save(log);
    }

    /**
     * Store Status Update (Approve / Reject)
     */
    @Transactional
    public Store updateShopStatus(String storeId, String status, String rejectionReason) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));

        if (!Arrays.asList("PENDING", "APPROVED", "REJECTED").contains(status)) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }

        store.setStatus(status);
        if ("REJECTED".equalsIgnoreCase(status) && rejectionReason != null) {
            store.setRejectionReason(rejectionReason);
        } else {
            store.setRejectionReason(null);
        }

        Store savedStore = storeRepository.save(store);

        // Approval Email Notification
        if ("APPROVED".equalsIgnoreCase(status) && store.getOwner() != null && store.getOwner().getEmail() != null) {
            try {
                // For simplicity, directly send approval mail or lookup dynamic templates
                String ownerName = store.getOwner().getNickname() != null ? store.getOwner().getNickname() : "회원";
                String subject = String.format("[Beanmind] '%s' 매장의 입점 신청이 승인되었습니다!", store.getName());
                String body = String.format(
                        "안녕하세요, %s 호스트님!\n" +
                        "요청하신 매장 '%s'의 입점 신청이 내부 심사를 거쳐 최종 승인되었습니다.\n" +
                        "이제 앱에서 매장 정보 및 메뉴 관리를 시작하실 수 있습니다.", ownerName, store.getName());
                mailService.sendAdminAnnouncement(store.getOwner().getEmail(), subject, body);
            } catch (Exception e) {
                System.err.println("Failed to send approval email: " + e.getMessage());
            }
        }

        return savedStore;
    }

    /**
     * Delete inappropriate post or comment
     */
    @Transactional
    public void deleteContent(String type, String id, String reason, String adminEmail) {
        if ("POST".equalsIgnoreCase(type)) {
            Post post = postRepository.findById(id)
                    .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));

            post.setIsDeleted(true);
            post.setDeletedAt(LocalDateTime.now());
            post.setDeletedBy(adminEmail);
            post.setDeleteReason(reason);
            postRepository.save(post);

            if (post.getAuthor() != null && post.getAuthor().getEmail() != null) {
                String subject = "[Beanmind] 작성하신 게시글이 게시 규정 위반으로 인해 삭제되었습니다.";
                String body = String.format(
                        "안녕하세요, Beanmind 커뮤니티 관리자입니다.\n" +
                        "회원님께서 작성하신 게시글이 서비스 규정 위반으로 판단되어 삭제 처리되었습니다.\n\n" +
                        "삭제 사유: %s\n\n" +
                        "관련 문의 사항은 고객센터로 연락해주시기 바랍니다.", reason);
                mailService.sendAdminAnnouncement(post.getAuthor().getEmail(), subject, body);
            }
        } else if ("COMMENT".equalsIgnoreCase(type)) {
            Comment comment = commentRepository.findById(id)
                    .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));

            comment.setIsDeleted(true);
            comment.setDeletedAt(LocalDateTime.now());
            comment.setDeletedBy(adminEmail);
            comment.setDeleteReason(reason);
            commentRepository.save(comment);

            if (comment.getAuthor() != null && comment.getAuthor().getEmail() != null) {
                String subject = "[Beanmind] 작성하신 댓글이 게시 규정 위반으로 인해 삭제되었습니다.";
                String body = String.format(
                        "안녕하세요, Beanmind 커뮤니티 관리자입니다.\n" +
                        "회원님께서 작성하신 댓글이 서비스 규정 위반으로 판단되어 삭제 처리되었습니다.\n\n" +
                        "삭제 사유: %s\n\n" +
                        "관련 문의 사항은 고객센터로 연락해주시기 바랍니다.", reason);
                mailService.sendAdminAnnouncement(comment.getAuthor().getEmail(), subject, body);
            }
        } else {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }

    /**
     * Restore inappropriate post or comment
     */
    @Transactional
    public void restoreContent(String type, String id) {
        if ("POST".equalsIgnoreCase(type)) {
            Post post = postRepository.findById(id)
                    .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));

            post.setIsDeleted(false);
            post.setDeletedAt(null);
            post.setDeletedBy(null);
            post.setDeleteReason(null);
            postRepository.save(post);
        } else if ("COMMENT".equalsIgnoreCase(type)) {
            Comment comment = commentRepository.findById(id)
                    .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));

            comment.setIsDeleted(false);
            comment.setDeletedAt(null);
            comment.setDeletedBy(null);
            comment.setDeleteReason(null);
            commentRepository.save(comment);
        } else {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }

    /**
     * Banned Word management
     */
    @Transactional
    public BannedWord createBannedWord(String word, String category, String locale) {
        if (bannedWordRepository.findByWord(word).isPresent()) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }

        BannedWord newWord = BannedWord.builder()
                .id(UUID.randomUUID().toString())
                .word(word)
                .category(category != null ? category : "PROFANITY")
                .locale(locale != null ? locale : "ko")
                .createdAt(LocalDateTime.now())
                .build();

        BannedWord saved = bannedWordRepository.save(newWord);
        contentFilterService.reload();
        return saved;
    }

    @Transactional
    public void deleteBannedWord(String id) {
        bannedWordRepository.deleteById(id);
        contentFilterService.reload();
    }

    /**
     * Pair combinations translation using Gemini
     */
    public Mono<String> translatePairing(Map<String, String> body) {
        String name = body.get("name");
        String coffee = body.get("coffee");
        String desc = body.get("desc");
        String season = body.get("season");
        String tasteProfile = body.get("tasteProfile");

        if (name == null || coffee == null) {
            return Mono.error(new CustomException(ErrorCode.BAD_REQUEST));
        }

        String prompt = String.format(
            "You are a professional culinary translator specialized in coffee and dessert pairings.\n" +
            "Translate the following pairing details from Korean to English, Japanese, and Simplified Chinese.\n\n" +
            "Korean Input:\n" +
            "Dessert Name: %s\n" +
            "Matching Coffee: %s\n" +
            "Description: %s\n" +
            "Season: %s\n" +
            "Taste Profile: %s\n\n" +
            "Return the response EXACTLY in the following JSON format without any markdown blocks or backticks:\n" +
            "{\n" +
            "  \"en\": { \"name\": \"\", \"coffee\": \"\", \"desc\": \"\", \"season\": \"\", \"tasteProfile\": \"\" },\n" +
            "  \"ja\": { \"name\": \"\", \"coffee\": \"\", \"desc\": \"\", \"season\": \"\", \"tasteProfile\": \"\" },\n" +
            "  \"zh\": { \"name\": \"\", \"coffee\": \"\", \"desc\": \"\", \"season\": \"\", \"tasteProfile\": \"\" }\n" +
            "}",
            name, coffee, desc != null ? desc : "", season != null ? season : "", tasteProfile != null ? tasteProfile : ""
        );

        return geminiService.generateContent("gemini-2.5-flash", prompt, 0.2, "application/json", false)
                .map(this::cleanJsonText);
    }

    /**
     * Cancel/Refund payment and revoke pointBalance
     */
    @Transactional
    public Map<String, Object> cancelPayment(String transactionId, boolean force, String reason) {
        PaymentTransaction payment = paymentTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new CustomException(ErrorCode.BAD_REQUEST));

        // Check if already cancelled
        Optional<PointTransaction> existingCancel = pointTransactionRepository.findFirstByDescriptionContaining("ID: " + transactionId);
        if (existingCancel.isPresent()) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }

        int cancelAmount = payment.getAmount();
        User user = payment.getUser();

        if (!force && user.getPointBalance() < cancelAmount) {
            Map<String, Object> errorDetails = new HashMap<>();
            errorDetails.put("error", "INSUFFICIENT_BALANCE_FOR_CANCEL");
            errorDetails.put("message", String.format("회원의 현재 커피콩 잔액(%d개)이 회수할 수량(%d개)보다 부족합니다. 강제 진행 옵션을 켜주세요.", user.getPointBalance(), cancelAmount));
            return errorDetails;
        }

        // Deduct points
        user.setPointBalance(user.getPointBalance() - cancelAmount);
        userRepository.save(user);

        // Record PointTransaction logs
        String cancelReason = reason != null ? reason : "관리자 결제 취소 강제 회수";
        PointTransaction pointTx = PointTransaction.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .amount(-cancelAmount)
                .type("CHARGE_CANCEL")
                .description(String.format("결제 취소 회수 [사유: %s] (ID: %s)", cancelReason, transactionId))
                .createdAt(LocalDateTime.now())
                .build();
        pointTransactionRepository.save(pointTx);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("balance", user.getPointBalance());

        return result;
    }

    private String cleanJsonText(String text) {
        if (text == null) return "{}";
        String cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }
}
