package com.beanmind.curator.domain.club.repository;

import com.beanmind.curator.domain.club.entity.ClubMember;
import com.beanmind.curator.domain.club.entity.ClubRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClubMemberRepository extends JpaRepository<ClubMember, String> {
    Optional<ClubMember> findByClubIdAndUserId(String clubId, String userId);
    List<ClubMember> findByUserIdAndRoleIn(String userId, List<ClubRole> roles);
    List<ClubMember> findByClubIdAndRoleInOrderByRoleAscJoinedAtDesc(String clubId, List<ClubRole> roles);
    List<ClubMember> findByClubIdOrderByJoinedAtDesc(String clubId);
    
    @Query("SELECT cm.club.id, COUNT(cm) FROM ClubMember cm WHERE cm.club.id IN :clubIds AND cm.role = :role GROUP BY cm.club.id")
    List<Object[]> countPendingMembersByClubIds(@Param("clubIds") List<String> clubIds, @Param("role") ClubRole role);

    void deleteByClubIdAndUserId(String clubId, String userId);
}
