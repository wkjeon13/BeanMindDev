package com.beanmind.curator.domain.tastetest.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "TasteTest")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TasteTest {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(name = "titleEn")
    private String titleEn;

    private String subtitle;

    @Column(name = "subtitleEn")
    private String subtitleEn;

    @Column(name = "imageUrl")
    private String imageUrl;

    @Column(name = "isActive", nullable = false)
    private Boolean isActive;

    @OneToMany(mappedBy = "tasteTest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<TasteTestQuestion> questions = new ArrayList<>();

    @OneToMany(mappedBy = "tasteTest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<TasteTestResult> results = new ArrayList<>();
}
