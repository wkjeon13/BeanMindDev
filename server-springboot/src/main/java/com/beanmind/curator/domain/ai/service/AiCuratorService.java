package com.beanmind.curator.domain.ai.service;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.domain.point.entity.PointTransaction;
import com.beanmind.curator.domain.point.repository.PointTransactionRepository;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiCuratorService {

    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final CurationJobManager curationJobManager;

    @Transactional(readOnly = true)
    public Map<String, Object> verifyCost(String email) {
        Map<String, Object> response = new HashMap<>();
        if (email == null) {
            response.put("eligible", true);
            response.put("type", "anonymous");
            return response;
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        boolean canUseFree = user.getAiUsageCount() < user.getAiPrescriptionLimit();
        boolean hasEnoughPoints = user.getPointBalance() >= 100;

        if (!canUseFree && !hasEnoughPoints) {
            throw new CustomException(ErrorCode.INSUFFICIENT_BEANS);
        }

        response.put("eligible", true);
        response.put("type", "authenticated");
        return response;
    }

    @Transactional
    public String generatePrescription(String email, Map<String, Object> payload) {
        if (email != null) {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

            boolean canUseFree = user.getAiUsageCount() < user.getAiPrescriptionLimit();
            boolean hasEnoughPoints = user.getPointBalance() >= 100;

            if (!canUseFree && !hasEnoughPoints) {
                throw new CustomException(ErrorCode.INSUFFICIENT_BEANS);
            }

            if (canUseFree) {
                user.setAiUsageCount(user.getAiUsageCount() + 1);
            } else {
                user.setPointBalance(user.getPointBalance() - 100);
                
                PointTransaction pointTx = PointTransaction.builder()
                        .id(java.util.UUID.randomUUID().toString())
                        .user(user)
                        .amount(-100)
                        .type("SPEND")
                        .description("AI 커피 맞춤 큐레이션 (Premium)")
                        .build();
                pointTransactionRepository.save(pointTx);
            }
            userRepository.save(user);

            // User Demographics into Payload
            payload.put("userId", user.getId());
            payload.put("userAgeGroup", user.getAgeGroup() != null ? user.getAgeGroup() : "Unknown");
            payload.put("userGender", user.getGender() != null ? user.getGender() : "Unknown");
            payload.put("userFavCafe", user.getFavoriteCafe() != null ? user.getFavoriteCafe() : "Unknown");
        } else {
            payload.put("userAgeGroup", "Unknown");
            payload.put("userGender", "Unknown");
            payload.put("userFavCafe", "Unknown");
        }

        String jobId = curationJobManager.createJob();
        curationJobManager.runCurationJob(jobId, payload);
        return jobId;
    }
}
