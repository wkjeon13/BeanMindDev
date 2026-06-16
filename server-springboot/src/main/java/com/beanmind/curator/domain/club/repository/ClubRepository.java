package com.beanmind.curator.domain.club.repository;

import com.beanmind.curator.domain.club.entity.Club;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClubRepository extends JpaRepository<Club, String>, ClubRepositoryCustom {
    Optional<Club> findByName(String name);
    List<Club> findByIsDeletedFalseAndIsPrivateFalseOrderByMemberCountDesc(org.springframework.data.domain.Pageable pageable);
    List<Club> findByIsDeletedFalseAndIsPrivateFalse();
    long countByOwnerId(String ownerId);
}
