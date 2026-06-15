package com.beanmind.curator.domain.club.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ClubMembersResponse {
    private List<ClubResponse.MemberDto> members;
    
    @JsonProperty("isManager")
    private boolean isManager;
}
