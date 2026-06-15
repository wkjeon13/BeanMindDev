package com.beanmind.curator.domain.admin.repository;

import com.beanmind.curator.domain.admin.entity.AdminActionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminActionLogRepository extends JpaRepository<AdminActionLog, String> {
    Page<AdminActionLog> findByAdminEmailContaining(String adminEmail, Pageable pageable);
    Page<AdminActionLog> findByActionType(String actionType, Pageable pageable);
    Page<AdminActionLog> findByTargetType(String targetType, Pageable pageable);
}
