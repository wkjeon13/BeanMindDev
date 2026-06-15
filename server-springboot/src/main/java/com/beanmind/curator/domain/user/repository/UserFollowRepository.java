package com.beanmind.curator.domain.user.repository;

import com.beanmind.curator.domain.user.entity.UserFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserFollowRepository extends JpaRepository<UserFollow, String> {
    List<UserFollow> findByFollowerId(String followerId);
    Optional<UserFollow> findByFollowerIdAndFollowingId(String followerId, String followingId);
}
