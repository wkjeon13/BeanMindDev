package com.beanmind.curator.domain.admin.repository;

import com.beanmind.curator.domain.admin.entity.LegalPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LegalPolicyRepository extends JpaRepository<LegalPolicy, String> {
    Optional<LegalPolicy> findByPolicyTypeAndVersion(String policyType, String version);
    Optional<LegalPolicy> findByPolicyTypeAndIsActiveTrue(String policyType);
    List<LegalPolicy> findByPolicyType(String policyType);
    List<LegalPolicy> findAllByOrderByPolicyTypeAscVersionDesc();
}
