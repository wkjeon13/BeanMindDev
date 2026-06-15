package com.beanmind.curator.domain.ai.repository;

import com.beanmind.curator.domain.ai.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, String> {
    List<Prescription> findByUserIdOrderByCreatedAtDesc(String userId);
}
