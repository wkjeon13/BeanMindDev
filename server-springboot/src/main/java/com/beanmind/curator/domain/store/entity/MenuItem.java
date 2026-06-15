package com.beanmind.curator.domain.store.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "MenuItem",
    indexes = {
        @Index(name = "MenuItem_storeId_idx", columnList = "storeId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuItem {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "storeId", nullable = false)
    private Store store;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String price;

    private String description;

    @Column(name = "imageUrl", columnDefinition = "LONGTEXT")
    private String imageUrl;

    @Column(name = "isSignature", nullable = false)
    @Builder.Default
    private Boolean isSignature = false;

    @Column(nullable = false)
    @Builder.Default
    private String category = "COFFEE";

    @Column(name = "orderIndex", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
