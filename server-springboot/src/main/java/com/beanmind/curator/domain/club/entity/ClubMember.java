package com.beanmind.curator.domain.club.entity;

import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "ClubMember",
    uniqueConstraints = {
        @UniqueConstraint(name = "ClubMember_clubId_userId_key", columnNames = {"clubId", "userId"})
    },
    indexes = {
        @Index(name = "ClubMember_clubId_idx", columnList = "clubId"),
        @Index(name = "ClubMember_userId_idx", columnList = "userId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClubMember {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "clubId", nullable = false)
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ClubRole role = ClubRole.MEMBER;

    @CreationTimestamp
    @Column(name = "joinedAt", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @Column(name = "applicationData", columnDefinition = "TEXT")
    private String applicationData;

    private String badges;
}
