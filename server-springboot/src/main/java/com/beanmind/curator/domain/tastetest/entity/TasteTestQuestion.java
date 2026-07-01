package com.beanmind.curator.domain.tastetest.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "TasteTestQuestion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TasteTestQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "testId", nullable = false)
    @JsonIgnore
    private TasteTest tasteTest;

    @Column(name = "questionNumber", nullable = false)
    private Integer questionNumber;

    @Column(name = "contentKo", nullable = false, length = 500)
    private String contentKo;

    @Column(name = "contentEn", nullable = false, length = 500)
    private String contentEn;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<TasteTestOption> options = new ArrayList<>();
}
