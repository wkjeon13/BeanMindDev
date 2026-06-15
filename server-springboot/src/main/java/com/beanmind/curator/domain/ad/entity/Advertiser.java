package com.beanmind.curator.domain.ad.entity;

import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "Advertiser")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Advertiser {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(name = "companyName", nullable = false)
    private String companyName;

    @Column(name = "managerName", nullable = false)
    private String managerName;

    @Column(name = "managerEmail", nullable = false)
    private String managerEmail;

    @Column(name = "managerPhone")
    private String managerPhone;

    @Column(name = "businessNumber")
    private String businessNumber;

    private String address;

    @Enumerated(EnumType.STRING)
    @Column(name = "billingType", nullable = false)
    @Builder.Default
    private BillingType billingType = BillingType.PREPAID;

    @Column(name = "taxInfo")
    private String taxInfo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AdvertiserStatus status = AdvertiserStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AdvertiserGrade grade = AdvertiserGrade.STANDARD;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(name = "userId", insertable = false, updatable = false)
    private String userId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId", unique = true)
    private User user;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    public enum BillingType {
        PREPAID, POSTPAID
    }

    public enum AdvertiserStatus {
        ACTIVE, PAUSED, SUSPENDED
    }

    public enum AdvertiserGrade {
        VIP, STANDARD
    }
}
