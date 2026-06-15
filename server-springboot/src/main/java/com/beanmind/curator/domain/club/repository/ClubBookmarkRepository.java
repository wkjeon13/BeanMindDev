package com.beanmind.curator.domain.club.repository;

import com.beanmind.curator.domain.club.entity.ClubBookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClubBookmarkRepository extends JpaRepository<ClubBookmark, String> {
    Optional<ClubBookmark> findByClubIdAndUserId(String clubId, String userId);
    List<ClubBookmark> findByUserId(String userId);
    void deleteByClubIdAndUserId(String clubId, String userId);
}
