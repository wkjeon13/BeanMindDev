package com.beanmind.curator.domain.bgm.dto;

import com.beanmind.curator.domain.bgm.entity.BgmTheme;
import lombok.*;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BgmThemeResponse {
    private String id;
    private String labelKo;
    private String labelEn;
    private List<BgmSongResponse> songs;

    public static BgmThemeResponse from(BgmTheme theme) {
        if (theme == null) return null;
        List<BgmSongResponse> songResponses = theme.getSongs() != null
                ? theme.getSongs().stream().map(BgmSongResponse::from).collect(Collectors.toList())
                : Collections.emptyList();

        return BgmThemeResponse.builder()
                .id(theme.getId())
                .labelKo(theme.getLabelKo())
                .labelEn(theme.getLabelEn())
                .songs(songResponses)
                .build();
    }
}
