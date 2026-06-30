package com.beanmind.curator.domain.bgm.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BgmSongRequest {
    private String themeId;
    private String title;
    private String videoId;
}
