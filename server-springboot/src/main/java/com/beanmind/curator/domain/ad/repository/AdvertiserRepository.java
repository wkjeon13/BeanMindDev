package com.beanmind.curator.domain.ad.repository;

import com.beanmind.curator.domain.ad.entity.Advertiser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AdvertiserRepository extends JpaRepository<Advertiser, String> {
    Optional<Advertiser> findByUserId(String userId);
}
