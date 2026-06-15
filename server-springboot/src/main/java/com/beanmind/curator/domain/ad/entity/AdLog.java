package com.beanmind.curator.domain.ad.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "AdLog")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdLog {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(name = "creativeId", nullable = false, insertable = false, updatable = false)
    private String creativeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creativeId", nullable = false)
    private AdCreative creative;

    @Enumerated(EnumType.STRING)
    @Column(name = "actionType", nullable = false)
    private AdActionType actionType;

    @Column(name = "userId")
    private String userId;

    @Column(name = "ipAddress")
    private String ipAddress;

    @Column(name = "userAgent")
    private String userAgent;

    @Column(name = "deviceOS")
    private String deviceOS;

    @Column(name = "locationCountry")
    private String locationCountry;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum AdActionType {
        IMPRESSION, CLICK, CONVERSION
    }
}
