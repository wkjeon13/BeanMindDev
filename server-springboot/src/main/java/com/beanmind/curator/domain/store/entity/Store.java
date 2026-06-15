package com.beanmind.curator.domain.store.entity;

import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "Store")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Store {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ownerId", nullable = false)
    private User owner;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String address;

    @Column(columnDefinition = "TEXT")
    private String phone;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String hours;

    @Column(name = "shortDesc", nullable = false)
    private String shortDesc;

    @Column(name = "longDesc", nullable = false, columnDefinition = "TEXT")
    private String longDesc;

    @Column(name = "signatureBean", nullable = false)
    private String signatureBean;

    @Column(nullable = false)
    private Double acidity;

    @Column(nullable = false)
    private Double sweetness;

    @Column(nullable = false)
    private Double bitterness;

    @Column(nullable = false)
    private Double body;

    @Column(nullable = false)
    private String equipment;

    @Column(name = "signatureMenu", nullable = false)
    private String signatureMenu;

    @Column(name = "dessertPairing", nullable = false)
    private String dessertPairing;

    @Column(name = "hasDecaf", nullable = false)
    @Builder.Default
    private Boolean hasDecaf = false;

    @Column(name = "hasOatMilk", nullable = false)
    @Builder.Default
    private Boolean hasOatMilk = false;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING";

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "websiteUrl", columnDefinition = "TEXT")
    private String websiteUrl;

    private Double lat;
    private Double lng;

    @Column(name = "approvalRequestsCount", nullable = false)
    @Builder.Default
    private Integer approvalRequestsCount = 1;

    @Column(name = "rejectionReason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "mainImageUrl", columnDefinition = "LONGTEXT")
    private String mainImageUrl;

    @Column(name = "markerImageUrl", columnDefinition = "LONGTEXT")
    private String markerImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "primaryCoffeeType", nullable = false)
    @Builder.Default
    private CoffeeType primaryCoffeeType = CoffeeType.GENERAL;

    @Column(name = "beanNotes")
    private String beanNotes;

    @Column(name = "beanOrigin")
    private String beanOrigin;

    @Column(name = "beanRoastLevel")
    private String beanRoastLevel;

    @Column(name = "coffeeMenuImageUrl", columnDefinition = "LONGTEXT")
    private String coffeeMenuImageUrl;

    @Column(name = "popularMenuImageUrl", columnDefinition = "LONGTEXT")
    private String popularMenuImageUrl;

    @Column(name = "isPremiumTop", nullable = false)
    @Builder.Default
    private Boolean isPremiumTop = false;

    @Column(name = "aiReviewSummary", columnDefinition = "LONGTEXT")
    private String aiReviewSummary;

    @Column(name = "businessNumber")
    private String businessNumber;

    @Column(name = "ownerName")
    private String ownerName;

    @Column(name = "settlementAccount")
    private String settlementAccount;

    @Column(name = "planExpiresAt")
    private LocalDateTime planExpiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "storePlan", nullable = false)
    @Builder.Default
    private StorePlan storePlan = StorePlan.BASIC;

    @Column(name = "hasParking", nullable = false)
    @Builder.Default
    private Boolean hasParking = false;

    @Column(name = "hasPetFriendly", nullable = false)
    @Builder.Default
    private Boolean hasPetFriendly = false;

    @Column(name = "hasPowerOutlets", nullable = false)
    @Builder.Default
    private Boolean hasPowerOutlets = false;

    @Column(name = "hasWifi", nullable = false)
    @Builder.Default
    private Boolean hasWifi = false;

    @Column(name = "aiRecommendCount", nullable = false)
    @Builder.Default
    private Integer aiRecommendCount = 0;

    @Column(name = "recentVisitorCount", nullable = false)
    @Builder.Default
    private Integer recentVisitorCount = 0;

    @Column(name = "viewCount", nullable = false)
    @Builder.Default
    private Integer viewCount = 0;

    @Column(name = "lastWeeklyViewReset")
    private LocalDateTime lastWeeklyViewReset;

    @OneToMany(mappedBy = "store", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<Media> media = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "store", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<StoreReview> reviews = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "store", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<StoreTranslation> translations = new java.util.ArrayList<>();
}
