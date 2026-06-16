package com.beanmind.curator.domain.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "HeroBanner")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeroBanner {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(columnDefinition = "TEXT")
    private String title;

    @Column(columnDefinition = "TEXT")
    private String subtitle;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "backgroundImage", nullable = false, columnDefinition = "LONGTEXT")
    private String backgroundImage;

    @Column(name = "buttonText")
    private String buttonText;

    @Column(name = "buttonLink")
    private String buttonLink;

    @Column(name = "textColor", nullable = false)
    @Builder.Default
    private String textColor = "#FFFFFF";

    @Column(nullable = false)
    @Builder.Default
    private String alignment = "bottom-left";

    @Column(name = "countryCode", nullable = false)
    @Builder.Default
    private String countryCode = "GLOBAL";

    @Column(name = "isActive", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "startDate")
    private LocalDateTime startDate;

    @Column(name = "endDate")
    private LocalDateTime endDate;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "buttonTextEn")
    private String buttonTextEn;

    @Column(name = "descriptionEn", columnDefinition = "TEXT")
    private String descriptionEn;

    @Column(name = "subtitleEn", columnDefinition = "TEXT")
    private String subtitleEn;

    @Column(name = "titleEn", columnDefinition = "TEXT")
    private String titleEn;
}
