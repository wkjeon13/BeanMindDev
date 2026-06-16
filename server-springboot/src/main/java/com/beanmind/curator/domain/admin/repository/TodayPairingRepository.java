package com.beanmind.curator.domain.admin.repository;

import com.beanmind.curator.domain.admin.entity.TodayPairing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TodayPairingRepository extends JpaRepository<TodayPairing, String> {
    List<TodayPairing> findAllByOrderByOrderAscCreatedAtDesc();

    @Query("SELECT tp FROM TodayPairing tp WHERE tp.isActive = true " +
           "AND (tp.availableRegions = 'GLOBAL' OR tp.availableRegions LIKE %:countryCode%)")
    List<TodayPairing> findActivePairings(@Param("countryCode") String countryCode);
}
