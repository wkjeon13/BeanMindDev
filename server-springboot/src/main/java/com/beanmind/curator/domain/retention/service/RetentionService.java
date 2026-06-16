package com.beanmind.curator.domain.retention.service;

import com.beanmind.curator.domain.admin.entity.FlashDrop;
import com.beanmind.curator.domain.admin.entity.SystemSetting;
import com.beanmind.curator.domain.admin.repository.FlashDropRepository;
import com.beanmind.curator.domain.admin.repository.SystemSettingRepository;
import com.beanmind.curator.domain.admin.entity.DailyCheckIn;
import com.beanmind.curator.domain.admin.repository.DailyCheckInRepository;
import com.beanmind.curator.domain.point.entity.PointTransaction;
import com.beanmind.curator.domain.point.repository.PointTransactionRepository;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RetentionService {

    private final UserRepository userRepository;
    private final DailyCheckInRepository dailyCheckInRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final FlashDropRepository flashDropRepository;
    private final ObjectMapper objectMapper;

    @Getter
    @AllArgsConstructor
    public static class StreakInfo {
        private final int streak;
        private final boolean todayPlayed;
    }

    public StreakInfo getStreakInfo(String userId) {
        List<DailyCheckIn> checkIns = dailyCheckInRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (checkIns.isEmpty()) {
            return new StreakInfo(0, false);
        }

        List<LocalDate> uniqueDates = checkIns.stream()
                .map(c -> c.getCreatedAt().toLocalDate())
                .distinct()
                .collect(Collectors.toList());

        LocalDate today = LocalDate.now();
        int streak = 0;
        boolean todayPlayed = false;

        if (uniqueDates.get(0).equals(today)) {
            todayPlayed = true;
            streak = 1;
            LocalDate expectedDate = today.minusDays(1);
            for (int i = 1; i < uniqueDates.size(); i++) {
                if (uniqueDates.get(i).equals(expectedDate)) {
                    streak++;
                    expectedDate = expectedDate.minusDays(1);
                } else {
                    break;
                }
            }
        } else if (uniqueDates.get(0).equals(today.minusDays(1))) {
            todayPlayed = false;
            streak = 1;
            LocalDate expectedDate = today.minusDays(2);
            for (int i = 1; i < uniqueDates.size(); i++) {
                if (uniqueDates.get(i).equals(expectedDate)) {
                    streak++;
                    expectedDate = expectedDate.minusDays(1);
                } else {
                    break;
                }
            }
        } else {
            streak = 0;
            todayPlayed = false;
        }

        streak = streak % 7;

        return new StreakInfo(streak, todayPlayed);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDailyStatus(String userEmail) {
        Map<String, Object> response = new HashMap<>();
        
        SystemSetting setting = systemSettingRepository.findById("HOME_ROULETTE").orElse(null);
        Map<String, Object> config = Map.of("isActive", true, "cupCount", 3);
        if (setting != null && StringUtils.hasText(setting.getValue())) {
            try {
                config = objectMapper.readValue(setting.getValue(), Map.class);
            } catch (Exception e) {
                log.error("Failed to parse roulette config", e);
            }
        }

        if (Boolean.FALSE.equals(config.get("isActive"))) {
            response.put("disabled", true);
            return response;
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StreakInfo info = getStreakInfo(user.getId());
        
        response.put("streak", info.getStreak());
        response.put("todayPlayed", info.isTodayPlayed());
        response.put("disabled", false);
        response.put("cupCount", config.getOrDefault("cupCount", 3));

        return response;
    }

    @Transactional
    public Map<String, Object> dailyCheckIn(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        String userId = user.getId();

        StreakInfo info = getStreakInfo(userId);
        if (info.isTodayPlayed()) {
            throw new IllegalStateException("Already checked in today.");
        }

        int newStreak = info.getStreak() + 1;
        int beansWon = 0;

        SystemSetting setting = systemSettingRepository.findById("HOME_ROULETTE").orElse(null);
        int minR = 10;
        int maxR = 100;
        int cupCount = 3;
        if (setting != null && StringUtils.hasText(setting.getValue())) {
            try {
                Map<String, Object> config = objectMapper.readValue(setting.getValue(), Map.class);
                if (Boolean.TRUE.equals(config.get("isActive"))) {
                    if (config.get("minReward") instanceof Number) minR = ((Number) config.get("minReward")).intValue();
                    if (config.get("maxReward") instanceof Number) maxR = ((Number) config.get("maxReward")).intValue();
                    if (config.get("cupCount") instanceof Number) cupCount = Math.max(1, Math.min(5, ((Number) config.get("cupCount")).intValue()));
                }
            } catch (Exception e) {
                log.error("Failed to parse roulette reward configs", e);
            }
        }

        if (newStreak == 7) {
            beansWon = 500;
        } else {
            int min = Math.min(minR, maxR);
            int max = Math.max(minR, maxR);
            beansWon = new Random().nextInt(max - min + 1) + min;
        }

        // Save Daily CheckIn
        DailyCheckIn checkIn = DailyCheckIn.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .beansWon(beansWon)
                .build();
        dailyCheckInRepository.save(checkIn);

        // Update User pointBalance
        user.setPointBalance(user.getPointBalance() + beansWon);
        userRepository.save(user);

        // Save Point Transaction
        PointTransaction tx = PointTransaction.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .amount(beansWon)
                .type("EARN")
                .description(newStreak == 7 ? "7-Day Check-in Jackpot" : "Daily Check-in")
                .build();
        pointTransactionRepository.save(tx);

        List<Integer> fakes = new ArrayList<>();
        int min = Math.min(minR, maxR);
        int max = Math.max(minR, maxR);
        for (int i = 0; i < cupCount - 1; i++) {
            fakes.add(new Random().nextInt(max - min + 1) + min);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("beansWon", beansWon);
        response.put("message", newStreak == 7 ? "7일 연속 출석 달성! 잭팟!" : "Check-in successful!");
        response.put("streak", newStreak);
        response.put("fakes", fakes);

        return response;
    }

    @Transactional(readOnly = true)
    public List<FlashDrop> getFlashDrops(String countryCode) {
        String finalCountryCode = (countryCode != null && !"GLOBAL".equalsIgnoreCase(countryCode)) ? countryCode : "KR";
        LocalDateTime limit = LocalDateTime.now().minusHours(24);
        
        // availableRegions OR region 에 대응하여, 
        // FlashDrop 엔티티의 region 에 대응한다.
        // Node.js: where: { status: 'ACTIVE', endTime: { gt: now - 24 hours }, OR: [ { region: 'GLOBAL' }, { region: countryCode } ] }
        // We can write a custom query in FlashDropRepository, but for simplicity, we can load active and filter in memory or define in FlashDropRepository.
        // Actually, we defined findFirstByStatusAndEndTimeAfter in FlashDropRepository, we can add a method:
        // List<FlashDrop> findByStatusAndEndTimeAfterAndRegionInOrderByStartTimeAsc(String status, LocalDateTime limit, List<String> regions)
        // Let's add that method to FlashDropRepository or write a JPQL in FlashDropRepository.
        // Let's check what region is in FlashDrop. Region field is present.
        // Let's define a JPQL in FlashDropRepository to filter correctly.
        return flashDropRepository.findActiveFlashDrops("ACTIVE", limit, List.of("GLOBAL", finalCountryCode));
    }
}
