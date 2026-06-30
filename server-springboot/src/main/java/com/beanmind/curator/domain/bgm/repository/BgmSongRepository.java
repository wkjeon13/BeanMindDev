package com.beanmind.curator.domain.bgm.repository;

import com.beanmind.curator.domain.bgm.entity.BgmSong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BgmSongRepository extends JpaRepository<BgmSong, Long> {
    List<BgmSong> findByThemeId(String themeId);
}
