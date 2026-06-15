package com.beanmind.curator.domain.point.entity;

import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "PaymentTransaction",
    uniqueConstraints = {
        @UniqueConstraint(name = "PaymentTransaction_storeTransactionId_key", columnNames = {"storeTransactionId"})
    },
    indexes = {
        @Index(name = "PaymentTransaction_userId_idx", columnList = "userId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @Column(name = "storeTransactionId", nullable = false, unique = true)
    private String storeTransactionId;

    @Column(nullable = false)
    private Integer amount;

    @Column(nullable = false)
    private String platform; // e.g. REVENUECAT_CAPACITOR

    @Column(nullable = false)
    private String productId; // e.g. com.beanmind.beans.1000

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
