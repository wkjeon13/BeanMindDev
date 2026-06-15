package com.beanmind.curator.domain.post.repository;

import com.beanmind.curator.domain.post.entity.CommentReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommentReactionRepository extends JpaRepository<CommentReaction, String> {
    Optional<CommentReaction> findByCommentIdAndUserIdAndEmoji(String commentId, String userId, String emoji);
    List<CommentReaction> findByCommentIdAndUserId(String commentId, String userId);
}
