package com.beanmind.curator.domain.store.repository;

import com.beanmind.curator.domain.store.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StoreRepository extends JpaRepository<Store, String>, StoreRepositoryCustom {

    @Modifying
    @Query("UPDATE Store s SET s.mainImageUrl = :imageUrl, s.markerImageUrl = :imageUrl WHERE s.owner.id = :ownerId")
    int updateStoreImagesByOwnerId(@Param("ownerId") String ownerId, @Param("imageUrl") String imageUrl);

    java.util.Optional<Store> findFirstByOwnerId(String ownerId);

    java.util.Optional<Store> findFirstByNameContaining(String name);
}
