package com.beanmind.curator.domain.store.repository;

import com.beanmind.curator.domain.store.dto.ShopSearchRequest;
import com.beanmind.curator.domain.store.entity.Store;

import java.util.List;

public interface StoreRepositoryCustom {
    List<Store> searchShops(ShopSearchRequest request);
}
