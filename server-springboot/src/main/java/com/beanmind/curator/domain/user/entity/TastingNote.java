package com.beanmind.curator.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "TastingNote",
    indexes = {
        @Index(name = "TastingNote_userId_idx", columnList = "userId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TastingNote {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @Column(name = "coffeeName", nullable = false)
    private String coffeeName;

    private String brand;

    @Column(name = "rawUserNote", nullable = false, columnDefinition = "TEXT")
    private String rawUserNote;

    @Column(name = "aiTranslatedNote", nullable = false, columnDefinition = "TEXT")
    private String aiTranslatedNote;

    @Column(nullable = false)
    @Builder.Default
    private Double acidity = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double sweetness = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double bitterness = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double body = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Integer aroma = 0;

    @Column(name = "flavorTags", columnDefinition = "TEXT")
    private String flavorTags;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
