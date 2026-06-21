package com.beanmind.curator.domain.store.service;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.common.util.EncryptionUtil;
import com.beanmind.curator.domain.store.dto.ShopResponse;
import com.beanmind.curator.domain.store.dto.ShopSearchRequest;
import com.beanmind.curator.domain.store.entity.Store;
import com.beanmind.curator.domain.store.entity.StoreTranslation;
import com.beanmind.curator.domain.store.repository.StoreRepository;
import com.beanmind.curator.domain.post.repository.PostRepository;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShopService {

    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;

    @Transactional
    public List<ShopResponse> searchShops(ShopSearchRequest request, String userEmail) {
        // 1. Fetch user preferences if authenticated
        User userPrefs = null;
        if (StringUtils.hasText(userEmail)) {
            userPrefs = userRepository.findByEmail(userEmail).orElse(null);
        }

        // 2. Query stores from DB using Custom QueryDSL search
        List<Store> stores = storeRepository.searchShops(request);

        final User finalUserPrefs = userPrefs;

        // 3. Process and convert to DTOs
        List<ShopResponse> responses = stores.stream()
                .map(store -> {
                    // Handle translation fallbacks
                    String shortDesc = store.getShortDesc();
                    String longDesc = store.getLongDesc();
                    if (StringUtils.hasText(request.getLang())) {
                        Optional<StoreTranslation> trans = store.getTranslations().stream()
                                .filter(t -> request.getLang().equalsIgnoreCase(t.getLanguageCode()))
                                .findFirst();
                        if (trans.isPresent()) {
                            if (trans.get().getShortDesc() != null) shortDesc = trans.get().getShortDesc();
                            if (trans.get().getLongDesc() != null) longDesc = trans.get().getLongDesc();
                        }
                    }

                    // Calculate reviews stats
                    int reviewCount = store.getReviews().size();
                    double avgRating = 0.0;
                    if (reviewCount > 0) {
                        double sum = store.getReviews().stream()
                                .mapToDouble(r -> r.getOverall() != null ? r.getOverall() : 5.0)
                                .sum();
                        avgRating = sum / reviewCount;
                    }

                    // Calculate AI Match Rate (Euclidean distance)
                    Integer matchRate = null;
                    if (finalUserPrefs != null && 
                        finalUserPrefs.getPrefAcidity() != null && 
                        finalUserPrefs.getPrefSweetness() != null && 
                        finalUserPrefs.getPrefBitterness() != null && 
                        finalUserPrefs.getPrefBody() != null && 
                        store.getAcidity() != null && 
                        store.getSweetness() != null && 
                        store.getBitterness() != null && 
                        store.getBody() != null) {
                        double dist = Math.sqrt(
                                Math.pow(finalUserPrefs.getPrefAcidity() - store.getAcidity(), 2) +
                                Math.pow(finalUserPrefs.getPrefSweetness() - store.getSweetness(), 2) +
                                Math.pow(finalUserPrefs.getPrefBitterness() - store.getBitterness(), 2) +
                                Math.pow(finalUserPrefs.getPrefBody() - store.getBody(), 2)
                        );
                        double matchPercent = Math.max(0, 100 - (dist / 8.0) * 100);
                        matchRate = (int) Math.round(matchPercent);
                    }

                    // Decrypt PII fields
                    String decryptedAddress = store.getAddress();
                    try {
                        decryptedAddress = EncryptionUtil.decryptPII(decryptedAddress);
                    } catch (Exception e) {
                        log.error("Failed to decrypt address for store: {}", store.getId(), e);
                    }
                    String decryptedPhone = store.getPhone();
                    try {
                        decryptedPhone = EncryptionUtil.decryptPII(decryptedPhone);
                    } catch (Exception e) {
                        log.error("Failed to decrypt phone for store: {}", store.getId(), e);
                    }

                    // Map Media & MenuItems
                    List<ShopResponse.MediaInfo> mediaList = store.getMedia().stream()
                            .map(m -> ShopResponse.MediaInfo.builder()
                                    .id(m.getId())
                                    .url(m.getUrl())
                                    .type(m.getType())
                                    .build())
                            .collect(Collectors.toList());

                    return ShopResponse.builder()
                            .id(store.getId())
                            .name(store.getName())
                            .address(decryptedAddress)
                            .phone(decryptedPhone)
                            .shortDesc(shortDesc)
                            .longDesc(longDesc)
                            .websiteUrl(store.getWebsiteUrl())
                            .lat(store.getLat())
                            .lng(store.getLng())
                            .signatureBean(store.getSignatureBean())
                            .primaryCoffeeType(store.getPrimaryCoffeeType().name())
                            .acidity(store.getAcidity())
                            .sweetness(store.getSweetness())
                            .bitterness(store.getBitterness())
                            .body(store.getBody())
                            .equipment(store.getEquipment())
                            .signatureMenu(store.getSignatureMenu())
                            .dessertPairing(store.getDessertPairing())
                            .hasDecaf(store.getHasDecaf())
                            .hasOatMilk(store.getHasOatMilk())
                            .hasParking(store.getHasParking())
                            .hasWifi(store.getHasWifi())
                            .hasPetFriendly(store.getHasPetFriendly())
                            .hasPowerOutlets(store.getHasPowerOutlets())
                            .hours(store.getHours())
                            .status(store.getStatus())
                            .mainImageUrl(store.getMainImageUrl())
                            .markerImageUrl(store.getMarkerImageUrl())
                            .coffeeMenuImageUrl(store.getCoffeeMenuImageUrl())
                            .popularMenuImageUrl(store.getPopularMenuImageUrl())
                            .beanOrigin(store.getBeanOrigin())
                            .beanRoastLevel(store.getBeanRoastLevel())
                            .beanNotes(store.getBeanNotes())
                            .isPremiumTop(store.getIsPremiumTop())
                            .reviewCount(reviewCount)
                            .averageRating(avgRating)
                            .matchRate(matchRate)
                            .media(mediaList)
                            .build();
                })
                .collect(Collectors.toList());

        // 4. Post-fetch region filter since DB column is encrypted
        if (StringUtils.hasText(request.getRegionQuery())) {
            String region = request.getRegionQuery().trim();
            if ("경기도".equals(region) || "경기".equals(region)) {
                responses = responses.stream()
                        .filter(res -> res.getAddress().contains("경기") && !res.getAddress().contains("서울"))
                        .collect(Collectors.toList());
            } else if ("서울".equals(region) || "서울특별시".equals(region)) {
                responses = responses.stream()
                        .filter(res -> res.getAddress().contains("서울"))
                        .collect(Collectors.toList());
            } else {
                responses = responses.stream()
                        .filter(res -> res.getAddress().contains(region))
                        .collect(Collectors.toList());
            }
        }

        // 5. Custom Sorting by primaryCoffeeType
        Map<String, Integer> sortOrder = Map.of(
                "SINGLE_ORIGIN", 1,
                "SPECIALTY_ROASTERY", 2,
                "BLENDED", 3,
                "GENERAL", 4
        );
        responses.sort((a, b) -> {
            int orderA = sortOrder.getOrDefault(a.getPrimaryCoffeeType(), 5);
            int orderB = sortOrder.getOrDefault(b.getPrimaryCoffeeType(), 5);
            return Integer.compare(orderA, orderB);
        });

        // 6. Bulk update AI Recommend Count
        if (!responses.isEmpty()) {
            try {
                List<String> ids = responses.stream().map(ShopResponse::getId).collect(Collectors.toList());
                // Simple bulk updates via storeRepository directly
                // (Can run async in production or directly inside the transaction)
                storeRepository.findAllById(ids).forEach(st -> {
                    st.setAiRecommendCount(st.getAiRecommendCount() + 1);
                    storeRepository.save(st);
                });
            } catch (Exception e) {
                log.error("Failed to increment aiRecommendCount", e);
            }
        }

        return responses;
    }

    @Transactional(readOnly = true)
    public ShopResponse getShopDetail(String id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));

        String decryptedAddress = store.getAddress();
        try {
            decryptedAddress = EncryptionUtil.decryptPII(decryptedAddress);
        } catch (Exception e) {
            log.error("Failed to decrypt address for store: {}", store.getId(), e);
        }
        String decryptedPhone = store.getPhone();
        try {
            decryptedPhone = EncryptionUtil.decryptPII(decryptedPhone);
        } catch (Exception e) {
            log.error("Failed to decrypt phone for store: {}", store.getId(), e);
        }

        // Map Media
        List<ShopResponse.MediaInfo> mediaList = store.getMedia().stream()
                .map(m -> ShopResponse.MediaInfo.builder()
                        .id(m.getId())
                        .url(m.getUrl())
                        .type(m.getType())
                        .build())
                .collect(Collectors.toList());

        return ShopResponse.builder()
                .id(store.getId())
                .name(store.getName())
                .address(decryptedAddress)
                .phone(decryptedPhone)
                .shortDesc(store.getShortDesc())
                .longDesc(store.getLongDesc())
                .websiteUrl(store.getWebsiteUrl())
                .lat(store.getLat())
                .lng(store.getLng())
                .signatureBean(store.getSignatureBean())
                .primaryCoffeeType(store.getPrimaryCoffeeType().name())
                .acidity(store.getAcidity())
                .sweetness(store.getSweetness())
                .bitterness(store.getBitterness())
                .body(store.getBody())
                .equipment(store.getEquipment())
                .signatureMenu(store.getSignatureMenu())
                .dessertPairing(store.getDessertPairing())
                .hasDecaf(store.getHasDecaf())
                .hasOatMilk(store.getHasOatMilk())
                .hasParking(store.getHasParking())
                .hasWifi(store.getHasWifi())
                .hasPetFriendly(store.getHasPetFriendly())
                .hasPowerOutlets(store.getHasPowerOutlets())
                .hours(store.getHours())
                .status(store.getStatus())
                .mainImageUrl(store.getMainImageUrl())
                .markerImageUrl(store.getMarkerImageUrl())
                .coffeeMenuImageUrl(store.getCoffeeMenuImageUrl())
                .popularMenuImageUrl(store.getPopularMenuImageUrl())
                .beanOrigin(store.getBeanOrigin())
                .beanRoastLevel(store.getBeanRoastLevel())
                .beanNotes(store.getBeanNotes())
                .isPremiumTop(store.getIsPremiumTop())
                .media(mediaList)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ShopResponse> getTrendingShops(String countryCode, String userEmail) {
        String finalCountryCode = (countryCode != null && !"GLOBAL".equalsIgnoreCase(countryCode)) ? countryCode : null;

        if (StringUtils.hasText(userEmail)) {
            try {
                User dbUser = userRepository.findByEmail(userEmail).orElse(null);
                if (dbUser != null && StringUtils.hasText(dbUser.getCountryCode()) && !"GLOBAL".equalsIgnoreCase(dbUser.getCountryCode())) {
                    finalCountryCode = dbUser.getCountryCode();
                }
            } catch (Exception e) {
                log.error("Failed to fetch user country code in trending", e);
            }
        }

        LocalDateTime threeMonthsAgo = LocalDateTime.now().minusMonths(3);
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 5);
        List<String> topStoreIds = postRepository.findTrendingStoreIds(threeMonthsAgo, finalCountryCode, pageable);

        List<Store> stores = new ArrayList<>();
        if (topStoreIds != null && !topStoreIds.isEmpty()) {
            stores = storeRepository.findByIdInAndStatus(topStoreIds, "APPROVED");
        }

        if (stores.isEmpty()) {
            stores = storeRepository.findTop5ByStatusOrderByCreatedAtDesc("APPROVED");
        }

        final List<String> finalTopStoreIds = topStoreIds != null ? topStoreIds : new ArrayList<>();

        List<ShopResponse> responses = stores.stream()
                .map(store -> {
                    String decryptedAddress = store.getAddress();
                    try {
                        decryptedAddress = EncryptionUtil.decryptPII(decryptedAddress);
                    } catch (Exception e) {
                        log.error("Failed to decrypt address for store: {}", store.getId(), e);
                    }
                    return ShopResponse.builder()
                            .id(store.getId())
                            .name(store.getName())
                            .address(decryptedAddress)
                            .lat(store.getLat())
                            .lng(store.getLng())
                            .mainImageUrl(store.getMainImageUrl())
                            .markerImageUrl(store.getMarkerImageUrl())
                            .primaryCoffeeType(store.getPrimaryCoffeeType() != null ? store.getPrimaryCoffeeType().name() : null)
                            .isPremiumTop(store.getIsPremiumTop())
                            .build();
                })
                .collect(Collectors.toList());

        responses.sort((a, b) -> {
            int idxA = finalTopStoreIds.indexOf(a.getId());
            int idxB = finalTopStoreIds.indexOf(b.getId());
            return Integer.compare(idxA, idxB);
        });

        return responses;
    }
}
