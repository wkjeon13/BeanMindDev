package com.beanmind.curator.domain.store.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "StoreTranslation",
    uniqueConstraints = {
        @UniqueConstraint(name = "StoreTranslation_storeId_languageCode_key", columnNames = {"storeId", "languageCode"})
    },
    indexes = {
        @Index(name = "StoreTranslation_storeId_idx", columnList = "storeId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreTranslation {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "storeId", nullable = false)
    private Store store;

    @Column(name = "languageCode", nullable = false)
    private String languageCode;

    @Column(name = "shortDesc")
    private String shortDesc;

    @Column(name = "longDesc", columnDefinition = "TEXT")
    private String longDesc;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;
}
