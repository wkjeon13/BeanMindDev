package com.beanmind.curator.domain.bgm.service;

import com.beanmind.curator.domain.bgm.entity.BgmSong;
import com.beanmind.curator.domain.bgm.entity.BgmTheme;
import com.beanmind.curator.domain.bgm.dto.BgmSongRequest;
import com.beanmind.curator.domain.bgm.dto.BgmThemeRequest;
import com.beanmind.curator.domain.bgm.dto.BgmThemeResponse;
import com.beanmind.curator.domain.bgm.repository.BgmSongRepository;
import com.beanmind.curator.domain.bgm.repository.BgmThemeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BgmService {

    private final BgmThemeRepository bgmThemeRepository;
    private final BgmSongRepository bgmSongRepository;

    @Transactional(readOnly = true)
    public List<BgmThemeResponse> getAllThemes() {
        List<BgmTheme> themes = bgmThemeRepository.findAll();
        return themes.stream()
                .map(BgmThemeResponse::from)
                .collect(Collectors.toList());
    }

    public BgmThemeResponse createTheme(BgmThemeRequest request) {
        if (bgmThemeRepository.existsById(request.getId())) {
            throw new IllegalArgumentException("이미 존재하는 테마 ID입니다: " + request.getId());
        }

        BgmTheme theme = BgmTheme.builder()
                .id(request.getId())
                .labelKo(request.getLabelKo())
                .labelEn(request.getLabelEn())
                .build();

        BgmTheme saved = bgmThemeRepository.save(theme);
        return BgmThemeResponse.from(saved);
    }

    public BgmThemeResponse updateTheme(String id, BgmThemeRequest request) {
        BgmTheme theme = bgmThemeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 테마입니다: " + id));

        theme.setLabelKo(request.getLabelKo());
        theme.setLabelEn(request.getLabelEn());

        return BgmThemeResponse.from(theme);
    }

    public void deleteTheme(String id) {
        BgmTheme theme = bgmThemeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 테마입니다: " + id));
        bgmThemeRepository.delete(theme);
    }

    public BgmThemeResponse addSongToTheme(BgmSongRequest request) {
        BgmTheme theme = bgmThemeRepository.findById(request.getThemeId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 테마입니다: " + request.getThemeId()));

        BgmSong song = BgmSong.builder()
                .theme(theme)
                .title(request.getTitle())
                .videoId(request.getVideoId())
                .build();

        bgmSongRepository.save(song);
        
        // 연관관계 편의
        theme.getSongs().add(song);

        return BgmThemeResponse.from(theme);
    }

    public void deleteSong(Long songId) {
        BgmSong song = bgmSongRepository.findById(songId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 곡입니다: " + songId));
        
        // 연관관계에서 제거
        BgmTheme theme = song.getTheme();
        if (theme != null) {
            theme.getSongs().remove(song);
        }
        
        bgmSongRepository.delete(song);
    }
}
