package com.beanmind.curator.domain.club.entity;

import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "Club",
    indexes = {
        @Index(name = "Club_createdAt_idx", columnList = "createdAt DESC"),
        @Index(name = "Club_isRecruiting_idx", columnList = "isRecruiting"),
        @Index(name = "Club_locationName_idx", columnList = "locationName"),
        @Index(name = "Club_ownerId_idx", columnList = "ownerId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Club {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ownerId", nullable = false)
    private User owner;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "coverImageUrl", columnDefinition = "LONGTEXT")
    private String coverImageUrl;

    @Column(name = "isPrivate", nullable = false)
    @Builder.Default
    private Boolean isPrivate = false;

    @Column(name = "maxMembers", nullable = false)
    @Builder.Default
    private Integer maxMembers = 100;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    private Double lat;
    private Double lng;

    @Column(name = "locationName")
    private String locationName;

    @Column(name = "leftCount", nullable = false)
    @Builder.Default
    private Integer leftCount = 0;

    @Column(name = "isRecruiting", nullable = false)
    @Builder.Default
    private Boolean isRecruiting = true;

    @Column(name = "recruitDeadline")
    private LocalDateTime recruitDeadline;

    @Column(name = "memberCount", nullable = false)
    @Builder.Default
    private Integer memberCount = 1;

    @Column(name = "isDeleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "countryCode", nullable = false)
    @Builder.Default
    private String countryCode = "KR";
}
