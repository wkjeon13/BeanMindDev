package com.beanmind.curator.domain.ad.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "Campaign")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Campaign {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(name = "advertiserId", nullable = false, insertable = false, updatable = false)
    private String advertiserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "advertiserId", nullable = false)
    private Advertiser advertiser;

    @Column(name = "contractId", nullable = false, insertable = false, updatable = false)
    private String contractId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contractId", nullable = false)
    private Contract contract;

    @Column(nullable = false)
    private String name;

    private String objective;

    @Column(name = "startDate", nullable = false)
    private LocalDateTime startDate;

    @Column(name = "endDate", nullable = false)
    private LocalDateTime endDate;

    private Double budget;

    @Column(name = "targetCountry", nullable = false)
    @Builder.Default
    private String targetCountry = "GLOBAL";

    @Column(name = "targetLanguage")
    private String targetLanguage;

    @Column(name = "targetOS")
    private String targetOS;

    @Column(name = "targetAgeMin")
    private Integer targetAgeMin;

    @Column(name = "targetAgeMax")
    private Integer targetAgeMax;

    @Column(name = "targetGender")
    private String targetGender;

    @Column(name = "targetInterests")
    private String targetInterests;

    @Column(name = "targetDays")
    private String targetDays;

    @Column(name = "targetHours")
    private String targetHours;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CampaignStatus status = CampaignStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    public enum CampaignStatus {
        ACTIVE, PAUSED, COMPLETED
    }
}
