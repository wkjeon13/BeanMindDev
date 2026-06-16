package com.beanmind.curator.domain.admin.repository;

import com.beanmind.curator.domain.admin.entity.DailyCheckIn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DailyCheckInRepository extends JpaRepository<DailyCheckIn, String> {
    List<DailyCheckIn> findByUserIdOrderByCreatedAtDesc(String userId);
}
