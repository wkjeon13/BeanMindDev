package com.beanmind.curator.domain.post.repository;

import com.beanmind.curator.domain.post.entity.BannedWord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BannedWordRepository extends JpaRepository<BannedWord, String> {
    List<BannedWord> findByLocale(String locale);
    java.util.Optional<BannedWord> findByWord(String word);
}
