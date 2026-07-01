package com.beanmind.curator.domain.tastetest.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TasteTestResponse {
    private String id;
    private String title;
    private String subtitle;
    private String imageUrl;
    private Boolean isActive;
    private List<QuestionDto> questions;
    private List<ResultDto> results;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionDto {
        private Long id;
        private Integer questionNumber;
        private String contentKo;
        private String contentEn;
        private List<OptionDto> options;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OptionDto {
        private Long id;
        private String optionLetter;
        private String contentKo;
        private String contentEn;
        private Integer weightAcidity;
        private Integer weightSweetness;
        private Integer weightBitterness;
        private Integer weightBody;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResultDto {
        private String id;
        private String resultNameKo;
        private String resultNameEn;
        private String descriptionKo;
        private String descriptionEn;
        private Integer targetAcidityMin;
        private Integer targetAcidityMax;
        private Integer targetSweetnessMin;
        private Integer targetSweetnessMax;
        private Integer targetBitternessMin;
        private Integer targetBitternessMax;
        private Integer targetBodyMin;
        private Integer targetBodyMax;
    }
}
