package com.beanmind.curator.domain.post.repository;

import com.beanmind.curator.domain.post.entity.Like;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LikeRepository extends JpaRepository<Like, String> {
    Optional<Like> findByPostIdAndUserId(String postId, String userId);
    void deleteByPostId(String postId);
}
