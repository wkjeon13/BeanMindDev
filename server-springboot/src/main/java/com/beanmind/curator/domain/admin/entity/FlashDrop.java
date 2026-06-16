package com.beanmind.curator.domain.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "FlashDrop")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlashDrop {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "imageUrl", nullable = false, columnDefinition = "LONGTEXT")
    private String imageUrl;

    @Column(name = "linkUrl")
    private String linkUrl;

    @Column(name = "startTime", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "endTime", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "maxQuantity", nullable = false)
    @Builder.Default
    private Integer maxQuantity = 0;

    @Column(name = "claimedCount", nullable = false)
    @Builder.Default
    private Integer claimedCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private String status = "ACTIVE";

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "descriptionEn", columnDefinition = "TEXT")
    private String descriptionEn;

    @Column(nullable = false)
    @Builder.Default
    private String region = "GLOBAL";

    @Column(name = "titleEn")
    private String titleEn;
}
