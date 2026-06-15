package com.beanmind.curator.domain.post.repository;

import com.beanmind.curator.domain.post.entity.PollOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PollOptionRepository extends JpaRepository<PollOption, String> {
}
