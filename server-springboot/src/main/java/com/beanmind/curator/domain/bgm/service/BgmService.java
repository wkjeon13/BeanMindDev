package com.beanmind.curator.domain.bgm.service;

import com.beanmind.curator.domain.bgm.entity.BgmSong;
import com.beanmind.curator.domain.bgm.entity.BgmTheme;
import com.beanmind.curator.domain.bgm.dto.BgmSongRequest;
import com.beanmind.curator.domain.bgm.dto.BgmThemeRequest;
import com.beanmind.curator.domain.bgm.dto.BgmThemeResponse;
import com.beanmind.curator.domain.bgm.repository.BgmSongRepository;
import com.beanmind.curator.domain.bgm.repository.BgmThemeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class BgmService {

    private final BgmThemeRepository bgmThemeRepository;
    private final BgmSongRepository bgmSongRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void initDefaultBgmData() {
        if (bgmThemeRepository.count() > 0) {
            log.info("[BgmService] BGM themes already exist. Skipping default seeding.");
            return;
        }

        log.info("[BgmService] BGM database is empty. Seeding default themes and songs...");
        List<ThemeData> defaultThemes = createDefaultThemes();

        for (ThemeData td : defaultThemes) {
            BgmTheme theme = BgmTheme.builder()
                    .id(td.id)
                    .labelKo(td.labelKo)
                    .labelEn(td.labelEn)
                    .songs(new ArrayList<>())
                    .build();

            BgmTheme savedTheme = bgmThemeRepository.save(theme);

            for (SongData sd : td.songs) {
                BgmSong song = BgmSong.builder()
                        .theme(savedTheme)
                        .title(sd.title)
                        .videoId(sd.videoId)
                        .build();
                bgmSongRepository.save(song);
                savedTheme.getSongs().add(song);
            }
        }
        log.info("[BgmService] Successfully seeded {} default BGM themes and associated songs.", defaultThemes.size());
    }

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

    private List<ThemeData> createDefaultThemes() {
        List<ThemeData> list = new ArrayList<>();

        list.add(new ThemeData("jazz", "☕ 아침 클래식 피아노", "Morning Classic Piano", List.of(
                new SongData("바흐 골드베르크 아리아 커피 피아노", "tN9ecELJ5A0"),
                new SongData("고요한 카페 재즈 피아노 연주", "5r3t0xK5Mhk"),
                new SongData("가을 아침 따뜻한 재즈 멜로디", "1w7OgIMMRc4")
        )));

        list.add(new ThemeData("lofi", "🌙 고요한 밤 피아노", "Quiet Night Piano", List.of(
                new SongData("베토벤 월광 고요한 밤 피아노", "Dx5qFeM4yMc"),
                new SongData("Lofi Hip Hop Radio - Beats to Relax/Study to", "5qap5aO4i9A"),
                new SongData("달콤한 커피와 함께하는 로파이 비트", "tNkZs5bpHHU")
        )));

        list.add(new ThemeData("acoustic", "☔ 잔잔한 어쿠스틱", "Calm Acoustic", List.of(
                new SongData("비오는 날 잔잔한 어쿠스틱", "811QZGDysx0"),
                new SongData("햇살 가득한 오후의 어쿠스틱 기타", "W4s7h42m1A0"),
                new SongData("주말 아침 감성 어쿠스틱 라이브", "mD1lEux4Pz0")
        )));

        list.add(new ThemeData("bossanova", "☀️ 나른한 보사노바", "Lazy Bossa Nova", List.of(
                new SongData("오후의 나른하고 편안한 보사노바", "jfKfPfyJRdk"),
                new SongData("카페에서 듣기 좋은 상쾌한 보사노바", "E0tP1_Y1wYg"),
                new SongData("브라질 해변 감성 보사노바 재즈", "f6zM-vY0-jU")
        )));

        list.add(new ThemeData("classic", "🎻 짐노페디 1번 피아노", "Gymnopedie No. 1 Piano", List.of(
                new SongData("에릭 사티 짐노페디 1번 힐링 건반", "57GfJ1A5e68"),
                new SongData("쇼팽 녹턴 2번 명작 빗방울 음악", "L8g3c-t0HjM"),
                new SongData("드뷔시 베르가마스크 모음곡 달빛 피아노", "NDGs9x04DkY")
        )));

        list.add(new ThemeData("rock", "🎸 락 발라드 피아노", "Rock Ballad Piano", List.of(
                new SongData("감성 락 발라드 피아노 연주", "jgpJVIg8DbM"),
                new SongData("부드러운 모던 락 어쿠스틱 연주", "9wL07Z49e1o"),
                new SongData("석양 아래 잔잔한 인디 락 기타", "kM2Z49_YmEs")
        )));

        list.add(new ThemeData("hiphop", "🎧 시티팝 힙합", "City Pop Hip Hop", List.of(
                new SongData("힙합 시티팝 인스트루멘탈", "mnd7nUqM5v0"),
                new SongData("도심 밤거리 감성 힙합 비트", "p8V3o9_v10E"),
                new SongData("빈티지 레트로 힙합 인스트루멘탈", "hM39_12Yoe4")
        )));

        list.add(new ThemeData("nature", "🍃 쇼팽 녹턴 피아노", "Chopin Nocturne Piano", List.of(
                new SongData("쇼팽 녹턴 2번 명작 빗방울 음악", "L8g3c-t0HjM"),
                new SongData("새들의 지저귐과 숲속 피아노 소리", "5G7oIMmRcA0"),
                new SongData("파도 소리와 함께하는 힐링 어쿠스틱", "kX8g1-t0M4Y")
        )));

        list.add(new ThemeData("coffeetime", "☕ 커피 타임 고요한 피아노", "Coffee Time Quiet Piano", List.of(
                new SongData("드뷔시 베르가마스크 모음곡 달빛 피아노", "NDGs9x04DkY"),
                new SongData("커피 향 가득한 오후의 피아노 메들리", "1w7OgIMMRc4"),
                new SongData("바리스타가 추천하는 아늑한 음악", "5r3t0xK5Mhk")
        )));

        return list;
    }

    private static class ThemeData {
        String id;
        String labelKo;
        String labelEn;
        List<SongData> songs;

        ThemeData(String id, String labelKo, String labelEn, List<SongData> songs) {
            this.id = id;
            this.labelKo = labelKo;
            this.labelEn = labelEn;
            this.songs = songs;
        }
    }

    private static class SongData {
        String title;
        String videoId;

        SongData(String title, String videoId) {
            this.title = title;
            this.videoId = videoId;
        }
    }
}
