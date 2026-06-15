package com.beanmind.curator.domain.store.repository;

import com.beanmind.curator.domain.store.dto.ShopSearchRequest;
import com.beanmind.curator.domain.store.entity.CoffeeType;
import com.beanmind.curator.domain.store.entity.QStore;
import com.beanmind.curator.domain.store.entity.Store;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class StoreRepositoryImpl implements StoreRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<Store> searchShops(ShopSearchRequest request) {
        QStore store = QStore.store;
        BooleanBuilder builder = new BooleanBuilder();

        // 1. Status is APPROVED
        builder.and(store.status.eq("APPROVED"));

        // 2. Country code guard (Approximate bounding coordinate ranges)
        if (StringUtils.hasText(request.getCountryCode()) && !"GLOBAL".equalsIgnoreCase(request.getCountryCode())) {
            String cc = request.getCountryCode().toUpperCase();
            if ("KR".equals(cc)) {
                builder.and(store.lng.goe(120.0)).and(store.lng.loe(135.0));
            } else if ("US".equals(cc)) {
                builder.and(store.lng.goe(-180.0)).and(store.lng.loe(-60.0));
            } else if ("JP".equals(cc)) {
                builder.and(store.lng.goe(128.0)).and(store.lng.loe(150.0));
            } else if ("CN".equals(cc)) {
                builder.and(store.lng.goe(73.0)).and(store.lng.loe(135.0));
            }
        }

        // 3. Coffee Type Filter
        if (StringUtils.hasText(request.getType()) && !"ALL".equalsIgnoreCase(request.getType())) {
            String type = request.getType().toUpperCase();
            if ("SINGLE_ORIGIN".equals(type)) {
                builder.and(store.primaryCoffeeType.in(CoffeeType.SINGLE_ORIGIN, CoffeeType.SPECIALTY_ROASTERY));
            } else if ("BLENDED".equals(type)) {
                builder.and(store.primaryCoffeeType.in(CoffeeType.BLENDED, CoffeeType.SPECIALTY_ROASTERY));
            } else {
                try {
                    builder.and(store.primaryCoffeeType.eq(CoffeeType.valueOf(type)));
                } catch (IllegalArgumentException e) {
                    // Ignore invalid enum values
                }
            }
        }

        // 4. Boolean Tag Filters
        if (Boolean.TRUE.equals(request.getHasParking())) builder.and(store.hasParking.eq(true));
        if (Boolean.TRUE.equals(request.getHasWifi())) builder.and(store.hasWifi.eq(true));
        if (Boolean.TRUE.equals(request.getHasPetFriendly())) builder.and(store.hasPetFriendly.eq(true));
        if (Boolean.TRUE.equals(request.getHasPowerOutlets())) builder.and(store.hasPowerOutlets.eq(true));

        // 5. Keyword search (q)
        if (StringUtils.hasText(request.getQ())) {
            String keyword = request.getQ().trim();
            builder.and(store.name.containsIgnoreCase(keyword)
                    .or(store.signatureBean.containsIgnoreCase(keyword)));
        }

        // 6. Coordinates: Bounding Box
        if (request.getMinLat() != null && request.getMaxLat() != null &&
            request.getMinLng() != null && request.getMaxLng() != null) {
            builder.and(store.lat.between(request.getMinLat(), request.getMaxLat()));
            builder.and(store.lng.between(request.getMinLng(), request.getMaxLng()));
        }
        // 7. Coordinates: Center Location + Radius Fallback
        else if (request.getLat() != null && request.getLng() != null) {
            double centerLat = request.getLat();
            double centerLng = request.getLng();
            double r = request.getRadius() != null ? request.getRadius() : 10.0; // Default 10km

            double latDelta = r / 111.0;
            double lngDelta = r / (111.0 * Math.cos(Math.toRadians(centerLat)));

            builder.and(store.lat.between(centerLat - latDelta, centerLat + latDelta));
            builder.and(store.lng.between(centerLng - lngDelta, centerLng + lngDelta));
        }

        return queryFactory
                .selectFrom(store)
                .where(builder)
                .orderBy(store.isPremiumTop.desc(), store.createdAt.desc())
                .limit(300)
                .fetch();
    }
}
