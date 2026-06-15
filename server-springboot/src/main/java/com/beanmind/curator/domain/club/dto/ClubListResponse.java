package com.beanmind.curator.domain.club.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ClubListResponse {
    private List<ClubSummaryDto> my;
    private List<ClubSummaryDto> all;
    private String nextCursor;

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ClubSummaryDto {
        private String id;
        private String ownerId;
        private String name;
        private String coverImageUrl;
        private String locationName;
        private Boolean isPrivate;
        private Boolean isRecruiting;
        private Integer maxMembers;
        private Integer memberCount;
        private LocalDateTime createdAt;
        private Double lat;
        private Double lng;
        private Boolean isDeleted;
        private OwnerSummaryDto owner;
        private List<MemberSummaryDto> members;
        private Integer pendingApplicantsCount;
    }

    @Data
    @Builder
    public static class OwnerSummaryDto {
        private String nickname;
    }

    @Data
    @Builder
    public static class MemberSummaryDto {
        private String id;
        private String role;
        private String userId;
    }
}
