package com.beanmind.curator.domain.post.entity;

import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "PostBookmark",
    uniqueConstraints = {
        @UniqueConstraint(name = "PostBookmark_postId_userId_key", columnNames = {"postId", "userId"})
    },
    indexes = {
        @Index(name = "PostBookmark_postId_idx", columnList = "postId"),
        @Index(name = "PostBookmark_userId_idx", columnList = "userId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostBookmark {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "postId", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
