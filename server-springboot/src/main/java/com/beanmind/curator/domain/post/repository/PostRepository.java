package com.beanmind.curator.domain.post.repository;

import com.beanmind.curator.domain.post.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostRepository extends JpaRepository<Post, String>, PostRepositoryCustom {
}
