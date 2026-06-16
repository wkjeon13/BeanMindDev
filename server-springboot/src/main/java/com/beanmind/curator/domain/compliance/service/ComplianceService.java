package com.beanmind.curator.domain.compliance.service;

import com.beanmind.curator.domain.admin.entity.ComplianceRequestLog;
import com.beanmind.curator.domain.admin.entity.LegalPolicy;
import com.beanmind.curator.domain.admin.repository.ComplianceRequestLogRepository;
import com.beanmind.curator.domain.admin.repository.LegalPolicyRepository;
import com.beanmind.curator.domain.ai.repository.PrescriptionRepository;
import com.beanmind.curator.domain.club.repository.ClubRepository;
import com.beanmind.curator.domain.post.repository.CommentRepository;
import com.beanmind.curator.domain.post.repository.PostRepository;
import com.beanmind.curator.domain.store.repository.BookmarkRepository;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.TastingNoteRepository;
import com.beanmind.curator.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ComplianceService {

    private final LegalPolicyRepository legalPolicyRepository;
    private final ComplianceRequestLogRepository complianceRequestLogRepository;
    private final UserRepository userRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final BookmarkRepository bookmarkRepository;
    private final ClubRepository clubRepository;
    private final TastingNoteRepository tastingNoteRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getActivePolicies() {
        Optional<LegalPolicy> termsOpt = legalPolicyRepository.findByPolicyTypeAndIsActiveTrue("TERMS_OF_SERVICE");
        Optional<LegalPolicy> privacyOpt = legalPolicyRepository.findByPolicyTypeAndIsActiveTrue("PRIVACY_POLICY");

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("terms", termsOpt.map(p -> Map.of(
                "id", p.getId(),
                "version", p.getVersion(),
                "title", p.getTitle(),
                "content", p.getContent(),
                "updatedAt", p.getUpdatedAt()
        )).orElse(null));
        response.put("privacy", privacyOpt.map(p -> Map.of(
                "id", p.getId(),
                "version", p.getVersion(),
                "title", p.getTitle(),
                "content", p.getContent(),
                "updatedAt", p.getUpdatedAt()
        )).orElse(null));

        return response;
    }

    @Transactional
    public Map<String, Object> submitRequest(String requestEmail, String requestType, String userId) {
        if (!Arrays.asList("ACCESS", "DELETE", "OPT_OUT").contains(requestType)) {
            throw new IllegalArgumentException("INVALID_DATA_FORMAT");
        }

        ComplianceRequestLog requestLog = ComplianceRequestLog.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .requestEmail(requestEmail)
                .requestType(requestType)
                .status("PENDING")
                .build();

        complianceRequestLogRepository.save(requestLog);

        return Map.of(
                "success", true,
                "message", "Your privacy request has been submitted successfully.",
                "requestId", requestLog.getId()
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMyData(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("USER_NOT_FOUND"));

        long prescriptionCount = prescriptionRepository.countByUserId(user.getId());
        long postCount = postRepository.countByAuthorId(user.getId());
        long commentCount = commentRepository.countByAuthorId(user.getId());
        long bookmarkCount = bookmarkRepository.countByUserId(user.getId());
        long clubCount = clubRepository.countByOwnerId(user.getId());
        long tastingNoteCount = tastingNoteRepository.countByUserId(user.getId());

        Map<String, Object> personalData = new HashMap<>();
        personalData.put("exportMeta", Map.of(
                "exportedAt", LocalDateTime.now().toString(),
                "description", "This is your personal data report requested under data protection regulations (GDPR / CCPA)."
        ));
        personalData.put("accountInfo", Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "nickname", user.getNickname(),
                "role", user.getRole().name(),
                "status", user.getStatus(),
                "loginType", user.getLoginType(),
                "createdAt", user.getCreatedAt().toString(),
                "updatedAt", user.getUpdatedAt().toString(),
                "preferredLanguage", user.getPreferredLanguage(),
                "countryCode", user.getCountryCode()
        ));
        personalData.put("profileDetails", Map.of(
                "ageGroup", user.getAgeGroup() != null ? user.getAgeGroup() : "",
                "gender", user.getGender() != null ? user.getGender() : "",
                "favoriteCafe", user.getFavoriteCafe() != null ? user.getFavoriteCafe() : "",
                "pointBalance", user.getPointBalance(),
                "equippedBadge", user.getEquippedBadge() != null ? user.getEquippedBadge() : "",
                "earnedBadges", user.getEarnedBadges() != null ? Arrays.asList(user.getEarnedBadges().split(",")) : Collections.emptyList()
        ));
        personalData.put("tastePreferences", Map.of(
                "prefAcidity", user.getPrefAcidity() != null ? user.getPrefAcidity() : 0.0,
                "prefSweetness", user.getPrefSweetness() != null ? user.getPrefSweetness() : 0.0,
                "prefBody", user.getPrefBody() != null ? user.getPrefBody() : 0.0,
                "prefBitterness", user.getPrefBitterness() != null ? user.getPrefBitterness() : 0.0,
                "prefAroma", user.getPrefAroma() != null ? user.getPrefAroma() : ""
        ));
        personalData.put("statistics", Map.of(
                "totalPrescriptions", prescriptionCount,
                "totalPosts", postCount,
                "totalComments", commentCount,
                "totalBookmarks", bookmarkCount,
                "totalOwnedClubs", clubCount,
                "totalTastingNotes", tastingNoteCount
        ));

        return Map.of("success", true, "data", personalData);
    }
}
