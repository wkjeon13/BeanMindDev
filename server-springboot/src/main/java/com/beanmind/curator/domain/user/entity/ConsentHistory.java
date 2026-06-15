package com.beanmind.curator.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "ConsentHistory",
    indexes = {
        @Index(name = "ConsentHistory_userId_idx", columnList = "userId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsentHistory {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @Column(nullable = false)
    private String email;

    @Column(name = "policyType", nullable = false)
    private String policyType;

    @Column(nullable = false)
    private String version;

    @Column(name = "isAgreed", nullable = false)
    @Builder.Default
    private Boolean isAgreed = true;

    @CreationTimestamp
    @Column(name = "agreedAt", nullable = false, updatable = false)
    private LocalDateTime agreedAt;

    @Column(name = "ipAddress", nullable = false)
    private String ipAddress;
}
