package com.beanmind.curator.domain.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "ComplianceRequestLog",
    indexes = {
        @Index(name = "ComplianceRequestLog_requestEmail_idx", columnList = "requestEmail")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplianceRequestLog {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(name = "userId")
    private String userId;

    @Column(name = "requestEmail", nullable = false)
    private String requestEmail;

    @Column(name = "requestType", nullable = false)
    private String requestType;

    @Column(nullable = false)
    private String status;

    @Column(name = "actionTaken")
    private String actionTaken;

    @Column(name = "processedBy")
    private String processedBy;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completedAt")
    private LocalDateTime completedAt;
}
