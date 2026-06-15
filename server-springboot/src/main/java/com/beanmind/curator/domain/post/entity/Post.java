package com.beanmind.curator.domain.post.entity;

import com.beanmind.curator.domain.store.entity.Store;
import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "Post", indexes = {
    @Index(name = "Post_authorId_idx", columnList = "authorId"),
    @Index(name = "Post_storeId_idx", columnList = "storeId"),
    @Index(name = "Post_createdAt_idx", columnList = "createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "authorId", nullable = false)
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(name = "postType", nullable = false)
    @Builder.Default
    private PostType postType = PostType.NORMAL;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "LONGTEXT")
    private String image;

    @Column(name = "cafeName")
    private String cafeName;

    @Column(name = "cafeLocation")
    private String cafeLocation;

    @Column(name = "cafeLat")
    private Double cafeLat;

    @Column(name = "cafeLng")
    private Double cafeLng;

    private Double acidity;
    private Double sweetness;
    private Double body;
    private Double bitterness;
    private Integer aroma;

    @Column(name = "taggedBean")
    private String taggedBean;

    @Column(name = "recipeData", columnDefinition = "LONGTEXT")
    private String recipeData;

    @Column(name = "shareCount", nullable = false)
    @Builder.Default
    private Integer shareCount = 0;

    @Column(name = "isPinned", nullable = false)
    @Builder.Default
    private Boolean isPinned = false;

    @Column(name = "isSystemPopup", nullable = false)
    @Builder.Default
    private Boolean isSystemPopup = false;

    @Column(name = "isPilgrimageLedger", nullable = false)
    @Builder.Default
    private Boolean isPilgrimageLedger = false;

    @Column(name = "pinnedStartDate")
    private LocalDateTime pinnedStartDate;

    @Column(name = "pinnedEndDate")
    private LocalDateTime pinnedEndDate;

    @Column(name = "earnedBeans", nullable = false)
    @Builder.Default
    private Integer earnedBeans = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "storeId")
    private Store store;

    @Column(name = "attachedCourseId")
    private String attachedCourseId;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "clubId")
    private String clubId;

    @Column(name = "isShorts", nullable = false)
    @Builder.Default
    private Boolean isShorts = false;

    @Column(name = "equipmentTag")
    private String equipmentTag;

    @Column(name = "shortsCategory")
    private String shortsCategory;

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

    @Column(name = "countryCode", nullable = false)
    @Builder.Default
    private String countryCode = "KR";

    @Column(name = "contentEn", columnDefinition = "TEXT")
    private String contentEn;

    @Column(name = "imageEn", columnDefinition = "LONGTEXT")
    private String imageEn;

    @OneToOne(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private Poll poll;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<Comment> comments = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<Like> likes = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<PostBookmark> bookmarks = new java.util.ArrayList<>();
}
