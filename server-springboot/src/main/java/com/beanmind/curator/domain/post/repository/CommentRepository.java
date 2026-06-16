package com.beanmind.curator.domain.post.repository;

import com.beanmind.curator.domain.post.entity.Comment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, String> {
    List<Comment> findByPostIdAndParentIsNullAndIsHiddenFalseAndIsDeletedFalse(String postId, Pageable pageable);
    List<Comment> findByPostIdAndImageUrlIsNotNullAndIsHiddenFalseAndIsDeletedFalseOrderByCreatedAtDesc(String postId);
    long countByAuthorId(String authorId);
}
