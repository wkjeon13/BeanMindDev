package com.beanmind.curator.domain.ad.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "Contract")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contract {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(name = "advertiserId", nullable = false, insertable = false, updatable = false)
    private String advertiserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "advertiserId", nullable = false)
    private Advertiser advertiser;

    @Column(name = "startDate", nullable = false)
    private LocalDateTime startDate;

    @Column(name = "endDate", nullable = false)
    private LocalDateTime endDate;

    @Column(name = "totalBudget", nullable = false)
    @Builder.Default
    private Double totalBudget = 0.0;

    @Column(name = "spentBudget", nullable = false)
    @Builder.Default
    private Double spentBudget = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "pricingModel", nullable = false)
    @Builder.Default
    private PricingModel pricingModel = PricingModel.CPM;

    @Column(name = "priceRate", nullable = false)
    @Builder.Default
    private Double priceRate = 0.0;

    @Column(name = "maxImpressions")
    private Integer maxImpressions;

    @Column(name = "maxClicks")
    private Integer maxClicks;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ContractStatus status = ContractStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    private String name;

    public enum PricingModel {
        CPM, CPC, CPA, FIXED
    }

    public enum ContractStatus {
        DRAFT, ACTIVE, COMPLETED, CANCELLED
    }
}
