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

    @Query("SELECT p.store.id FROM Post p WHERE p.createdAt >= :startDate " +
           "AND p.store.id IS NOT NULL " +
           "AND p.postType = com.beanmind.curator.domain.post.entity.PostType.NORMAL " +
           "AND (:countryCode IS NULL OR p.countryCode = :countryCode) " +
           "AND p.isDeleted = false " +
           "GROUP BY p.store.id " +
           "ORDER BY COUNT(p.store.id) DESC")
    List<String> findTrendingStoreIds(
            @Param("startDate") LocalDateTime startDate,
            @Param("countryCode") String countryCode,
            org.springframework.data.domain.Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.isHidden = false AND p.isDeleted = false AND p.clubId IS NULL AND p.postType = com.beanmind.curator.domain.post.entity.PostType.NORMAL AND p.image IS NOT NULL AND (:countryCode IS NULL OR p.countryCode = :countryCode) ORDER BY p.createdAt DESC")
    List<Post> findPersonalizedBasePosts(@Param("countryCode") String countryCode, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.isHidden = false AND p.isDeleted = false AND p.clubId IN :clubIds ORDER BY p.createdAt DESC")
    List<Post> findRecentClubFeeds(@Param("clubIds") List<String> clubIds);

    @Query("SELECT p FROM Post p WHERE p.isHidden = false AND p.isDeleted = false AND p.clubId IS NULL " +
           "AND (p.author.id IN :authorIds OR p.store.id IN :storeIds) " +
           "ORDER BY p.createdAt DESC")
    List<Post> findFollowingFeeds(@Param("authorIds") List<String> authorIds, @Param("storeIds") List<String> storeIds, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.isHidden = false AND p.isDeleted = false " +
           "AND (:countryCode IS NULL OR p.countryCode = :countryCode) " +
           "AND p.content LIKE %:tag% AND p.image IS NOT NULL " +
           "ORDER BY p.createdAt DESC")
    List<Post> findUserPairingPosts(@Param("countryCode") String countryCode, @Param("tag") String tag, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.isHidden = false AND p.isDeleted = false " +
           "AND p.clubId IS NULL AND p.postType = com.beanmind.curator.domain.post.entity.PostType.NORMAL " +
           "AND p.isShorts = false AND (:countryCode IS NULL OR p.countryCode = :countryCode) " +
           "AND p.createdAt >= :startDate ORDER BY p.createdAt DESC")
    List<Post> findRecentNormalPosts(@Param("countryCode") String countryCode, @Param("startDate") LocalDateTime startDate, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.isHidden = false AND p.isDeleted = false " +
           "AND p.clubId IS NULL AND p.postType = com.beanmind.curator.domain.post.entity.PostType.NORMAL " +
           "AND p.isShorts = false AND (:countryCode IS NULL OR p.countryCode = :countryCode) " +
           "ORDER BY p.createdAt DESC")
    List<Post> findNewestNormalPosts(@Param("countryCode") String countryCode, org.springframework.data.domain.Pageable pageable);

    long countByAuthorId(String authorId);
}
