package com.beanmind.curator.domain.tastetest.repository;

import com.beanmind.curator.domain.tastetest.entity.TasteTestQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TasteTestQuestionRepository extends JpaRepository<TasteTestQuestion, Long> {
}
