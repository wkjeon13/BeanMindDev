package com.beanmind.curator.domain.bgm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "BgmTheme")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BgmTheme {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(name = "labelKo", nullable = false)
    private String labelKo;

    @Column(name = "labelEn", nullable = false)
    private String labelEn;

    @OneToMany(mappedBy = "theme", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<BgmSong> songs = new ArrayList<>();
}
