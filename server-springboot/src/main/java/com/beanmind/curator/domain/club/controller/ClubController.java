package com.beanmind.curator.domain.club.controller;

import com.beanmind.curator.common.dto.ApiResponse;
import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.domain.club.dto.ClubListResponse;
import com.beanmind.curator.domain.club.dto.ClubRequestDto;
import com.beanmind.curator.domain.club.dto.ClubResponse;
import com.beanmind.curator.domain.club.dto.ClubMembersResponse;
import com.beanmind.curator.domain.club.service.ClubService;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/clubs")
@RequiredArgsConstructor
public class ClubController {

    private final ClubService clubService;
    private final UserRepository userRepository;

    private String getUserIdOrNull(Principal principal) {
        if (principal == null) return null;
        return userRepository.findByEmail(principal.getName())
                .map(User::getId)
                .orElse(null);
    }

    private String getRequiredUserId(Principal principal) {
        if (principal == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findByEmail(principal.getName())
                .map(User::getId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    @PostMapping
    public ResponseEntity<ClubResponse> createClub(
            @RequestBody ClubRequestDto.Create request,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        ClubResponse club = clubService.createClub(
                userId, request.getName(), request.getDescription(), request.getCoverImageUrl(),
                request.getLocationName(), request.getLat(), request.getLng(),
                request.getIsPrivate(), request.getMaxMembers(), request.getCountryCode()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(club);
    }

    @GetMapping
    public ResponseEntity<ClubListResponse> getClubs(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "recruitingOnly", required = false, defaultValue = "false") boolean recruitingOnly,
            @RequestParam(value = "countryCode", required = false) String countryCode,
            @RequestParam(value = "lastId", required = false) String lastId,
            @RequestParam(value = "skip", required = false, defaultValue = "0") int skip,
            @RequestParam(value = "limit", required = false, defaultValue = "20") int limit,
            Principal principal
    ) {
        String userId = getUserIdOrNull(principal);
        ClubListResponse list = clubService.getClubs(userId, q, recruitingOnly, countryCode, lastId, skip, limit);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClubResponse> getClubDetails(
            @PathVariable("id") String id,
            Principal principal
    ) {
        String userId = getUserIdOrNull(principal);
        ClubResponse club = clubService.getClubDetails(id, userId);
        return ResponseEntity.ok(club);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteClub(
            @PathVariable("id") String id,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        clubService.deleteClub(id, userId);
        return ResponseEntity.ok(Map.of("message", "Club deleted successfully"));
    }

    @PostMapping("/{id}/hide")
    public ResponseEntity<Map<String, String>> hideClub(
            @PathVariable("id") String id,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        clubService.hideClub(id, userId);
        return ResponseEntity.ok(Map.of("message", "Club hidden from the list"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClubResponse> updateClub(
            @PathVariable("id") String id,
            @RequestBody ClubRequestDto.Update request,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        ClubResponse club = clubService.updateClub(
                id, userId, request.getDescription(), request.getCoverImageUrl(),
                request.getLocationName(), request.getLat(), request.getLng(),
                request.getIsPrivate()
        );
        return ResponseEntity.ok(club);
    }

    @PostMapping("/{id}/bookmark")
    public ResponseEntity<Map<String, Boolean>> toggleBookmark(
            @PathVariable("id") String id,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        Map<String, Boolean> result = clubService.toggleBookmark(id, userId);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<Map<String, Object>> joinOrLeaveClub(
            @PathVariable("id") String id,
            @RequestBody(required = false) ClubRequestDto.Join request,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        String applicationData = request != null ? request.getApplicationData() : null;
        Map<String, Object> result = clubService.joinOrLeaveClub(id, userId, applicationData);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<ClubMembersResponse> getClubMembers(
            @PathVariable("id") String id,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        ClubMembersResponse members = clubService.getClubMembers(id, userId);
        return ResponseEntity.ok(members);
    }

    @PutMapping("/{id}/members/{targetUserId}")
    public ResponseEntity<Map<String, Boolean>> manageMember(
            @PathVariable("id") String id,
            @PathVariable("targetUserId") String targetUserId,
            @RequestBody ClubRequestDto.ManageMember request,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        clubService.manageMember(id, targetUserId, request.getAction(), request.getRole(), request.getBadges(), userId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PutMapping("/{id}/recruitment")
    public ResponseEntity<ClubResponse> updateRecruitment(
            @PathVariable("id") String id,
            @RequestBody ClubRequestDto.UpdateRecruitment request,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        ClubResponse club = clubService.updateRecruitment(id, request.getIsRecruiting(), request.getRecruitDeadline(), userId);
        return ResponseEntity.ok(club);
    }
}
