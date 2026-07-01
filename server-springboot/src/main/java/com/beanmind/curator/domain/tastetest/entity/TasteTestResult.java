package com.beanmind.curator.domain.tastetest.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "TasteTestResult")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TasteTestResult {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "testId", nullable = false)
    @JsonIgnore
    private TasteTest tasteTest;

    @Column(name = "resultNameKo", nullable = false)
    private String resultNameKo;

    @Column(name = "resultNameEn", nullable = false)
    private String resultNameEn;

    @Column(name = "descriptionKo", nullable = false, columnDefinition = "TEXT")
    private String descriptionKo;

    @Column(name = "descriptionEn", nullable = false, columnDefinition = "TEXT")
    private String descriptionEn;

    @Column(name = "targetAcidityMin")
    private Integer targetAcidityMin;

    @Column(name = "targetAcidityMax")
    private Integer targetAcidityMax;

    @Column(name = "targetSweetnessMin")
    private Integer targetSweetnessMin;

    @Column(name = "targetSweetnessMax")
    private Integer targetSweetnessMax;

    @Column(name = "targetBitternessMin")
    private Integer targetBitternessMin;

    @Column(name = "targetBitternessMax")
    private Integer targetBitternessMax;

    @Column(name = "targetBodyMin")
    private Integer targetBodyMin;

    @Column(name = "targetBodyMax")
    private Integer targetBodyMax;
}
