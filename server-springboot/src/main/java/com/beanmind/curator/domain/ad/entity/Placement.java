package com.beanmind.curator.domain.ad.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "Placement")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Placement {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(name = "locationKey", nullable = false, unique = true)
    private String locationKey;

    @Column(name = "supportedSizes", nullable = false)
    private String supportedSizes;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;
}
