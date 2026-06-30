package com.beanmind.curator.domain.bgm.dto;

import com.beanmind.curator.domain.bgm.entity.BgmSong;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BgmSongResponse {
    private Long id;
    private String title;
    private String videoId;

    public static BgmSongResponse from(BgmSong song) {
        if (song == null) return null;
        return BgmSongResponse.builder()
                .id(song.getId())
                .title(song.getTitle())
                .videoId(song.getVideoId())
                .build();
    }
}
