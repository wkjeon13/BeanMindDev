package com.beanmind.curator.domain.ad.repository;

import com.beanmind.curator.domain.ad.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContractRepository extends JpaRepository<Contract, String> {
}
