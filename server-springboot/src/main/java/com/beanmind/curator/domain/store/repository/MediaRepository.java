package com.beanmind.curator.domain.store.repository;

import com.beanmind.curator.domain.store.entity.Media;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaRepository extends JpaRepository<Media, String> {
    List<Media> findByStoreId(String storeId);
}
