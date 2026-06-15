package com.beanmind.curator.domain.post.entity;

import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "CommentReaction",
    uniqueConstraints = {
        @UniqueConstraint(name = "CommentReaction_commentId_userId_emoji_key", columnNames = {"commentId", "userId", "emoji"})
    },
    indexes = {
        @Index(name = "CommentReaction_commentId_idx", columnList = "commentId"),
        @Index(name = "CommentReaction_userId_idx", columnList = "userId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentReaction {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commentId", nullable = false)
    private Comment comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @Column(nullable = false)
    private String emoji;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
