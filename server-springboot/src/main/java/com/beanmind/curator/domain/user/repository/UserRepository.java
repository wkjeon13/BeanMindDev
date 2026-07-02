package com.beanmind.curator.domain.user.repository;

import com.beanmind.curator.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findBySocialId(String socialId);

    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE (LOWER(u.nickname) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))) AND u.role = com.beanmind.curator.domain.user.entity.Role.OWNER")
    java.util.List<User> searchHosts(@org.springframework.data.repository.query.Param("query") String query);
}
