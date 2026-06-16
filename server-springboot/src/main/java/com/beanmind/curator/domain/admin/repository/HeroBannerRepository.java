package com.beanmind.curator.domain.admin.repository;

import com.beanmind.curator.domain.admin.entity.HeroBanner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface HeroBannerRepository extends JpaRepository<HeroBanner, String> {

    @Query("SELECT h FROM HeroBanner h WHERE h.isActive = true " +
           "AND (h.countryCode = :countryCode OR h.countryCode = 'GLOBAL') " +
           "AND (h.startDate IS NULL OR h.startDate <= :now) " +
           "AND (h.endDate IS NULL OR h.endDate >= :now) " +
           "ORDER BY h.createdAt DESC")
    List<HeroBanner> findActiveHeroBanners(
            @Param("countryCode") String countryCode,
            @Param("now") LocalDateTime now,
            org.springframework.data.domain.Pageable pageable);
}
