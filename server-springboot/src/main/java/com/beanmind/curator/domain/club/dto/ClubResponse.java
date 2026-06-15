package com.beanmind.curator.domain.club.dto;

import com.beanmind.curator.domain.club.entity.Club;
import com.beanmind.curator.domain.club.entity.ClubMember;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ClubResponse {
    private String id;
    private String ownerId;
    private String name;
    private String description;
    private String coverImageUrl;
    private Boolean isPrivate;
    private Integer maxMembers;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Double lat;
    private Double lng;
    private String locationName;
    private Integer leftCount;
    private Boolean isRecruiting;
    private LocalDateTime recruitDeadline;
    private Integer memberCount;
    private Boolean isDeleted;
    private String countryCode;

    private OwnerDto owner;
    
    @JsonProperty("_count")
    private CountDto count;
    
    private List<MemberDto> members;
    private MemberDto myMembership;
    private Boolean isBookmarked;

    @Data
    @Builder
    public static class OwnerDto {
        private String id;
        private String nickname;
        private String profileImageUrl;
    }

    @Data
    @Builder
    public static class CountDto {
        private long members;
        private long posts;
    }

    @Data
    @Builder
    public static class MemberDto {
        private String id;
        private String clubId;
        private String userId;
        private String role;
        private LocalDateTime joinedAt;
        private String applicationData;
        private String badges;
        private MemberUserDto user;
    }

    @Data
    @Builder
    public static class MemberUserDto {
        private String id;
        private String nickname;
        private String profileImageUrl;
    }

    public static ClubResponse of(Club club, ClubMember myMembership, boolean isBookmarked, List<ClubMember> members, long postsCount) {
        if (club == null) return null;

        OwnerDto ownerDto = null;
        if (club.getOwner() != null) {
            ownerDto = OwnerDto.builder()
                    .id(club.getOwner().getId())
                    .nickname(club.getOwner().getNickname())
                    .profileImageUrl(club.getOwner().getProfileImageUrl())
                    .build();
        }

        CountDto countDto = CountDto.builder()
                .members(club.getMemberCount() != null ? club.getMemberCount() : 0)
                .posts(postsCount)
                .build();

        List<MemberDto> memberDtos = Collections.emptyList();
        if (members != null) {
            memberDtos = members.stream()
                    .map(m -> MemberDto.builder()
                            .id(m.getId())
                            .clubId(m.getClub().getId())
                            .userId(m.getUser().getId())
                            .role(m.getRole().name())
                            .joinedAt(m.getJoinedAt())
                            .applicationData(m.getApplicationData())
                            .badges(m.getBadges())
                            .user(MemberUserDto.builder()
                                    .id(m.getUser().getId())
                                    .nickname(m.getUser().getNickname())
                                    .profileImageUrl(m.getUser().getProfileImageUrl())
                                    .build())
                            .build())
                    .collect(Collectors.toList());
        }

        MemberDto myMembershipDto = null;
        if (myMembership != null) {
            myMembershipDto = MemberDto.builder()
                    .id(myMembership.getId())
                    .clubId(myMembership.getClub().getId())
                    .userId(myMembership.getUser().getId())
                    .role(myMembership.getRole().name())
                    .joinedAt(myMembership.getJoinedAt())
                    .applicationData(myMembership.getApplicationData())
                    .badges(myMembership.getBadges())
                    .build();
        }

        return ClubResponse.builder()
                .id(club.getId())
                .ownerId(club.getOwner() != null ? club.getOwner().getId() : null)
                .name(club.getName())
                .description(club.getDescription())
                .coverImageUrl(club.getCoverImageUrl())
                .isPrivate(club.getIsPrivate())
                .maxMembers(club.getMaxMembers())
                .createdAt(club.getCreatedAt())
                .updatedAt(club.getUpdatedAt())
                .lat(club.getLat())
                .lng(club.getLng())
                .locationName(club.getLocationName())
                .leftCount(club.getLeftCount())
                .isRecruiting(club.getIsRecruiting())
                .recruitDeadline(club.getRecruitDeadline())
                .memberCount(club.getMemberCount())
                .isDeleted(club.getIsDeleted())
                .countryCode(club.getCountryCode())
                .owner(ownerDto)
                .count(countDto)
                .members(memberDtos)
                .myMembership(myMembershipDto)
                .isBookmarked(isBookmarked)
                .build();
    }
}
