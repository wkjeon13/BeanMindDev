package com.beanmind.curator.domain.ad.entity;

import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "AdInquiry")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdInquiry {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(nullable = false)
    private String advertiser;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "contactName", nullable = false)
    private String contactName;

    @Column(name = "contactPhone", nullable = false)
    private String contactPhone;

    @Column(name = "contactEmail", nullable = false)
    private String contactEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InquiryStatus status = InquiryStatus.PENDING;

    @Column(name = "adminMemo", columnDefinition = "TEXT")
    private String adminMemo;

    @Column(name = "userId", insertable = false, updatable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    public enum InquiryStatus {
        PENDING, REVIEWING, MORE_INFO_NEEDED, APPROVED, REJECTED
    }
}
