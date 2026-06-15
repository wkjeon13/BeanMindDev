package com.beanmind.curator.domain.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {

    private String message;
    private String token;
    private Boolean requiresVerification;
    private String email;
    private String developmentOnlyCode;
    private UserInfo user;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserInfo {
        private String id;
        private String email;
        private String nickname;
        private String role;
        private String profileImageUrl;
        private String ageGroup;
        private String gender;
        private String favoriteCafe;
        private String preferredLanguage;
    }
}
