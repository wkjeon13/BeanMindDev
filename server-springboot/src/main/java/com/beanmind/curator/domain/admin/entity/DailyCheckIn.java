package com.beanmind.curator.domain.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "DailyCheckIn")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyCheckIn {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(name = "userId", nullable = false)
    private String userId;

    @Column(name = "beansWon", nullable = false)
    private Integer beansWon;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
