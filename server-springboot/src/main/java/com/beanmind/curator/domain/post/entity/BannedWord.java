package com.beanmind.curator.domain.post.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "BannedWord",
    uniqueConstraints = {
        @UniqueConstraint(name = "BannedWord_word_key", columnNames = {"word"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BannedWord {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(nullable = false, unique = true)
    private String word;

    @Column(nullable = false)
    @Builder.Default
    private String locale = "ko";

    @Column(nullable = false)
    @Builder.Default
    private String category = "PROFANITY";

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
