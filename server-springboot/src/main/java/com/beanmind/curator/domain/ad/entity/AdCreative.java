package com.beanmind.curator.domain.ad.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "AdCreative")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdCreative {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(name = "campaignId", nullable = false, insertable = false, updatable = false)
    private String campaignId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaignId", nullable = false)
    private Campaign campaign;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AdType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AdSize size;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "linkUrl")
    private String linkUrl;

    @Column(name = "flavorTags")
    private String flavorTags;

    @Column(name = "originTags")
    private String originTags;

    @Column(name = "cpcPrice")
    private Double cpcPrice;

    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 1;

    @Column(nullable = false)
    @Builder.Default
    private Integer weight = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CreativeStatus status = CreativeStatus.ACTIVE;

    @Column(name = "overlayText", columnDefinition = "TEXT")
    private String overlayText;

    @Column(name = "overlayFontSize")
    private Integer overlayFontSize;

    @Column(name = "overlayColor")
    private String overlayColor;

    @Column(name = "overlayPosition")
    private String overlayPosition;

    @Column(name = "placementId", insertable = false, updatable = false)
    private String placementId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "placementId")
    private Placement placement;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    public enum AdType {
        IMAGE, VIDEO, HTML, TEXT_LINK
    }

    public enum AdSize {
        SMALL, MEDIUM, LARGE, FULL
    }

    public enum CreativeStatus {
        PENDING, ACTIVE, PAUSED, REJECTED
    }
}
