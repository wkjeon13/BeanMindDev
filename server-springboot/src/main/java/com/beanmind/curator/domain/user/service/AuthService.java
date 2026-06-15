package com.beanmind.curator.domain.user.service;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.common.service.MailService;
import com.beanmind.curator.domain.user.dto.*;
import com.beanmind.curator.domain.user.entity.ConsentHistory;
import com.beanmind.curator.domain.user.entity.Role;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.ConsentHistoryRepository;
import com.beanmind.curator.domain.user.repository.UserRepository;
import com.beanmind.curator.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final ConsentHistoryRepository consentHistoryRepository;
    private final MailService mailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final ObjectMapper objectMapper;

    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
    );

    private String generateOTP() {
        return String.valueOf((int) (100000 + Math.random() * 900000));
    }

    private boolean isComplexPassword(String password) {
        return PASSWORD_PATTERN.matcher(password).matches();
    }

    private Map<String, Object> getRegistrationWelcomePolicy() {
        // Find policy.json in parent domain folder
        File policyFile = new File("../data/policy.json");
        if (!policyFile.exists()) {
            policyFile = new File("data/policy.json");
        }
        
        if (policyFile.exists()) {
            try {
                return objectMapper.readValue(policyFile, Map.class);
            } catch (Exception e) {
                log.error("Failed to read welcome policy.json", e);
            }
        }
        return Map.of("welcomeBeans", 0, "welcomeFreePrescriptions", 3);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, String ipAddress) {
        String email = request.getEmail().trim().toLowerCase();
        
        if (!isComplexPassword(request.getPassword())) {
            throw new CustomException(ErrorCode.PASSWORD_INVALID);
        }

        Optional<User> existingUserOpt = userRepository.findByEmail(email);
        if (existingUserOpt.isPresent()) {
            User existingUser = existingUserOpt.get();
            if (existingUser.getIsEmailVerified()) {
                throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
        }

        boolean isTestAccount = email.endsWith("@example.com") || email.endsWith("@test.com") || email.endsWith("@beanmind.com");
        String hashedPassword = passwordEncoder.encode(request.getPassword());
        String otp = generateOTP();
        LocalDateTime expires = LocalDateTime.now().plusMinutes(5);

        User user;
        if (existingUserOpt.isPresent()) {
            user = existingUserOpt.get();
            user.setPassword(hashedPassword);
            user.setNickname(request.getNickname());
            user.setRole("OWNER".equalsIgnoreCase(request.getRole()) ? Role.OWNER : Role.USER);
            user.setAgeGroup(request.getAgeGroup());
            user.setGender(request.getGender());
            user.setFavoriteCafe(request.getFavoriteCafe());
            user.setCountryCode(request.getCountryCode() != null ? request.getCountryCode() : "KR");
            user.setPreferredLanguage(request.getPreferredLanguage() != null ? request.getPreferredLanguage() : "ko");
            user.setVerificationCode(otp);
            user.setVerificationExpires(expires);
            userRepository.save(user);
        } else {
            Map<String, Object> welcomePolicy = getRegistrationWelcomePolicy();
            int welcomeBeans = ((Number) welcomePolicy.getOrDefault("welcomeBeans", 0)).intValue();
            int welcomePrescriptions = ((Number) welcomePolicy.getOrDefault("welcomeFreePrescriptions", 3)).intValue();

            user = User.builder()
                    .id(UUID.randomUUID().toString())
                    .email(email)
                    .password(hashedPassword)
                    .nickname(request.getNickname())
                    .role("OWNER".equalsIgnoreCase(request.getRole()) ? Role.OWNER : Role.USER)
                    .ageGroup(request.getAgeGroup())
                    .gender(request.getGender())
                    .favoriteCafe(request.getFavoriteCafe())
                    .countryCode(request.getCountryCode() != null ? request.getCountryCode() : "KR")
                    .preferredLanguage(request.getPreferredLanguage() != null ? request.getPreferredLanguage() : "ko")
                    .isEmailVerified(isTestAccount)
                    .verificationCode(otp)
                    .verificationExpires(expires)
                    .aiPrescriptionLimit(welcomePrescriptions)
                    .pointBalance(welcomeBeans)
                    .build();
            userRepository.save(user);
        }

        // Save consent histories
        String privacyVersion = request.getPrivacyPolicyVersion() != null ? request.getPrivacyPolicyVersion() : "v1.0.0";
        String tosVersion = request.getTermsOfServiceVersion() != null ? request.getTermsOfServiceVersion() : "v1.0.0";

        try {
            consentHistoryRepository.save(ConsentHistory.builder()
                    .id(UUID.randomUUID().toString())
                    .user(user)
                    .email(user.getEmail())
                    .policyType("PRIVACY_POLICY")
                    .version(privacyVersion)
                    .isAgreed(true)
                    .ipAddress(ipAddress)
                    .build());

            consentHistoryRepository.save(ConsentHistory.builder()
                    .id(UUID.randomUUID().toString())
                    .user(user)
                    .email(user.getEmail())
                    .policyType("TERMS_OF_SERVICE")
                    .version(tosVersion)
                    .isAgreed(true)
                    .ipAddress(ipAddress)
                    .build());
        } catch (Exception e) {
            log.error("Failed to log consent history in register", e);
        }

        if (isTestAccount) {
            return AuthResponse.builder()
                    .message("Test account registered and automatically verified.")
                    .requiresVerification(false)
                    .email(user.getEmail())
                    .build();
        }

        // Send OTP via SMTP
        mailService.sendVerificationEmail(email, otp, "register");

        return AuthResponse.builder()
                .message("User registered. Please check email for verification code.")
                .requiresVerification(true)
                .email(user.getEmail())
                .developmentOnlyCode(otp) // For test environment convenience
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new CustomException(ErrorCode.ACCOUNT_LOCKED);
        }

        if (user.getPassword() == null) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_CANT_CHANGE_PW);
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            int attempts = user.getFailedLoginAttempts() + 1;
            if (attempts >= 5) {
                user.setLockedUntil(LocalDateTime.now().plusMinutes(15));
                user.setFailedLoginAttempts(attempts);
                userRepository.save(user);
                throw new CustomException(ErrorCode.ACCOUNT_LOCKED);
            } else {
                user.setFailedLoginAttempts(attempts);
                userRepository.save(user);
                throw new CustomException(ErrorCode.LOGIN_FAILED);
            }
        }

        // Reset failed attempts
        if (user.getFailedLoginAttempts() > 0 || user.getLockedUntil() != null) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
        }

        boolean isTestAccount = email.endsWith("@example.com") || email.endsWith("@test.com") || email.endsWith("@beanmind.com");
        if (!user.getIsEmailVerified() && isTestAccount) {
            user.setIsEmailVerified(true);
            userRepository.save(user);
        } else if (!user.getIsEmailVerified()) {
            // Re-generate OTP
            String otp = generateOTP();
            user.setVerificationCode(otp);
            user.setVerificationExpires(LocalDateTime.now().plusMinutes(5));
            userRepository.save(user);

            mailService.sendVerificationEmail(email, otp, "register");

            return AuthResponse.builder()
                    .message("Verification required.")
                    .requiresVerification(true)
                    .email(user.getEmail())
                    .developmentOnlyCode(otp)
                    .build();
        }

        userRepository.save(user);

        // Issue JWT token
        String token = jwtTokenProvider.createToken(user.getEmail(), user.getRole().name());

        return AuthResponse.builder()
                .message("Login successful!")
                .token(token)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .nickname(user.getNickname())
                        .role(user.getRole().name())
                        .profileImageUrl(user.getProfileImageUrl())
                        .ageGroup(user.getAgeGroup())
                        .gender(user.getGender())
                        .favoriteCafe(user.getFavoriteCafe())
                        .preferredLanguage(user.getPreferredLanguage())
                        .build())
                .build();
    }

    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (user.getIsEmailVerified()) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        if (!request.getCode().equals(user.getVerificationCode())) {
            throw new CustomException(ErrorCode.INVALID_VERIFICATION_CODE);
        }

        if (user.getVerificationExpires() == null || LocalDateTime.now().isAfter(user.getVerificationExpires())) {
            throw new CustomException(ErrorCode.INVALID_TOKEN, "만료된 인증 번호입니다.");
        }

        user.setIsEmailVerified(true);
        user.setVerificationCode(null);
        user.setVerificationExpires(null);
        userRepository.save(user);

        String token = jwtTokenProvider.createToken(user.getEmail(), user.getRole().name());

        return AuthResponse.builder()
                .message("Email verified successfully!")
                .token(token)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .nickname(user.getNickname())
                        .role(user.getRole().name())
                        .profileImageUrl(user.getProfileImageUrl())
                        .ageGroup(user.getAgeGroup())
                        .gender(user.getGender())
                        .favoriteCafe(user.getFavoriteCafe())
                        .preferredLanguage(user.getPreferredLanguage())
                        .build())
                .build();
    }
}
