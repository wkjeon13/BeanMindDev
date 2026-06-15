package com.beanmind.curator.domain.admin.repository;

import com.beanmind.curator.domain.admin.entity.UserAccessLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserAccessLogRepository extends JpaRepository<UserAccessLog, String> {
    Page<UserAccessLog> findByEmailContaining(String email, Pageable pageable);
    Page<UserAccessLog> findByIpAddressContaining(String ipAddress, Pageable pageable);
    Page<UserAccessLog> findByDeviceOS(String deviceOS, Pageable pageable);
    Page<UserAccessLog> findByActionType(String actionType, Pageable pageable);
    
    // Custom query for active users in last 7 days (DAU)
    // MySQL specific formatted query
    @Query(value = "SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as logDate, COUNT(DISTINCT COALESCE(user_id, ip_address)) as activeUsers " +
                   "FROM user_access_log " +
                   "WHERE created_at >= :sinceDate " +
                   "GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d') " +
                   "ORDER BY logDate ASC", nativeQuery = true)
    List<Object[]> findActiveUsersStats(LocalDateTime sinceDate);
}
