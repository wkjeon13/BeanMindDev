package com.beanmind.curator.domain.home.dto;

import com.beanmind.curator.domain.admin.entity.HeroBanner;
import com.beanmind.curator.domain.post.dto.PostResponse;
import com.beanmind.curator.domain.club.dto.ClubResponse;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PersonalizedHomeResponse {

    private HeroBanner heroBanner;
    private PrescriptionDto latestPrescription;
    private List<PostResponse> followingFeeds;
    private List<PostResponse> tasteMatchedFeeds;
    private List<PostResponse> myClubFeeds;
    private List<ClubResponse> recommendedClubs;
    private List<PairingDto> todayPairings;
    private List<PostResponse> userPairings;
    private List<PostResponse> hotCoffeeTalkFeeds;
    private List<PostResponse> newestCoffeeTalkFeeds;
    private Object nativeAd;
    private Object weeklyMbti;
    private CampaignsDto campaigns;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PrescriptionDto {
        private String id;
        private String beanName;
        private String reason;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PairingDto {
        private String id;
        private String icon;
        private Integer order;
        private String name;
        private String coffee;
        private String desc;
        private String season;
        private String tasteProfile;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CampaignsDto {
        private Boolean flashDrop;
        private Boolean roulette;
    }
}
