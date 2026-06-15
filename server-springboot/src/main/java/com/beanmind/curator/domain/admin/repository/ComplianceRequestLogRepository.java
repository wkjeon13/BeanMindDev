package com.beanmind.curator.domain.admin.repository;

import com.beanmind.curator.domain.admin.entity.ComplianceRequestLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ComplianceRequestLogRepository extends JpaRepository<ComplianceRequestLog, String> {
    Page<ComplianceRequestLog> findByRequestEmailContaining(String requestEmail, Pageable pageable);
    Page<ComplianceRequestLog> findByRequestType(String requestType, Pageable pageable);
    Page<ComplianceRequestLog> findByStatus(String status, Pageable pageable);
}
