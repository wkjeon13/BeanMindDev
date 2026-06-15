package com.beanmind.curator.domain.user.repository;

import com.beanmind.curator.domain.user.entity.ConsentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConsentHistoryRepository extends JpaRepository<ConsentHistory, String> {
}
