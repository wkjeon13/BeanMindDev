package com.beanmind.curator.domain.post.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "PollOption",
    indexes = {
        @Index(name = "PollOption_pollId_idx", columnList = "pollId")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PollOption {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pollId", nullable = false)
    private Poll poll;

    @Column(nullable = false)
    private String text;

    @Column(name = "sortOrder", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @OneToMany(mappedBy = "option", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PollVote> votes = new ArrayList<>();
}
