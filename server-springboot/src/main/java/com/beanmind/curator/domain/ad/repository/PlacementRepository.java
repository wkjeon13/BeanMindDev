package com.beanmind.curator.domain.ad.repository;

import com.beanmind.curator.domain.ad.entity.Placement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlacementRepository extends JpaRepository<Placement, String> {
    Optional<Placement> findByLocationKey(String locationKey);
}
