package com.beanmind.curator.domain.admin.repository;

import com.beanmind.curator.domain.admin.entity.FlashDrop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FlashDropRepository extends JpaRepository<FlashDrop, String> {
    Optional<FlashDrop> findFirstByStatusAndEndTimeAfter(String status, LocalDateTime timeLimit);

    @Query("SELECT fd FROM FlashDrop fd WHERE fd.status = :status " +
           "AND fd.endTime > :limit " +
           "AND fd.region IN :regions " +
           "ORDER BY fd.startTime ASC")
    List<FlashDrop> findActiveFlashDrops(
            @Param("status") String status,
            @Param("limit") LocalDateTime limit,
            @Param("regions") List<String> regions);
}
