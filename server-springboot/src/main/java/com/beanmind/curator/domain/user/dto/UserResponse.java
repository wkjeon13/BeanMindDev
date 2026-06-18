package com.beanmind.curator.domain.user.dto;

import com.beanmind.curator.domain.user.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private String id;
    private String email;
    private String nickname;
    private String role;
    private String phone;
    private String profileImageUrl;
    private String status;
    private String loginType;
    private String ageGroup;
    private String favoriteCafe;
    private String gender;
    private Integer pointBalance;
    private String bio;
    private Boolean isPublicProfile;
    private Double prefAcidity;
    private Double prefSweetness;
    private Double prefBody;
    private Double prefBitterness;
    private String prefAroma;
    private String equippedBadge;
    private String earnedBadges;
    private String countryCode;
    private String preferredLanguage;
    private String bioMediaUrls;
    private String interests;
    private Integer aiPrescriptionLimit;
    private Integer aiUsageCount;
    private Object homeLayout;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static UserResponse from(User user) {
        Object parsedLayout = null;
        if (user.getHomeLayout() != null && !user.getHomeLayout().trim().isEmpty()) {
            try {
                ObjectMapper mapper = new ObjectMapper();
                parsedLayout = mapper.readTree(user.getHomeLayout());
            } catch (Exception e) {
                // Ignore parsing errors and keep it null
            }
        }

        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .role(user.getRole().name())
                .phone(user.getPhone())
                .profileImageUrl(user.getProfileImageUrl())
                .status(user.getStatus())
                .loginType(user.getLoginType())
                .ageGroup(user.getAgeGroup())
                .favoriteCafe(user.getFavoriteCafe())
                .gender(user.getGender())
                .pointBalance(user.getPointBalance())
                .bio(user.getBio())
                .isPublicProfile(user.getIsPublicProfile())
                .prefAcidity(user.getPrefAcidity())
                .prefSweetness(user.getPrefSweetness())
                .prefBody(user.getPrefBody())
                .prefBitterness(user.getPrefBitterness())
                .prefAroma(user.getPrefAroma())
                .equippedBadge(user.getEquippedBadge())
                .earnedBadges(user.getEarnedBadges())
                .countryCode(user.getCountryCode())
                .preferredLanguage(user.getPreferredLanguage())
                .bioMediaUrls(user.getBioMediaUrls())
                .interests(user.getInterests())
                .aiPrescriptionLimit(user.getAiPrescriptionLimit())
                .aiUsageCount(user.getAiUsageCount())
                .homeLayout(parsedLayout)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}

