package com.beanmind.curator.domain.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "TodayPairing")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TodayPairing {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(nullable = false)
    private String icon;

    @Column(name = "isActive", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "`order`", nullable = false) // Map to actual column 'order' using backticks to avoid SQL syntax error
    @Builder.Default
    private Integer order = 0;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "availableRegions", nullable = false)
    @Builder.Default
    private String availableRegions = "GLOBAL";

    @OneToMany(mappedBy = "pairing", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TodayPairingTranslation> translations = new ArrayList<>();
}
