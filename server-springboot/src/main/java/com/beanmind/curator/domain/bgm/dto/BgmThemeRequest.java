package com.beanmind.curator.domain.bgm.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BgmThemeRequest {
    private String id; // 테마 ID (생성 시 필수)
    private String labelKo;
    private String labelEn;
}
