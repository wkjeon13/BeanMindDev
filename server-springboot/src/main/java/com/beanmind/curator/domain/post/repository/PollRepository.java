package com.beanmind.curator.domain.post.repository;

import com.beanmind.curator.domain.post.entity.Poll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PollRepository extends JpaRepository<Poll, String> {
    Optional<Poll> findByPostId(String postId);
    void deleteByPostId(String postId);
}
