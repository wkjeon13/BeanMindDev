package com.beanmind.curator.domain.store.entity;

import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "StoreReview",
    indexes = {
        @Index(name = "StoreReview_storeId_idx", columnList = "storeId"),
        @Index(name = "StoreReview_userId_idx", columnList = "userId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreReview {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "storeId", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @Column(nullable = false)
    private Double taste;

    @Column(nullable = false)
    private Double atmosphere;

    @Column(nullable = false)
    private Double interior;

    @Column(nullable = false)
    private Double service;

    @Column(nullable = false)
    private Double price;

    @Column(nullable = false)
    private Double cleanliness;

    @Column(nullable = false)
    private Double overall;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "imageUrls", columnDefinition = "LONGTEXT")
    private String imageUrls; // Store as JSON Array String

    @Column(name = "earnedBeans", nullable = false)
    @Builder.Default
    private Integer earnedBeans = 0;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;
}
