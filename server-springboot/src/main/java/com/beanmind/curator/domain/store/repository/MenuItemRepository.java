package com.beanmind.curator.domain.store.repository;

import com.beanmind.curator.domain.store.entity.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, String> {
    List<MenuItem> findByStoreIdOrderByOrderIndexAsc(String storeId);
}
