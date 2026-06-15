package com.beanmind.curator.domain.post.entity;

import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "Comment", indexes = {
    @Index(name = "Comment_postId_idx", columnList = "postId"),
    @Index(name = "Comment_authorId_idx", columnList = "authorId"),
    @Index(name = "Comment_parentId_idx", columnList = "parentId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "postId", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "authorId", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parentId")
    private Comment parent;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "imageUrl", columnDefinition = "LONGTEXT")
    private String imageUrl;

    @Column(name = "isPinned", nullable = false)
    @Builder.Default
    private Boolean isPinned = false;

    @Column(name = "earnedBeans", nullable = false)
    @Builder.Default
    private Integer earnedBeans = 0;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "isHidden", nullable = false)
    @Builder.Default
    private Boolean isHidden = false;

    @Column(name = "isDeleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deletedAt")
    private LocalDateTime deletedAt;

    @Column(name = "deletedBy")
    private String deletedBy;

    @Column(name = "deleteReason", columnDefinition = "TEXT")
    private String deleteReason;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<Comment> replies = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "comment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<CommentReaction> reactions = new java.util.ArrayList<>();
}
