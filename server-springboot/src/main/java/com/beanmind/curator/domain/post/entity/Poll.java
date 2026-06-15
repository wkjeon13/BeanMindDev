package com.beanmind.curator.domain.post.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "Poll")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Poll {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "postId", nullable = false, unique = true)
    private Post post;

    @Column(nullable = false)
    private String question;

    @Column(name = "expiresAt")
    private LocalDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PollOption> options = new ArrayList<>();
}
