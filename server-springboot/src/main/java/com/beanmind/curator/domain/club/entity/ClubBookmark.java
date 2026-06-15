package com.beanmind.curator.domain.club.entity;

import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "ClubBookmark",
    uniqueConstraints = {
        @UniqueConstraint(name = "ClubBookmark_clubId_userId_key", columnNames = {"clubId", "userId"})
    },
    indexes = {
        @Index(name = "ClubBookmark_clubId_idx", columnList = "clubId"),
        @Index(name = "ClubBookmark_userId_idx", columnList = "userId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClubBookmark {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "clubId", nullable = false)
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
