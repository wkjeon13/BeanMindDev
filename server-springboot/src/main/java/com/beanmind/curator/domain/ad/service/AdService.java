package com.beanmind.curator.domain.ad.service;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.domain.ad.entity.*;
import com.beanmind.curator.domain.ad.repository.AdCreativeRepository;
import com.beanmind.curator.domain.ad.repository.AdLogRepository;
import com.beanmind.curator.domain.ad.repository.CampaignRepository;
import com.beanmind.curator.domain.ad.repository.ContractRepository;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdService {

    private final UserRepository userRepository;
    private final ContractRepository contractRepository;
    private final CampaignRepository campaignRepository;
    private final AdCreativeRepository adCreativeRepository;
    private final AdLogRepository adLogRepository;
    private final ObjectMapper objectMapper;

    private int getAdFrequencyCapHours() {
        try {
            // Read from ../data/policy.json relative to server-springboot directory
            File policyFile = new File("../data/policy.json");
            if (!policyFile.exists()) {
                policyFile = new File("data/policy.json"); // Fallback for absolute running root
            }
            if (policyFile.exists()) {
                JsonNode root = objectMapper.readTree(policyFile);
                return root.path("adFrequencyCapHours").asInt(24);
            }
        } catch (Exception e) {
            System.err.println("Failed to read point policy file for ad cap: " + e.getMessage());
        }
        return 24;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> serveAd(String email, String tab, String lang, String placementKey) {
        String userCountry = "GLOBAL";

        if (email != null) {
            Optional<User> user = userRepository.findByEmail(email);
            if (user.isPresent() && user.get().getCountryCode() != null) {
                userCountry = user.get().getCountryCode();
            }
        } else {
            // Estimate country based on lang
            Map<String, String> languageMap = new HashMap<>();
            languageMap.put("ko", "KR");
            languageMap.put("en", "US");
            languageMap.put("ja", "JP");
            languageMap.put("zh", "CN");
            languageMap.put("es", "ES");
            languageMap.put("fr", "FR");

            if (lang != null) {
                String baseLang = lang.split("-")[0].toLowerCase();
                if (languageMap.containsKey(baseLang)) {
                    userCountry = languageMap.get(baseLang);
                }
            }
        }

        LocalDateTime now = LocalDateTime.now();

        // 1. Fetch campaigns and matching creatives
        // Because of complex status and dates logic in sub-entities, we do JPA-level filtering
        List<Campaign> allCampaigns = campaignRepository.findAll();
        List<Map<String, Object>> matchedCreatives = new ArrayList<>();

        for (Campaign campaign : allCampaigns) {
            // Check status and dates
            if (campaign.getStatus() != Campaign.CampaignStatus.ACTIVE ||
                campaign.getStartDate().isAfter(now) ||
                campaign.getEndDate().isBefore(now)) {
                continue;
            }

            Contract contract = campaign.getContract();
            if (contract == null ||
                contract.getStatus() != Contract.ContractStatus.ACTIVE ||
                contract.getStartDate().isAfter(now) ||
                contract.getEndDate().isBefore(now)) {
                continue;
            }

            // Check budget
            if (contract.getPricingModel() != Contract.PricingModel.FIXED &&
                contract.getTotalBudget() > 0 &&
                contract.getSpentBudget() >= contract.getTotalBudget()) {
                continue;
            }

            // Check country targeting
            boolean isCountryMatch = "GLOBAL".equalsIgnoreCase(campaign.getTargetCountry()) ||
                    userCountry.equalsIgnoreCase(campaign.getTargetCountry());
            if (!isCountryMatch) {
                continue;
            }

            // Check language targeting
            boolean isValidLang = campaign.getTargetLanguage() == null ||
                    campaign.getTargetLanguage().equalsIgnoreCase(lang) ||
                    "ALL".equalsIgnoreCase(campaign.getTargetLanguage());
            if (!isValidLang) {
                continue;
            }

            // Filter creatives
            List<AdCreative> creatives = adCreativeRepository.findByCampaignId(campaign.getId());
            for (AdCreative creative : creatives) {
                if (creative.getStatus() != AdCreative.CreativeStatus.ACTIVE) {
                    continue;
                }

                String creativePlacementKey = creative.getPlacement() != null ? creative.getPlacement().getLocationKey() : "";
                boolean isTabMatch = false;

                if (placementKey != null && !placementKey.isEmpty()) {
                    if (creativePlacementKey.equalsIgnoreCase(placementKey)) {
                        isTabMatch = true;
                    } else if ("GLOBAL".equalsIgnoreCase(placementKey) && "FEED_CLUB_PREMIUM".equalsIgnoreCase(creativePlacementKey)) {
                        isTabMatch = true;
                    }
                } else {
                    if ("FEED".equalsIgnoreCase(tab) && (creativePlacementKey.toUpperCase().contains("FEED") || creativePlacementKey.isEmpty())) {
                        isTabMatch = true;
                    }
                    if ("SHORTS".equalsIgnoreCase(tab) && (creativePlacementKey.toUpperCase().contains("SHORTS") || creative.getType() == AdCreative.AdType.VIDEO)) {
                        isTabMatch = true;
                    }
                    if ("MAP".equalsIgnoreCase(tab) && creativePlacementKey.toUpperCase().contains("MAP")) {
                        isTabMatch = true;
                    }
                    if ("MAGAZINE".equalsIgnoreCase(tab) && creativePlacementKey.toUpperCase().contains("MAGAZINE")) {
                        isTabMatch = true;
                    }
                    if (creativePlacementKey.isEmpty() && "FEED".equalsIgnoreCase(tab)) {
                        isTabMatch = true;
                    }
                }

                if (isTabMatch) {
                    Map<String, Object> cMap = new HashMap<>();
                    cMap.put("id", creative.getId());
                    cMap.put("campaignId", creative.getCampaignId());
                    cMap.put("name", creative.getName());
                    cMap.put("type", creative.getType().name());
                    cMap.put("size", creative.getSize().name());
                    cMap.put("content", creative.getContent());
                    cMap.put("linkUrl", creative.getLinkUrl());
                    cMap.put("flavorTags", creative.getFlavorTags());
                    cMap.put("originTags", creative.getOriginTags());
                    cMap.put("cpcPrice", creative.getCpcPrice());
                    cMap.put("priority", creative.getPriority());
                    cMap.put("weight", creative.getWeight());
                    cMap.put("status", creative.getStatus().name());
                    cMap.put("overlayText", creative.getOverlayText());
                    cMap.put("overlayFontSize", creative.getOverlayFontSize());
                    cMap.put("overlayColor", creative.getOverlayColor());
                    cMap.put("overlayPosition", creative.getOverlayPosition());
                    cMap.put("placementId", creative.getPlacementId());
                    cMap.put("campaignName", campaign.getName());
                    cMap.put("advertiserId", campaign.getAdvertiserId());
                    matchedCreatives.add(cMap);
                }
            }
        }

        if (matchedCreatives.isEmpty()) {
            return Map.of("fallback", "ADMOB");
        }

        // Random Selection
        Random random = new Random();
        Map<String, Object> selectedAd = matchedCreatives.get(random.nextInt(matchedCreatives.size()));
        
        // Shuffle the remaining list
        List<Map<String, Object>> shuffledAds = new ArrayList<>(matchedCreatives);
        Collections.shuffle(shuffledAds);

        Map<String, Object> response = new HashMap<>();
        response.put("type", "DIRECT");
        response.put("ad", selectedAd);
        response.put("ads", shuffledAds);
        response.put("frequencyCapHours", getAdFrequencyCapHours());

        return response;
    }

    @Transactional
    public void trackAd(String email, String creativeId, String actionType, String ipAddress, String userAgent) {
        AdCreative creative = adCreativeRepository.findById(creativeId)
                .orElseThrow(() -> new CustomException(ErrorCode.BAD_REQUEST));

        String userId = null;
        if (email != null) {
            Optional<User> user = userRepository.findByEmail(email);
            if (user.isPresent()) {
                userId = user.get().getId();
            }
        }

        String os = "Unknown";
        if (userAgent != null) {
            String ua = userAgent.toLowerCase();
            if (ua.contains("android")) os = "Android";
            else if (ua.contains("iphone") || ua.contains("ipad") || ua.contains("ipod")) os = "iOS";
            else if (ua.contains("windows")) os = "Windows";
            else if (ua.contains("macintosh")) os = "macOS";
            else if (ua.contains("linux")) os = "Linux";
        }

        AdLog log = AdLog.builder()
                .id(UUID.randomUUID().toString())
                .creativeId(creative.getId())
                .creative(creative)
                .actionType(AdLog.AdActionType.valueOf(actionType))
                .userId(userId)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .deviceOS(os)
                .createdAt(LocalDateTime.now())
                .build();
        adLogRepository.save(log);

        if ("CLICK".equalsIgnoreCase(actionType) && creative.getCampaign() != null) {
            Campaign campaign = creative.getCampaign();
            Contract contract = campaign.getContract();

            if (contract != null && creative.getCpcPrice() != null && creative.getCpcPrice() > 0) {
                // Check if already completed
                if (contract.getStatus() != Contract.ContractStatus.ACTIVE ||
                    contract.getSpentBudget() >= contract.getTotalBudget()) {
                    return; // Silent bypass
                }

                double newSpent = contract.getSpentBudget() + creative.getCpcPrice();
                contract.setSpentBudget(newSpent);

                if (newSpent >= contract.getTotalBudget()) {
                    contract.setStatus(Contract.ContractStatus.COMPLETED);
                    
                    // Cascade complete to child campaigns
                    List<Campaign> childCampaigns = campaignRepository.findByContractId(contract.getId());
                    for (Campaign c : childCampaigns) {
                        c.setStatus(Campaign.CampaignStatus.COMPLETED);
                        campaignRepository.save(c);
                    }
                }
                contractRepository.save(contract);
            }
        }
    }
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCommunityAds(String country, String tags) {
        String targetCountry = country != null ? country.toUpperCase() : "GLOBAL";
        LocalDateTime now = LocalDateTime.now();
        int currentDayNum = now.getDayOfWeek().getValue() % 7; 
        int currentHourNum = now.getHour();

        List<AdCreative> creatives = adCreativeRepository.findAll(); 
        List<Map<String, Object>> formattedAds = new ArrayList<>();

        for (AdCreative c : creatives) {
            if (c.getStatus() != AdCreative.CreativeStatus.ACTIVE) {
                continue;
            }
            Campaign camp = c.getCampaign();
            if (camp == null || camp.getStatus() != Campaign.CampaignStatus.ACTIVE ||
                camp.getStartDate().isAfter(now) || camp.getEndDate().isBefore(now)) {
                continue;
            }
            boolean countryMatch = "GLOBAL".equalsIgnoreCase(camp.getTargetCountry()) ||
                    targetCountry.equalsIgnoreCase(camp.getTargetCountry());
            if (!countryMatch) {
                continue;
            }

            Contract contract = camp.getContract();
            if (contract == null || contract.getStatus() != Contract.ContractStatus.ACTIVE ||
                contract.getStartDate().isAfter(now) || contract.getEndDate().isBefore(now)) {
                continue;
            }

            if (contract.getPricingModel() != Contract.PricingModel.FIXED &&
                contract.getTotalBudget() > 0 &&
                contract.getSpentBudget() >= contract.getTotalBudget()) {
                continue;
            }

            if (camp.getTargetDays() != null && !camp.getTargetDays().trim().isEmpty()) {
                String[] dayParts = camp.getTargetDays().split(",");
                boolean dayMatched = false;
                for (String part : dayParts) {
                    part = part.trim();
                    if (part.contains("~") || part.contains("-")) {
                        String sep = part.contains("~") ? "~" : "-";
                        String[] range = part.split(sep);
                        if (range.length == 2) {
                            try {
                                int start = Integer.parseInt(range[0].trim());
                                int end = Integer.parseInt(range[1].trim());
                                if (currentDayNum >= start && currentDayNum <= end) {
                                    dayMatched = true;
                                    break;
                                }
                            } catch (NumberFormatException e) {
                            }
                        }
                    } else {
                        try {
                            if (Integer.parseInt(part) == currentDayNum) {
                                dayMatched = true;
                                break;
                            }
                        } catch (NumberFormatException e) {
                        }
                    }
                }
                if (!dayMatched) continue;
            }

            if (camp.getTargetHours() != null && !camp.getTargetHours().trim().isEmpty()) {
                String[] hourParts = camp.getTargetHours().split(",");
                boolean hourMatched = false;
                for (String part : hourParts) {
                    part = part.trim();
                    if (part.contains("~") || part.contains("-")) {
                        String sep = part.contains("~") ? "~" : "-";
                        String[] range = part.split(sep);
                        if (range.length == 2) {
                            try {
                                int start = Integer.parseInt(range[0].trim());
                                int end = Integer.parseInt(range[1].trim());
                                if (currentHourNum >= start && currentHourNum <= end) {
                                    hourMatched = true;
                                    break;
                                }
                            } catch (NumberFormatException e) {
                            }
                        }
                    } else {
                        try {
                            if (Integer.parseInt(part) == currentHourNum) {
                                hourMatched = true;
                                break;
                            }
                        } catch (NumberFormatException e) {
                        }
                    }
                }
                if (!hourMatched) continue;
            }

            int score = c.getPriority() != null ? c.getPriority() : 1;
            if (tags != null && !tags.trim().isEmpty()) {
                String[] userTags = tags.split(",");
                if (c.getFlavorTags() != null) {
                    String[] adFlavors = c.getFlavorTags().split(",");
                    for (String adFlavor : adFlavors) {
                        for (String userTag : userTags) {
                            if (adFlavor.trim().equalsIgnoreCase(userTag.trim())) {
                                score += 10;
                            }
                        }
                    }
                }
                if (c.getOriginTags() != null) {
                    String[] adOrigins = c.getOriginTags().split(",");
                    for (String adOrigin : adOrigins) {
                        for (String userTag : userTags) {
                            if (adOrigin.trim().equalsIgnoreCase(userTag.trim())) {
                                score += 10;
                            }
                        }
                    }
                }
            }

            Map<String, Object> adMap = new HashMap<>();
            adMap.put("id", c.getId());
            adMap.put("title", c.getName());
            adMap.put("type", c.getType() != null ? c.getType().name() : null);
            adMap.put("size", c.getSize() != null ? c.getSize().name() : null);
            adMap.put("content", c.getContent());
            adMap.put("linkUrl", c.getLinkUrl());
            adMap.put("placement", c.getPlacement() != null ? c.getPlacement().getLocationKey() : "FEED_STANDARD");
            adMap.put("targetCountry", camp.getTargetCountry());
            adMap.put("matchScore", score);
            adMap.put("overlayText", c.getOverlayText());
            adMap.put("overlayFontSize", c.getOverlayFontSize());
            adMap.put("overlayColor", c.getOverlayColor());
            adMap.put("overlayPosition", c.getOverlayPosition());
            formattedAds.add(adMap);
        }

        formattedAds.sort((a, b) -> Integer.compare((Integer) b.get("matchScore"), (Integer) a.get("matchScore")));

        return formattedAds;
    }
}
