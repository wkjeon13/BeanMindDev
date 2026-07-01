package com.beanmind.curator.domain.tastetest.repository;

import com.beanmind.curator.domain.tastetest.entity.TasteTestOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TasteTestOptionRepository extends JpaRepository<TasteTestOption, Long> {
}
