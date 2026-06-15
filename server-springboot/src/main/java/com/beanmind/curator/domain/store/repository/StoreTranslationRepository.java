package com.beanmind.curator.domain.store.repository;

import com.beanmind.curator.domain.store.entity.StoreTranslation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StoreTranslationRepository extends JpaRepository<StoreTranslation, String> {
    List<StoreTranslation> findByStoreId(String storeId);
}
