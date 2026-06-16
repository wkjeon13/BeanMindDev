package com.beanmind.curator.domain.user.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NaverRegisterRequest {
    private String email;
    private String name;
    private String naverId;
    private String profileImageUrl;
    private String gender;
    private String ageGroup;
    private String role;
    private String favoriteCafe;
    private String countryCode;
    private String preferredLanguage;
    private String privacyPolicyVersion;
    private String termsOfServiceVersion;
}
