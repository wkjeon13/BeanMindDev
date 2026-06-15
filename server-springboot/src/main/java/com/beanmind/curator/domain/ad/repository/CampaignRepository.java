package com.beanmind.curator.domain.ad.repository;

import com.beanmind.curator.domain.ad.entity.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CampaignRepository extends JpaRepository<Campaign, String> {
    List<Campaign> findByContractId(String contractId);
}
