package com.beanmind.curator.domain.admin.entity;

import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "UserAccessLog",
    indexes = {
        @Index(name = "UserAccessLog_userId_idx", columnList = "userId"),
        @Index(name = "UserAccessLog_createdAt_idx", columnList = "createdAt"),
        @Index(name = "UserAccessLog_email_idx", columnList = "email")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAccessLog {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(name = "userId", insertable = false, updatable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId")
    private User user;

    private String email;

    @Column(name = "ipAddress")
    private String ipAddress;

    @Column(name = "userAgent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "deviceOS")
    private String deviceOS;

    @Column(name = "pagePath", nullable = false)
    private String pagePath;

    @Column(name = "actionType", nullable = false)
    private String actionType;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
