package com.beanmind.curator.domain.post.repository;

import com.beanmind.curator.domain.post.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, String>, PostRepositoryCustom {

    @Query("SELECT p FROM Post p WHERE p.postType = com.beanmind.curator.domain.post.entity.PostType.ANNOUNCEMENT " +
           "AND p.isSystemPopup = true AND p.isDeleted = false " +
           "AND (p.pinnedStartDate IS NULL OR p.pinnedStartDate <= :now) " +
           "AND (p.pinnedEndDate IS NULL OR p.pinnedEndDate >= :now) " +
           "AND (:countryCode = 'GLOBAL' OR p.countryCode = :countryCode OR p.countryCode = 'GLOBAL') " +
           "ORDER BY p.createdAt DESC")
    List<Post> findActiveSystemNotices(@Param("now") LocalDateTime now, @Param("countryCode") String countryCode);

    @Query("SELECT p FROM Post p WHERE p.createdAt >= :startDate AND p.cafeLat IS NOT NULL AND p.cafeLng IS NOT NULL AND p.isDeleted = false")
    List<Post> findRecentHotspots(@Param("startDate") LocalDateTime startDate);
}
