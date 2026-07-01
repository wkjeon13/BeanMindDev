package com.beanmind.curator.domain.tastetest.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "TasteTestOption")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TasteTestOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "questionId", nullable = false)
    @JsonIgnore
    private TasteTestQuestion question;

    @Column(name = "optionLetter", nullable = false, columnDefinition = "CHAR(1)")
    private String optionLetter;

    @Column(name = "contentKo", nullable = false)
    private String contentKo;

    @Column(name = "contentEn", nullable = false)
    private String contentEn;

    @Column(name = "weightAcidity", nullable = false)
    @Builder.Default
    private Integer weightAcidity = 0;

    @Column(name = "weightSweetness", nullable = false)
    @Builder.Default
    private Integer weightSweetness = 0;

    @Column(name = "weightBitterness", nullable = false)
    @Builder.Default
    private Integer weightBitterness = 0;

    @Column(name = "weightBody", nullable = false)
    @Builder.Default
    private Integer weightBody = 0;
}
