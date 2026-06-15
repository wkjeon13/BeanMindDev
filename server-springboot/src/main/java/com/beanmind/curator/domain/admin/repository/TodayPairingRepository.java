package com.beanmind.curator.domain.admin.repository;

import com.beanmind.curator.domain.admin.entity.TodayPairing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TodayPairingRepository extends JpaRepository<TodayPairing, String> {
    List<TodayPairing> findAllByOrderByOrderAscCreatedAtDesc();
}
