package com.beanmind.curator.domain.store.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShopSearchRequest {

    private Double lat;
    private Double lng;
    private Double radius; // Default 10km

    private Double minLat;
    private Double maxLat;
    private Double minLng;
    private Double maxLng;

    private String q; // Keyword
    private String regionQuery; // Region
    private String type; // Coffee type (SINGLE_ORIGIN, BLENDED, etc.)
    private String lang;

    private Boolean hasParking;
    private Boolean hasWifi;
    private Boolean hasPetFriendly;
    private Boolean hasPowerOutlets;

    private String countryCode;
}
