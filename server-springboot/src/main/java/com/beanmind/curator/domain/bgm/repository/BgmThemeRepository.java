package com.beanmind.curator.domain.bgm.repository;

import com.beanmind.curator.domain.bgm.entity.BgmTheme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BgmThemeRepository extends JpaRepository<BgmTheme, String> {
}
