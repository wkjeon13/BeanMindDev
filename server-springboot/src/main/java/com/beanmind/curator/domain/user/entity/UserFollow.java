package com.beanmind.curator.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "UserFollow",
    uniqueConstraints = {
        @UniqueConstraint(name = "UserFollow_followerId_followingId_key", columnNames = {"followerId", "followingId"})
    },
    indexes = {
        @Index(name = "UserFollow_followerId_idx", columnList = "followerId"),
        @Index(name = "UserFollow_followingId_idx", columnList = "followingId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserFollow {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "followerId", nullable = false)
    private User follower;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "followingId", nullable = false)
    private User following;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
