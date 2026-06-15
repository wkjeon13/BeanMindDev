package com.beanmind.curator.domain.point.repository;

import com.beanmind.curator.domain.point.entity.PointTransaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PointTransactionRepository extends JpaRepository<PointTransaction, String> {
    List<PointTransaction> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    java.util.Optional<PointTransaction> findFirstByDescriptionContaining(String description);
}
