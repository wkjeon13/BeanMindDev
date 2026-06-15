package com.beanmind.curator.domain.post.entity;

import com.beanmind.curator.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "PollVote",
    uniqueConstraints = {
        @UniqueConstraint(name = "PollVote_userId_optionId_key", columnNames = {"userId", "optionId"})
    },
    indexes = {
        @Index(name = "PollVote_optionId_idx", columnList = "optionId"),
        @Index(name = "PollVote_userId_idx", columnList = "userId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PollVote {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "optionId", nullable = false)
    private PollOption option;

    @CreationTimestamp
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
