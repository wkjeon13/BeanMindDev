package com.beanmind.curator.domain.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "AdminActionLog",
    indexes = {
        @Index(name = "AdminActionLog_adminId_idx", columnList = "adminId"),
        @Index(name = "AdminActionLog_targetType_idx", columnList = "targetType")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminActionLog {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(name = "adminId", nullable = false)
    private String adminId;

    @Column(name = "adminEmail", nullable = false)
    private String adminEmail;

    @Column(name = "adminRole", nullable = false)
    private String adminRole;

    @Column(name = "actionType", nullable = false)
    private String actionType;

    @Column(name = "targetType", nullable = false)
    private String targetType;

    @Column(name = "targetId")
    private String targetId;

    @Column(nullable = false)
    private String details;

    @Column(name = "ipAddress", nullable = false)
    private String ipAddress;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
