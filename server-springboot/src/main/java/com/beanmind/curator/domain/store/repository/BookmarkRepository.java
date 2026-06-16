package com.beanmind.curator.domain.store.repository;

import com.beanmind.curator.domain.store.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, String> {
    List<Bookmark> findByUserId(String userId);
    long countByUserId(String userId);
}
