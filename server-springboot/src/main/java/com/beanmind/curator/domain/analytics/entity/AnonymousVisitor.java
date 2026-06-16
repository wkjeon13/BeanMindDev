package com.beanmind.curator.domain.analytics.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "AnonymousVisitor", indexes = {
    @Index(name = "AnonymousVisitor_visitorId_key", columnList = "visitorId", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnonymousVisitor {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(name = "visitorId", nullable = false, unique = true)
    private String visitorId;

    @Column(name = "visitCount", nullable = false)
    @Builder.Default
    private Integer visitCount = 1;

    @Column(name = "lastVisit", nullable = false)
    private LocalDateTime lastVisit;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "aiUsageCount", nullable = false)
    @Builder.Default
    private Integer aiUsageCount = 0;

    @Column(name = "hasUsedAi", nullable = false)
    @Builder.Default
    private Boolean hasUsedAi = false;
}
