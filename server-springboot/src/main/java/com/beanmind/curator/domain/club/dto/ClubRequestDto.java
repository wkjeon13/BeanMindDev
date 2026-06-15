package com.beanmind.curator.domain.club.dto;

import lombok.Data;

@Data
public class ClubRequestDto {

    @Data
    public static class Create {
        private String name;
        private String description;
        private String coverImageUrl;
        private String locationName;
        private Double lat;
        private Double lng;
        private Boolean isPrivate;
        private Integer maxMembers;
        private String countryCode;
    }

    @Data
    public static class Update {
        private String description;
        private String coverImageUrl;
        private String locationName;
        private Double lat;
        private Double lng;
        private Boolean isPrivate;
    }

    @Data
    public static class Join {
        private String applicationData;
    }

    @Data
    public static class ManageMember {
        private String action; // APPROVE, KICK, UPDATE_ROLE, UPDATE_BADGES
        private String role;
        private String badges;
    }

    @Data
    public static class UpdateRecruitment {
        private Boolean isRecruiting;
        private String recruitDeadline;
    }
}
