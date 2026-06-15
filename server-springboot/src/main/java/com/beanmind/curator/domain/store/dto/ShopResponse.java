package com.beanmind.curator.domain.store.dto;

import com.beanmind.curator.domain.store.entity.Store;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ShopResponse {

    private String id;
    private String name;
    private String address;
    private String phone;
    private String shortDesc;
    private String longDesc;
    private String websiteUrl;
    private Double lat;
    private Double lng;
    private String signatureBean;
    private String primaryCoffeeType;
    private Double acidity;
    private Double sweetness;
    private Double bitterness;
    private Double body;
    private String equipment;
    private String signatureMenu;
    private String dessertPairing;
    private Boolean hasDecaf;
    private Boolean hasOatMilk;
    private Boolean hasParking;
    private Boolean hasWifi;
    private Boolean hasPetFriendly;
    private Boolean hasPowerOutlets;
    private String hours;
    private String status;
    private String mainImageUrl;
    private String markerImageUrl;
    private String coffeeMenuImageUrl;
    private String popularMenuImageUrl;
    private String beanOrigin;
    private String beanRoastLevel;
    private String beanNotes;
    private Boolean isPremiumTop;
    
    private Integer reviewCount;
    private Double averageRating;
    private Integer matchRate; // AI Match Rate %

    private List<MediaInfo> media;
    private List<MenuItemInfo> menuItems;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MediaInfo {
        private String id;
        private String url;
        private String type;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MenuItemInfo {
        private String id;
        private String name;
        private String price;
        private String description;
        private String imageUrl;
        private String category;
        private Integer orderIndex;
    }
}
