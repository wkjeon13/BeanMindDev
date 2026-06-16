package com.beanmind.curator.domain.user.repository;

import com.beanmind.curator.domain.user.entity.TastingNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TastingNoteRepository extends JpaRepository<TastingNote, String> {
    List<TastingNote> findByUserId(String userId);
    List<TastingNote> findByUserIdOrderByCreatedAtDesc(String userId);
    long countByUserId(String userId);
}
