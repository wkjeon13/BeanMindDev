package com.beanmind.curator.domain.user.service;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.domain.store.repository.StoreRepository;
import com.beanmind.curator.domain.user.dto.*;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
    );

    private boolean isComplexPassword(String password) {
        return PASSWORD_PATTERN.matcher(password).matches();
    }

    @Transactional(readOnly = true)
    public UserResponse getUserProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateNickname(String email, NicknameRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        user.setNickname(request.getNickname().trim());
        userRepository.save(user);
        return UserResponse.from(user);
    }

    @Transactional
    public void updatePassword(String email, PasswordChangeRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (user.getPassword() == null) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_CANT_CHANGE_PW);
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new CustomException(ErrorCode.PASSWORD_MISMATCH);
        }

        if (!isComplexPassword(request.getNewPassword())) {
            throw new CustomException(ErrorCode.PASSWORD_INVALID);
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new CustomException(ErrorCode.PASSWORD_SAME_AS_OLD);
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional
    public UserResponse updateLanguage(String email, LanguageRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        user.setPreferredLanguage(request.getPreferredLanguage().trim());
        userRepository.save(user);
        return UserResponse.from(user);
    }

    @Transactional
    public void deleteAccount(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        String userId = user.getId();
        user.setStatus("DELETED");
        user.setEmail("deleted_" + userId + "@beanmind.com");
        user.setNickname("탈퇴한 회원");
        user.setPassword(null);
        user.setPhone(null);
        user.setSocialId(null);
        user.setProfileImageUrl(null);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setBio(null);
        user.setFcmToken(null);
        user.setPrefAcidity(null);
        user.setPrefSweetness(null);
        user.setPrefBody(null);
        user.setPrefBitterness(null);
        user.setInterests(null);

        userRepository.save(user);
    }

    @Transactional
    public UserResponse updateTaste(String email, TasteRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        user.setPrefAcidity(request.getPrefAcidity());
        user.setPrefSweetness(request.getPrefSweetness());
        user.setPrefBody(request.getPrefBody());
        user.setPrefBitterness(request.getPrefBitterness());
        user.setPrefAroma(request.getPrefAroma());

        userRepository.save(user);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateProfileImage(String email, ProfileImageRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        String base64Data = request.getProfileImageUrl();
        String finalImageUrl = base64Data;

        // base64 size check (max ~3MB)
        if (base64Data.length() > 3 * 1024 * 1024) {
            throw new IllegalArgumentException("Payload Too Large. Please upload a smaller image.");
        }

        if (base64Data.startsWith("data:image")) {
            try {
                // Parse base64 header
                String mimeType = "image/jpeg";
                String extension = "jpg";
                if (base64Data.contains("image/png")) {
                    mimeType = "image/png";
                    extension = "png";
                } else if (base64Data.contains("image/webp")) {
                    mimeType = "image/webp";
                    extension = "webp";
                } else if (base64Data.contains("image/gif")) {
                    mimeType = "image/gif";
                    extension = "gif";
                }

                String rawBase64 = base64Data.substring(base64Data.indexOf(",") + 1);
                byte[] decodedBytes = Base64.getDecoder().decode(rawBase64);

                String fileName = "profile_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 1000) + "." + extension;
                
                // Target: parent directory uploads/users/{userId}/profile
                // Spring Boot runs under server-springboot, so project root is ../
                String relativePath = "uploads/users/" + user.getId() + "/profile";
                String absoluteDirPath = "../" + relativePath;
                
                Files.createDirectories(Paths.get(absoluteDirPath));

                File targetFile = new File(absoluteDirPath, fileName);
                try (FileOutputStream fos = new FileOutputStream(targetFile)) {
                    fos.write(decodedBytes);
                }

                finalImageUrl = "/uploads/users/" + user.getId() + "/profile/" + fileName;
                log.info("Profile image saved successfully to disk: {}", finalImageUrl);

            } catch (IOException e) {
                log.error("Failed to decode and save base64 image", e);
                throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "이미지 저장에 실패했습니다.");
            }
        }

        user.setProfileImageUrl(finalImageUrl);
        userRepository.save(user);

        // Sync linked stores
        int affectedStores = storeRepository.updateStoreImagesByOwnerId(user.getId(), finalImageUrl);
        log.info("Updated {} linked store images with new owner profile thumbnail.", affectedStores);

        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public RewardTiersDto getRewardTiers(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        return RewardTiersDto.fromEntity(user);
    }

    @Transactional
    public RewardTiersDto updateRewardTiers(String email, RewardTiersDto dto) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        user.setRewardTier1Name(dto.getRewardTier1Name().trim());
        user.setRewardTier1Amount(dto.getRewardTier1Amount());
        user.setRewardTier2Name(dto.getRewardTier2Name().trim());
        user.setRewardTier2Amount(dto.getRewardTier2Amount());
        user.setRewardTier3Name(dto.getRewardTier3Name().trim());
        user.setRewardTier3Amount(dto.getRewardTier3Amount());

        userRepository.save(user);
        return RewardTiersDto.fromEntity(user);
    }

    @Transactional
    public UserResponse updateHomeLayout(String email, HomeLayoutRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        try {
            ObjectMapper mapper = new ObjectMapper();
            String jsonLayout = mapper.writeValueAsString(request.getLayout());
            user.setHomeLayout(jsonLayout);
        } catch (Exception e) {
            log.error("Failed to serialize home layout to JSON string", e);
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "레이아웃 저장에 실패했습니다.");
        }

        userRepository.save(user);
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public AiEligibilityDto checkAiEligibility(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        int prescriptionCost = 100;
        try {
            File file = new File("data/policy.json");
            if (file.exists()) {
                java.util.Map policy = objectMapper.readValue(file, java.util.Map.class);
                if (policy != null && policy.containsKey("prescriptionCost")) {
                    prescriptionCost = Integer.parseInt(policy.get("prescriptionCost").toString());
                }
            }
        } catch (Exception e) {
            log.error("Failed to read point policy file", e);
        }

        boolean canUseFree = user.getAiUsageCount() < user.getAiPrescriptionLimit();
        boolean hasEnoughPoints = user.getPointBalance() >= prescriptionCost;

        if (!canUseFree && !hasEnoughPoints) {
            return AiEligibilityDto.builder()
                    .eligible(false)
                    .cost(prescriptionCost)
                    .current(user.getAiUsageCount())
                    .limit(user.getAiPrescriptionLimit())
                    .pointBalance(user.getPointBalance())
                    .error("INSUFFICIENT_BEANS")
                    .build();
        }

        return AiEligibilityDto.builder()
                .eligible(true)
                .cost(prescriptionCost)
                .current(user.getAiUsageCount())
                .limit(user.getAiPrescriptionLimit())
                .pointBalance(user.getPointBalance())
                .build();
    }
}

