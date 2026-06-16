package com.beanmind.curator.domain.analytics.repository;

import com.beanmind.curator.domain.analytics.entity.AnonymousVisitor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface AnonymousVisitorRepository extends JpaRepository<AnonymousVisitor, String> {
    Optional<AnonymousVisitor> findByVisitorId(String visitorId);

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO `AnonymousVisitor` (id, visitorId, visitCount, lastVisit, createdAt, aiUsageCount, hasUsedAi) " +
                   "VALUES (:id, :visitorId, 1, :now, :now, 0, 0) " +
                   "ON DUPLICATE KEY UPDATE visitCount = visitCount + 1, lastVisit = :now", nativeQuery = true)
    void upsertVisit(@Param("id") String id, @Param("visitorId") String visitorId, @Param("now") LocalDateTime now);

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO `AnonymousVisitor` (id, visitorId, visitCount, lastVisit, createdAt, aiUsageCount, hasUsedAi) " +
                   "VALUES (:id, :visitorId, 1, :now, :now, 1, 1) " +
                   "ON DUPLICATE KEY UPDATE hasUsedAi = 1, aiUsageCount = aiUsageCount + 1, lastVisit = :now", nativeQuery = true)
    void upsertAiUsage(@Param("id") String id, @Param("visitorId") String visitorId, @Param("now") LocalDateTime now);
}
