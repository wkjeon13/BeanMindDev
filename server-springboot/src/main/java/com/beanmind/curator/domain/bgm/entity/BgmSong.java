package com.beanmind.curator.domain.bgm.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "BgmSong")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BgmSong {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "themeId", nullable = false)
    private BgmTheme theme;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String videoId;
}
