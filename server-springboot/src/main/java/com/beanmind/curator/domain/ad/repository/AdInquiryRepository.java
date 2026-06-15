package com.beanmind.curator.domain.ad.repository;

import com.beanmind.curator.domain.ad.entity.AdInquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdInquiryRepository extends JpaRepository<AdInquiry, String> {
    List<AdInquiry> findByUserId(String userId);
}
