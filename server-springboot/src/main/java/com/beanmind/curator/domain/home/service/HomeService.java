package com.beanmind.curator.domain.home.service;

import com.beanmind.curator.domain.admin.entity.FlashDrop;
import com.beanmind.curator.domain.admin.entity.HeroBanner;
import com.beanmind.curator.domain.admin.entity.SystemSetting;
import com.beanmind.curator.domain.admin.entity.TodayPairing;
import com.beanmind.curator.domain.admin.entity.TodayPairingTranslation;
import com.beanmind.curator.domain.admin.repository.FlashDropRepository;
import com.beanmind.curator.domain.admin.repository.HeroBannerRepository;
import com.beanmind.curator.domain.admin.repository.SystemSettingRepository;
import com.beanmind.curator.domain.admin.repository.TodayPairingRepository;
import com.beanmind.curator.domain.ai.entity.Prescription;
import com.beanmind.curator.domain.ai.repository.PrescriptionRepository;
import com.beanmind.curator.domain.club.entity.Club;
import com.beanmind.curator.domain.club.entity.ClubMember;
import com.beanmind.curator.domain.club.dto.ClubResponse;
import com.beanmind.curator.domain.club.repository.ClubMemberRepository;
import com.beanmind.curator.domain.club.repository.ClubRepository;
import com.beanmind.curator.domain.home.dto.PersonalizedHomeResponse;
import com.beanmind.curator.domain.post.dto.PostResponse;
import com.beanmind.curator.domain.post.entity.Post;
import com.beanmind.curator.domain.post.repository.PostRepository;
import com.beanmind.curator.domain.post.service.PostService;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.entity.UserFollow;
import com.beanmind.curator.domain.store.entity.StoreFollow;
import com.beanmind.curator.domain.user.repository.UserFollowRepository;
import com.beanmind.curator.domain.store.repository.StoreFollowRepository;
import com.beanmind.curator.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class HomeService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostService postService;
    private final ClubRepository clubRepository;
    private final ClubMemberRepository clubMemberRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final TodayPairingRepository todayPairingRepository;
    private final FlashDropRepository flashDropRepository;
    private final HeroBannerRepository heroBannerRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final UserFollowRepository userFollowRepository;
    private final StoreFollowRepository storeFollowRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public PersonalizedHomeResponse getPersonalizedHome(String countryCode, Double lat, Double lng, String userEmail) {
        String currentUserId = null;
        User user = null;
        Prescription latestPrescription = null;
        List<PostResponse> followingFeeds = new ArrayList<>();

        if (StringUtils.hasText(userEmail)) {
            user = userRepository.findByEmail(userEmail).orElse(null);
            if (user != null) {
                currentUserId = user.getId();
                
                // 1. Latest Prescription
                List<Prescription> prescriptions = prescriptionRepository.findByUserIdOrderByCreatedAtDesc(currentUserId);
                if (!prescriptions.isEmpty()) {
                    latestPrescription = prescriptions.get(0);
                }

                // 2. Following Feeds
                List<UserFollow> followedUsers = userFollowRepository.findByFollowerId(currentUserId);
                List<String> followedUserIds = followedUsers.stream().map(u -> u.getFollowing().getId()).collect(Collectors.toList());

                List<StoreFollow> followedStores = storeFollowRepository.findByUserId(currentUserId);
                List<String> followedStoreIds = followedStores.stream().map(sf -> sf.getStore().getId()).collect(Collectors.toList());

                if (!followedUserIds.isEmpty() || !followedStoreIds.isEmpty()) {
                    List<Post> posts = postRepository.findFollowingFeeds(
                            followedUserIds.isEmpty() ? List.of("DUMMY_USER") : followedUserIds, 
                            followedStoreIds.isEmpty() ? List.of("DUMMY_STORE") : followedStoreIds, 
                            PageRequest.of(0, 5)
                    );
                    final String finalCurrentUserId = currentUserId;
                    followingFeeds = posts.stream()
                            .map(p -> PostResponse.of(p, finalCurrentUserId))
                            .collect(Collectors.toList());
                }
            }
        }

        // Determine country code
        String finalCountryCode = (countryCode != null && !"GLOBAL".equalsIgnoreCase(countryCode)) ? countryCode : "KR";
        if (user != null && StringUtils.hasText(user.getCountryCode()) && !"GLOBAL".equalsIgnoreCase(user.getCountryCode())) {
            finalCountryCode = user.getCountryCode();
        }

        // 3. Taste Matched Feeds
        Pageable matchPage = PageRequest.of(0, 50);
        List<Post> rawTasteFeeds = postRepository.findPersonalizedBasePosts(finalCountryCode, matchPage);
        if (rawTasteFeeds.size() < 3 && !"KR".equals(finalCountryCode)) {
            rawTasteFeeds = postRepository.findPersonalizedBasePosts(null, matchPage);
        }

        final List<String> userInterests = (user != null && StringUtils.hasText(user.getInterests()))
                ? Arrays.stream(user.getInterests().split(",")).map(String::trim).map(String::toLowerCase).collect(Collectors.toList())
                : Collections.emptyList();

        final User finalUser = user;
        final String finalCountryCodeString = finalCountryCode;
        List<PostResponse> tasteMatchedFeeds = rawTasteFeeds.stream()
                .map(post -> {
                    double interestScore = 0;
                    String matchReason = "";

                    if (!userInterests.isEmpty() && StringUtils.hasText(post.getContent())) {
                        String contentLower = post.getContent().toLowerCase();
                        for (String interest : userInterests) {
                            String cleanInterest = interest.replace("#", "");
                            if (contentLower.contains(cleanInterest)) {
                                interestScore += 25;
                                if (matchReason.isEmpty()) {
                                    matchReason = "🎯 #" + cleanInterest + " 관심사 매치";
                                }
                            }
                        }
                        interestScore = Math.min(interestScore, 50);
                    }

                    double tasteScore = 0;
                    if (finalUser != null && finalUser.getPrefAcidity() != null && post.getAcidity() != null) {
                        double distSq = 0;
                        int count = 0;

                        distSq += Math.pow(finalUser.getPrefAcidity() - post.getAcidity(), 2); count++;
                        if (finalUser.getPrefBody() != null && post.getBody() != null) { distSq += Math.pow(finalUser.getPrefBody() - post.getBody(), 2); count++; }
                        if (finalUser.getPrefSweetness() != null && post.getSweetness() != null) { distSq += Math.pow(finalUser.getPrefSweetness() - post.getSweetness(), 2); count++; }
                        if (finalUser.getPrefBitterness() != null && post.getBitterness() != null) { distSq += Math.pow(finalUser.getPrefBitterness() - post.getBitterness(), 2); count++; }

                        if (count > 0) {
                            double avgDist = Math.sqrt(distSq / count);
                            tasteScore = Math.max(0, 50 - (avgDist * 10));

                            if (matchReason.isEmpty() && tasteScore > 35) {
                                matchReason = "US".equals(finalCountryCodeString)
                                        ? String.format("🎯 %d%% Taste Match", (int) Math.round(tasteScore * 2))
                                        : String.format("🎯 %d%% 취향 일치", (int) Math.round(tasteScore * 2));
                            }
                        }
                    }

                    PostResponse resp = PostResponse.of(post, finalUser != null ? finalUser.getId() : null);
                    resp.setMatchReason(matchReason);
                    resp.setMatchScore(interestScore + tasteScore);
                    return resp;
                })
                .collect(Collectors.toList());

        // 4. My Club Feeds or Recommended Clubs
        List<PostResponse> myClubFeeds = new ArrayList<>();
        List<ClubResponse> recommendedClubs = new ArrayList<>();

        List<ClubMember> memberships = currentUserId != null
                ? clubMemberRepository.findByUserId(currentUserId)
                : Collections.emptyList();
        List<String> myClubIds = memberships.stream().map(m -> m.getClub().getId()).collect(Collectors.toList());

        if (!myClubIds.isEmpty()) {
            List<Post> clubPosts = postRepository.findRecentClubFeeds(myClubIds);
            Set<String> seenClubIds = new HashSet<>();
            final String finalCurrentUserId2 = currentUserId;
            for (Post p : clubPosts) {
                if (p.getClubId() != null && !seenClubIds.contains(p.getClubId())) {
                    seenClubIds.add(p.getClubId());
                    myClubFeeds.add(PostResponse.of(p, finalCurrentUserId2));
                    if (myClubFeeds.size() >= 10) break;
                }
            }
        } else {
            if (lat != null && lng != null) {
                List<Club> allClubs = clubRepository.findByIsDeletedFalseAndIsPrivateFalse();
                List<ClubResponse> sortedClubs = allClubs.stream()
                        .map(c -> {
                            double dist = 999999;
                            if (c.getLat() != null && c.getLng() != null) {
                                double dLat = c.getLat() - lat;
                                double dLng = c.getLng() - lng;
                                dist = dLat * dLat + dLng * dLng;
                            }
                            ClubResponse resp = ClubResponse.of(c, null, false, null, 0);
                            return new AbstractMap.SimpleEntry<>(resp, dist);
                        })
                        .sorted(Comparator.comparingDouble(AbstractMap.SimpleEntry::getValue))
                        .map(AbstractMap.SimpleEntry::getKey)
                        .limit(5)
                        .collect(Collectors.toList());
                recommendedClubs = sortedClubs;
            } else {
                List<Club> popularClubs = clubRepository.findByIsDeletedFalseAndIsPrivateFalseOrderByMemberCountDesc(PageRequest.of(0, 5));
                recommendedClubs = popularClubs.stream()
                        .map(c -> ClubResponse.of(c, null, false, null, 0))
                        .collect(Collectors.toList());
            }
        }

        // 5. Today's Pairings
        String targetLang = "ko";
        if ("US".equals(finalCountryCode)) targetLang = "en";
        else if ("JP".equals(finalCountryCode)) targetLang = "ja";
        else if ("CN".equals(finalCountryCode)) targetLang = "zh";

        List<TodayPairing> pairings = todayPairingRepository.findActivePairings(finalCountryCode);
        final String finalTargetLang = targetLang;
        List<PersonalizedHomeResponse.PairingDto> todayPairingDtos = pairings.stream()
                .map(p -> {
                    TodayPairingTranslation translation = p.getTranslations().stream()
                            .filter(t -> finalTargetLang.equalsIgnoreCase(t.getLanguageCode()))
                            .findFirst()
                            .orElse(p.getTranslations().stream()
                                    .filter(t -> "en".equalsIgnoreCase(t.getLanguageCode()))
                                    .findFirst()
                                    .orElse(p.getTranslations().stream()
                                            .filter(t -> "ko".equalsIgnoreCase(t.getLanguageCode()))
                                            .findFirst()
                                            .orElse(p.getTranslations().isEmpty() ? null : p.getTranslations().get(0))));
                    return PersonalizedHomeResponse.PairingDto.builder()
                            .id(p.getId())
                            .icon(p.getIcon())
                            .order(p.getOrder())
                            .name(translation != null ? translation.getName() : "Unknown")
                            .coffee(translation != null ? translation.getCoffee() : "Unknown")
                            .desc(translation != null ? translation.getDesc() : "")
                            .season(translation != null ? translation.getSeason() : null)
                            .tasteProfile(translation != null ? translation.getTasteProfile() : null)
                            .build();
                })
                .collect(Collectors.toList());

        Collections.shuffle(todayPairingDtos);
        if (todayPairingDtos.size() > 4) {
            todayPairingDtos = todayPairingDtos.subList(0, 4);
        }

        // 6. User Pairings
        String pairingTag = "US".equals(finalCountryCode) ? "#Pairing" : "#페어링";
        List<Post> userPairingPosts = postRepository.findUserPairingPosts(finalCountryCode, pairingTag, PageRequest.of(0, 5));
        if (userPairingPosts.isEmpty()) {
            userPairingPosts = postRepository.findUserPairingPosts(null, "#Pairing", PageRequest.of(0, 5));
            if (userPairingPosts.isEmpty()) {
                userPairingPosts = postRepository.findUserPairingPosts(null, "#페어링", PageRequest.of(0, 5));
            }
        }
        final String finalCurrentUserId3 = currentUserId;
        List<PostResponse> userPairingPostResponses = userPairingPosts.stream()
                .map(p -> PostResponse.of(p, finalCurrentUserId3))
                .collect(Collectors.toList());

        // 7. Hot Coffee Talk Feeds (인기 커피톡)
        List<PostResponse> rawHotFeeds = postService.getPosts(
                finalCurrentUserId3, 
                null, 
                null, 
                null, 
                finalCountryCode, 
                "popular", 
                30, 
                0
        );
        if (rawHotFeeds.isEmpty() && !"GLOBAL".equalsIgnoreCase(finalCountryCode)) {
            rawHotFeeds = postService.getPosts(
                    finalCurrentUserId3, 
                    null, 
                    null, 
                    null, 
                    null, 
                    "popular", 
                    30, 
                    0
            );
        }
        List<PostResponse> hotCoffeeTalkFeeds = rawHotFeeds.stream()
                .filter(p -> p.getPostType() == com.beanmind.curator.domain.post.entity.PostType.NORMAL)
                .limit(8)
                .collect(Collectors.toList());

        // 8. Newest Coffee Talk Feeds (최신 피드)
        List<PostResponse> rawNewestFeeds = postService.getPosts(
                finalCurrentUserId3, 
                null, 
                null, 
                null, 
                finalCountryCode, 
                null, 
                10, 
                0
        );
        if (rawNewestFeeds.isEmpty() && !"GLOBAL".equalsIgnoreCase(finalCountryCode)) {
            rawNewestFeeds = postService.getPosts(
                    finalCurrentUserId3, 
                    null, 
                    null, 
                    null, 
                    null, 
                    null, 
                    10, 
                    0
            );
        }
        List<PostResponse> newestCoffeeTalkFeeds = rawNewestFeeds.stream()
                .filter(p -> p.getPostType() == com.beanmind.curator.domain.post.entity.PostType.NORMAL)
                .limit(2)
                .collect(Collectors.toList());

        // 9. Hero Banner
        HeroBanner heroBanner = null;
        List<HeroBanner> activeBanners = heroBannerRepository.findActiveHeroBanners(finalCountryCode, LocalDateTime.now(), PageRequest.of(0, 1));
        if (!activeBanners.isEmpty()) {
            heroBanner = activeBanners.get(0);
        }

        // 10. Native Ad / Weekly MBTI / Campaigns
        Object nativeAd = null;
        SystemSetting nativeAdSetting = systemSettingRepository.findById("HOME_NATIVE_AD").orElse(null);
        if (nativeAdSetting != null && StringUtils.hasText(nativeAdSetting.getValue())) {
            try {
                Map<String, Object> config = objectMapper.readValue(nativeAdSetting.getValue(), Map.class);
                if (Boolean.TRUE.equals(config.get("isActive"))) {
                    nativeAd = config;
                }
            } catch (Exception e) {
                log.error("Failed to parse native ad setting", e);
            }
        }

        Object weeklyMbti = null;
        SystemSetting weeklyMbtiSetting = systemSettingRepository.findById("HOME_WEEKLY_MBTI").orElse(null);
        if (weeklyMbtiSetting != null && StringUtils.hasText(weeklyMbtiSetting.getValue())) {
            try {
                weeklyMbti = objectMapper.readValue(weeklyMbtiSetting.getValue(), Map.class);
            } catch (Exception e) {
                log.error("Failed to parse weekly MBTI setting", e);
            }
        }

        // Campaigns
        LocalDateTime flashDropNow = LocalDateTime.now();
        LocalDateTime timeLimit = flashDropNow.minusHours(24);
        Optional<FlashDrop> activeFlashDrop = flashDropRepository.findFirstByStatusAndEndTimeAfter("ACTIVE", timeLimit);
        boolean flashDropActive = activeFlashDrop.isPresent();

        boolean rouletteActive = true;
        SystemSetting rouletteSetting = systemSettingRepository.findById("HOME_ROULETTE").orElse(null);
        if (rouletteSetting != null && StringUtils.hasText(rouletteSetting.getValue())) {
            try {
                Map<String, Object> config = objectMapper.readValue(rouletteSetting.getValue(), Map.class);
                boolean isActive = false;
                if (config.containsKey("isActive")) {
                    isActive = Boolean.TRUE.equals(config.get("isActive"));
                }
                if (isActive) {
                    LocalDateTime nowLdt = LocalDateTime.now();
                    if (config.containsKey("startTime") && config.get("startTime") != null) {
                        LocalDateTime start = parseDateTime((String) config.get("startTime"));
                        if (start != null && nowLdt.isBefore(start)) {
                            isActive = false;
                        }
                    }
                    if (config.containsKey("endTime") && config.get("endTime") != null) {
                        LocalDateTime end = parseDateTime((String) config.get("endTime"));
                        if (end != null && nowLdt.isAfter(end)) {
                            isActive = false;
                        }
                    }
                }
                rouletteActive = isActive;
            } catch (Exception e) {
                log.error("Failed to parse roulette setting", e);
            }
        }

        return PersonalizedHomeResponse.builder()
                .heroBanner(heroBanner)
                .latestPrescription(latestPrescription != null ? PersonalizedHomeResponse.PrescriptionDto.builder()
                        .id(latestPrescription.getId())
                        .beanName(latestPrescription.getBeanName())
                        .reason(latestPrescription.getAiComment())
                        .build() : null)
                .followingFeeds(followingFeeds)
                .tasteMatchedFeeds(tasteMatchedFeeds)
                .myClubFeeds(myClubFeeds)
                .recommendedClubs(recommendedClubs)
                .todayPairings(todayPairingDtos)
                .userPairings(userPairingPostResponses)
                .hotCoffeeTalkFeeds(hotCoffeeTalkFeeds)
                .newestCoffeeTalkFeeds(newestCoffeeTalkFeeds)
                .nativeAd(nativeAd)
                .weeklyMbti(weeklyMbti)
                .campaigns(PersonalizedHomeResponse.CampaignsDto.builder()
                        .flashDrop(flashDropActive)
                        .roulette(rouletteActive)
                        .build())
                .build();
    }

    private LocalDateTime parseDateTime(String dtStr) {
        if (!org.springframework.util.StringUtils.hasText(dtStr)) return null;
        try {
            if (dtStr.endsWith("Z")) {
                return LocalDateTime.ofInstant(java.time.Instant.parse(dtStr), java.time.ZoneId.systemDefault());
            }
            return LocalDateTime.parse(dtStr);
        } catch (Exception e) {
            log.error("Failed to parse datetime: " + dtStr, e);
            return null;
        }
    }
}
