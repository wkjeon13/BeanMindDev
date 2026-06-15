package com.beanmind.curator.domain.store.entity;

import com.beanmind.curator.domain.post.entity.Post;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "CollectionItem",
    uniqueConstraints = {
        @UniqueConstraint(name = "CollectionItem_collectionId_postId_key", columnNames = {"collectionId", "postId"}),
        @UniqueConstraint(name = "CollectionItem_collectionId_storeId_key", columnNames = {"collectionId", "storeId"})
    },
    indexes = {
        @Index(name = "CollectionItem_postId_idx", columnList = "postId"),
        @Index(name = "CollectionItem_storeId_idx", columnList = "storeId"),
        @Index(name = "CollectionItem_collectionId_idx", columnList = "collectionId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionItem {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collectionId", nullable = false)
    private Collection collection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "postId")
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "storeId")
    private Store store;

    @Column(name = "orderIndex", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
