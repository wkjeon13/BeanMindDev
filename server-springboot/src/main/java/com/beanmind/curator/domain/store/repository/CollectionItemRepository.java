package com.beanmind.curator.domain.store.repository;

import com.beanmind.curator.domain.store.entity.CollectionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CollectionItemRepository extends JpaRepository<CollectionItem, String> {
}
