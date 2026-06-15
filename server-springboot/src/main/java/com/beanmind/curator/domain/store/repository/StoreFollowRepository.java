package com.beanmind.curator.domain.store.repository;

import com.beanmind.curator.domain.store.entity.StoreFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StoreFollowRepository extends JpaRepository<StoreFollow, String> {
    Optional<StoreFollow> findByUserIdAndStoreId(String userId, String storeId);
    java.util.List<StoreFollow> findByUserId(String userId);
}
