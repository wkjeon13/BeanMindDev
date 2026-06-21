package com.beanmind.curator.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "User")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(nullable = false, unique = true)
    private String email;

    private String password;

    @Column(nullable = false)
    private String nickname;

    @Column(columnDefinition = "TEXT")
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "isEmailVerified", nullable = false)
    @Builder.Default
    private Boolean isEmailVerified = false;

    @Column(name = "verificationCode")
    private String verificationCode;

    @Column(name = "verificationExpires")
    private LocalDateTime verificationExpires;

    @Column(nullable = false)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "loginType", nullable = false)
    @Builder.Default
    private String loginType = "EMAIL";

    @Column(name = "socialId", unique = true)
    private String socialId;

    @Column(name = "profileImageUrl", columnDefinition = "LONGTEXT")
    private String profileImageUrl;

    @Column(name = "failedLoginAttempts", nullable = false)
    @Builder.Default
    private Integer failedLoginAttempts = 0;

    @Column(name = "lockedUntil")
    private LocalDateTime lockedUntil;

    @Column(name = "aiPrescriptionLimit", nullable = false)
    @Builder.Default
    private Integer aiPrescriptionLimit = 3;

    @Column(name = "aiUsageCount", nullable = false)
    @Builder.Default
    private Integer aiUsageCount = 0;

    @Column(name = "ageGroup")
    private String ageGroup;

    @Column(name = "favoriteCafe")
    private String favoriteCafe;

    private String gender;

    @Column(name = "pointBalance", nullable = false)
    @Builder.Default
    private Integer pointBalance = 0;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "isPublicProfile", nullable = false)
    @Builder.Default
    private Boolean isPublicProfile = true;

    @Column(name = "prefAcidity")
    private Double prefAcidity;

    @Column(name = "prefBitterness")
    private Double prefBitterness;

    @Column(name = "prefBody")
    private Double prefBody;

    @Column(name = "prefSweetness")
    private Double prefSweetness;

    @Column(name = "fcmToken", columnDefinition = "TEXT")
    private String fcmToken;

    @Column(name = "equippedBadge")
    private String equippedBadge;

    @Column(name = "earnedBadges", columnDefinition = "TEXT")
    private String earnedBadges;

    @Column(name = "rewardTier1Name", nullable = false)
    @Builder.Default
    private String rewardTier1Name = "참여";

    @Column(name = "rewardTier1Amount", nullable = false)
    @Builder.Default
    private Integer rewardTier1Amount = 10;

    @Column(name = "rewardTier2Name", nullable = false)
    @Builder.Default
    private String rewardTier2Name = "감사";

    @Column(name = "rewardTier2Amount", nullable = false)
    @Builder.Default
    private Integer rewardTier2Amount = 50;

    @Column(name = "rewardTier3Name", nullable = false)
    @Builder.Default
    private String rewardTier3Name = "최고";

    @Column(name = "rewardTier3Amount", nullable = false)
    @Builder.Default
    private Integer rewardTier3Amount = 100;

    @Column(name = "bioMediaUrls", columnDefinition = "LONGTEXT")
    private String bioMediaUrls;

    @Column(name = "prefAroma", columnDefinition = "TEXT")
    private String prefAroma;

    @Column(name = "countryCode", nullable = false)
    @Builder.Default
    private String countryCode = "KR";

    @Column(name = "preferredLanguage", nullable = false)
    @Builder.Default
    private String preferredLanguage = "ko";

    @Column(name = "homeLayout", columnDefinition = "json")
    @JdbcTypeCode(SqlTypes.JSON)
    private String homeLayout; // Handle as String or setup Converter for JSON mapping

    @Column(columnDefinition = "TEXT")
    private String interests;
}
