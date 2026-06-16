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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    @Value("${naver.client.id}")
    private String naverClientId;

    @Value("${naver.client.secret}")
    private String naverClientSecret;

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

    @Transactional
    public String getNaverTokenAndRedirect(String code, String state, String error, String errorDescription) {
        String webOrigin = "https://www.beanmindcurator.com";
        boolean isWeb = state != null && state.startsWith("web_");
        if (isWeb) {
            try {
                String[] parts = state.split("_");
                if (parts.length >= 3) {
                    String b64 = parts[1];
                    // Base64 padding
                    while (b64.length() % 4 != 0) {
                        b64 += "=";
                    }
                    byte[] decoded = Base64.getDecoder().decode(b64);
                    webOrigin = new String(decoded, StandardCharsets.UTF_8);
                }
            } catch (Exception e) {
                log.error("Failed to decode origin from state", e);
            }
        }

        if (error != null) {
            log.error("Naver OAuth error: {}, {}", error, errorDescription);
            String desc = errorDescription != null ? errorDescription : "naver_oauth_error";
            String redirectUrl = isWeb 
                    ? webOrigin + "/profile#naver_error=" + desc
                    : "capcurator://naver-login?error=" + desc;
            return buildRedirectHtml("Naver Login Error", redirectUrl);
        }

        if (code == null) {
            return "No code provided by Naver.";
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            // 1. Get Access Token
            String tokenUrl = String.format("https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=%s&client_secret=%s&code=%s&state=%s",
                    naverClientId, naverClientSecret, code, state);
            
            Map<String, Object> tokenData = restTemplate.getForObject(tokenUrl, Map.class);
            if (tokenData == null || tokenData.containsKey("error")) {
                log.error("Naver token error: {}", tokenData);
                return "Failed to retrieve token from Naver.";
            }

            String accessToken = (String) tokenData.get("access_token");

            // 2. Get User Profile
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + accessToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> profileResponse = restTemplate.exchange(
                    "https://openapi.naver.com/v1/nid/me",
                    HttpMethod.GET,
                    entity,
                    Map.class
            );

            Map<String, Object> profileData = profileResponse.getBody();
            if (profileData == null || !"00".equals(profileData.get("resultcode"))) {
                log.error("Naver profile error: {}", profileData);
                return "Failed to retrieve user profile from Naver.";
            }

            Map<String, Object> responseMap = (Map<String, Object>) profileData.get("response");
            String id = (String) responseMap.get("id");
            String email = (String) responseMap.get("email");
            String name = (String) responseMap.get("name");
            String nickname = (String) responseMap.get("nickname");
            String profileImage = (String) responseMap.get("profile_image");
            String gender = (String) responseMap.get("gender");
            String age = (String) responseMap.get("age");

            String parsedAgeGroup = age != null ? age.split("-")[0] + "s" : null;
            String parsedGender = "M".equals(gender) ? "MALE" : ("F".equals(gender) ? "FEMALE" : null);

            // Check if user exists
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (!userOpt.isPresent() && id != null) {
                userOpt = userRepository.findBySocialId(id);
            }

            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (user.getSocialId() != null && !user.getSocialId().equals(id) && !"NAVER".equals(user.getLoginType())) {
                    String redirectUrl = isWeb
                            ? webOrigin + "/profile#naver_error=email_in_use_by_" + user.getLoginType().toLowerCase()
                            : "capcurator://naver-login?error=email_in_use_by_" + user.getLoginType().toLowerCase();
                    return buildRedirectHtml("Naver Login Error", redirectUrl);
                }

                if (user.getSocialId() == null && user.getEmail().equals(email)) {
                    user.setSocialId(id);
                    user.setLoginType("NAVER");
                    user.setIsEmailVerified(true);
                    userRepository.save(user);
                }

                String jwtToken = jwtTokenProvider.createToken(user.getEmail(), user.getRole().name());
                String redirectUrl = isWeb
                        ? webOrigin + "/profile#jwt_token=" + jwtToken
                        : "capcurator://naver-login?token=" + jwtToken;
                return buildRedirectHtml("Naver Login Success", redirectUrl);

            } else {
                Map<String, Object> tempUser = Map.of(
                        "naverId", id != null ? id : "",
                        "email", email != null ? email : "",
                        "name", nickname != null ? nickname : (name != null ? name : ""),
                        "profileImageUrl", profileImage != null ? profileImage : "",
                        "gender", parsedGender != null ? parsedGender : "",
                        "ageGroup", parsedAgeGroup != null ? parsedAgeGroup : ""
                );

                String userJsonString = objectMapper.writeValueAsString(tempUser);
                String encodedUser = URLEncoder.encode(userJsonString, StandardCharsets.UTF_8);
                String redirectUrl = isWeb
                        ? webOrigin + "/profile#naver_user=" + encodedUser
                        : "capcurator://naver-login?user=" + encodedUser;
                return buildRedirectHtml("Naver Login Registration", redirectUrl);
            }

        } catch (Exception e) {
            log.error("Naver callback processing exception", e);
            return "Internal Server Error during Naver Callback";
        }
    }

    private String buildRedirectHtml(String title, String redirectUrl) {
        return String.format(
                "<!DOCTYPE html><html><head><title>%s</title></head>" +
                "<body><script>window.location.href = \"%s\";</script></body></html>",
                title, redirectUrl
        );
    }

    @Transactional
    public AuthResponse registerNaver(NaverRegisterRequest request, String ipAddress) {
        if (request.getNaverId() == null || request.getRole() == null) {
            throw new CustomException(ErrorCode.BAD_REQUEST, "MISSING_REQUIRED_FIELDS");
        }

        String email = request.getEmail();
        if (email == null || email.trim().isEmpty()) {
            email = request.getNaverId() + "@naver.user.local";
        }
        email = email.trim().toLowerCase();

        Optional<User> existingUserOpt = userRepository.findByEmail(email);
        if (existingUserOpt.isPresent()) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        Map<String, Object> welcomePolicy = getRegistrationWelcomePolicy();
        int welcomeBeans = ((Number) welcomePolicy.getOrDefault("welcomeBeans", 0)).intValue();
        int welcomePrescriptions = ((Number) welcomePolicy.getOrDefault("welcomeFreePrescriptions", 3)).intValue();

        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .email(email)
                .nickname(request.getName() != null ? request.getName() : "Naver User")
                .loginType("NAVER")
                .socialId(request.getNaverId())
                .profileImageUrl(request.getProfileImageUrl())
                .isEmailVerified(true)
                .role("OWNER".equalsIgnoreCase(request.getRole()) ? Role.OWNER : Role.USER)
                .ageGroup(request.getAgeGroup())
                .gender(request.getGender())
                .favoriteCafe(request.getFavoriteCafe())
                .countryCode(request.getCountryCode() != null ? request.getCountryCode() : "KR")
                .preferredLanguage(request.getPreferredLanguage() != null ? request.getPreferredLanguage() : "ko")
                .aiPrescriptionLimit(welcomePrescriptions)
                .pointBalance(welcomeBeans)
                .build();

        userRepository.save(user);

        // Consent histories
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
            log.error("Failed to log consent history in naver register", e);
        }

        String token = jwtTokenProvider.createToken(user.getEmail(), user.getRole().name());

        return AuthResponse.builder()
                .message("Naver register successful!")
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
