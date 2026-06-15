package com.beanmind.curator.domain.post.repository;

import com.beanmind.curator.domain.post.entity.PostBookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PostBookmarkRepository extends JpaRepository<PostBookmark, String> {
    Optional<PostBookmark> findByPostIdAndUserId(String postId, String userId);
    List<PostBookmark> findByUserIdOrderByCreatedAtDesc(String userId);
    void deleteByPostId(String postId);
}
