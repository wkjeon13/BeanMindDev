package com.beanmind.curator.domain.club.service;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.common.service.MailService;
import com.beanmind.curator.domain.club.dto.ClubListResponse;
import com.beanmind.curator.domain.club.dto.ClubResponse;
import com.beanmind.curator.domain.club.dto.ClubMembersResponse;
import com.beanmind.curator.domain.club.entity.Club;
import com.beanmind.curator.domain.club.entity.ClubBookmark;
import com.beanmind.curator.domain.club.entity.ClubMember;
import com.beanmind.curator.domain.club.entity.ClubRole;
import com.beanmind.curator.domain.club.repository.ClubBookmarkRepository;
import com.beanmind.curator.domain.club.repository.ClubMemberRepository;
import com.beanmind.curator.domain.club.repository.ClubRepository;
import com.beanmind.curator.domain.post.repository.PostRepository;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClubService {

    private final ClubRepository clubRepository;
    private final ClubMemberRepository clubMemberRepository;
    private final ClubBookmarkRepository clubBookmarkRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final MailService mailService;
    private final ObjectMapper objectMapper;

    // Local Memory Cache for standard club feeds (TTL: 10 seconds)
    private final Map<String, List<ClubListResponse.ClubSummaryDto>> cachedAllClubs = new ConcurrentHashMap<>();
    private final Map<String, Long> allClubsCacheTime = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 10000;

    private String saveCoverImage(String userId, String coverImageUrl) {
        if (!StringUtils.hasText(coverImageUrl)) return null;

        List<String> imagesToProcess = new ArrayList<>();
        boolean isJsonArray = false;

        if (coverImageUrl.startsWith("[")) {
            try {
                imagesToProcess = objectMapper.readValue(coverImageUrl, new TypeReference<List<String>>() {});
                isJsonArray = true;
            } catch (Exception e) {
                log.warn("Failed to parse coverImageUrl JSON array", e);
            }
        } else if (coverImageUrl.startsWith("data:image")) {
            imagesToProcess.add(coverImageUrl);
        }

        if (imagesToProcess.isEmpty()) {
            return coverImageUrl; // Keep as is
        }

        List<String> newPaths = new ArrayList<>();
        String uploadDirRelative = "uploads/clubs/" + userId;
        String uploadDirAbsolute = getUploadsAbsolutePath("clubs/" + userId);

        try {
            Files.createDirectories(Paths.get(uploadDirAbsolute));
            for (int i = 0; i < imagesToProcess.size(); i++) {
                String imgData = imagesToProcess.get(i);
                if (imgData.startsWith("data:image")) {
                    String mimeType = imgData.split(";")[0].split(":")[1];
                    String extension = mimeType.split("/")[1];
                    String base64Data = imgData.substring(imgData.indexOf(",") + 1);
                    byte[] decoded = Base64.getDecoder().decode(base64Data);

                    String fileName = "club_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 1000) + "_" + i + "." + extension;
                    File dest = new File(uploadDirAbsolute, fileName);
                    try (FileOutputStream fos = new FileOutputStream(dest)) {
                        fos.write(decoded);
                    }
                    newPaths.add("/" + uploadDirRelative + "/" + fileName);
                } else {
                    newPaths.add(imgData);
                }
            }
            return isJsonArray || newPaths.size() > 1 ? objectMapper.writeValueAsString(newPaths) : newPaths.get(0);
        } catch (IOException e) {
            log.error("Club cover image save failed", e);
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "소모임 커버 이미지 업로드에 실패했습니다.");
        }
    }

    @Transactional
    public ClubResponse createClub(String userId, String name, String description, String coverImageUrl,
                                   String locationName, Double lat, Double lng, Boolean isPrivate, Integer maxMembers, String countryCode) {
        if (!StringUtils.hasText(name)) {
            throw new CustomException(ErrorCode.MISSING_REQUIRED_FIELDS, "Name is required");
        }

        if (clubRepository.findByName(name.trim()).isPresent()) {
            throw new CustomException(ErrorCode.INVALID_DATA_FORMAT, "이미 존재하는 소모임 이름입니다.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        String savedCoverImageUrl = saveCoverImage(userId, coverImageUrl);
        String resolvedCountryCode = StringUtils.hasText(countryCode) ? countryCode :
                (StringUtils.hasText(user.getCountryCode()) && !"GLOBAL".equalsIgnoreCase(user.getCountryCode()) ? user.getCountryCode() : "KR");

        Club club = Club.builder()
                .id(UUID.randomUUID().toString())
                .name(name.trim())
                .description(description != null ? description.trim() : "")
                .coverImageUrl(savedCoverImageUrl)
                .locationName(locationName)
                .lat(lat)
                .lng(lng)
                .isPrivate(isPrivate != null && isPrivate)
                .maxMembers(maxMembers != null ? maxMembers : 100)
                .owner(user)
                .countryCode(resolvedCountryCode)
                .build();

        Club savedClub = clubRepository.save(club);

        // Add creator as OWNER membership
        ClubMember member = ClubMember.builder()
                .id(UUID.randomUUID().toString())
                .club(savedClub)
                .user(user)
                .role(ClubRole.OWNER)
                .build();
        clubMemberRepository.save(member);

        return ClubResponse.of(savedClub, member, false, Collections.singletonList(member), 0);
    }

    @Transactional(readOnly = true)
    public ClubListResponse getClubs(String userId, String q, Boolean recruitingOnly, String countryCode, String lastId, int skip, int limit) {
        String effectiveCountryCode = countryCode;
        if (userId != null) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null && StringUtils.hasText(user.getCountryCode()) && !"GLOBAL".equalsIgnoreCase(user.getCountryCode())) {
                effectiveCountryCode = user.getCountryCode();
            }
        }

        final String finalCountryCode = effectiveCountryCode;

        // 1. Fetch My Clubs (Memberships & Bookmarks)
        List<ClubListResponse.ClubSummaryDto> myClubs = new ArrayList<>();
        if (userId != null) {
            List<String> myMembershipClubIds = clubMemberRepository.findByUserIdAndRoleIn(userId, Arrays.asList(ClubRole.OWNER, ClubRole.ADMIN, ClubRole.MEMBER, ClubRole.EVENT_MANAGER, ClubRole.CONTENT_MANAGER, ClubRole.NEWBIE))
                    .stream().map(m -> m.getClub().getId()).collect(Collectors.toList());

            List<String> myBookmarkClubIds = clubBookmarkRepository.findByUserId(userId)
                    .stream().map(b -> b.getClub().getId()).collect(Collectors.toList());

            Set<String> uniqueMyClubIds = new HashSet<>(myMembershipClubIds);
            uniqueMyClubIds.addAll(myBookmarkClubIds);

            List<Club> myClubsData = clubRepository.findAllById(uniqueMyClubIds).stream()
                    .filter(c -> !c.getIsDeleted() || (c.getIsDeleted() && c.getOwner().getId().equals(userId)))
                    .collect(Collectors.toList());

            // Collect owned club IDs to calculate pending counts
            List<String> myOwnedClubIds = myClubsData.stream()
                    .filter(c -> c.getOwner().getId().equals(userId))
                    .map(Club::getId)
                    .collect(Collectors.toList());

            Map<String, Integer> pendingCountsMap = new HashMap<>();
            if (!myOwnedClubIds.isEmpty()) {
                List<Object[]> pendingCountsList = clubMemberRepository.countPendingMembersByClubIds(myOwnedClubIds, ClubRole.PENDING);
                for (Object[] row : pendingCountsList) {
                    pendingCountsMap.put((String) row[0], ((Number) row[1]).intValue());
                }
            }

            myClubs = myClubsData.stream()
                    .map(c -> {
                        // coverImageUrl Diet
                        String cover = (c.getCoverImageUrl() != null && c.getCoverImageUrl().length() > 1000) ? null : c.getCoverImageUrl();
                        return ClubListResponse.ClubSummaryDto.builder()
                                .id(c.getId())
                                .ownerId(c.getOwner().getId())
                                .name(c.getName())
                                .coverImageUrl(cover)
                                .locationName(c.getLocationName())
                                .isPrivate(c.getIsPrivate())
                                .isRecruiting(c.getIsRecruiting())
                                .memberCount(c.getMemberCount())
                                .maxMembers(c.getMaxMembers())
                                .createdAt(c.getCreatedAt())
                                .lat(c.getLat())
                                .lng(c.getLng())
                                .isDeleted(c.getIsDeleted())
                                .owner(ClubListResponse.OwnerSummaryDto.builder().nickname(c.getOwner().getNickname()).build())
                                .pendingApplicantsCount(pendingCountsMap.getOrDefault(c.getId(), 0))
                                .build();
                    })
                    .collect(Collectors.toList());
        }

        // 2. Fetch All Clubs (with Cache optimization)
        boolean isStandardQuery = !StringUtils.hasText(q) && !Boolean.TRUE.equals(recruitingOnly) && skip == 0 && !StringUtils.hasText(lastId) && limit <= 20;
        String cacheKey = StringUtils.hasText(effectiveCountryCode) ? effectiveCountryCode.toUpperCase() : "GLOBAL";

        List<ClubListResponse.ClubSummaryDto> allClubs;

        if (isStandardQuery && (System.currentTimeMillis() - allClubsCacheTime.getOrDefault(cacheKey, 0L) < CACHE_TTL_MS) && cachedAllClubs.containsKey(cacheKey)) {
            allClubs = cachedAllClubs.get(cacheKey);
        } else {
            List<Club> allClubsData = clubRepository.searchClubs(q, recruitingOnly, effectiveCountryCode, lastId, skip, limit);
            allClubs = allClubsData.stream()
                    .map(c -> {
                        String cover = (c.getCoverImageUrl() != null && c.getCoverImageUrl().length() > 1000) ? null : c.getCoverImageUrl();
                        return ClubListResponse.ClubSummaryDto.builder()
                                .id(c.getId())
                                .ownerId(c.getOwner().getId())
                                .name(c.getName())
                                .coverImageUrl(cover)
                                .locationName(c.getLocationName())
                                .isPrivate(c.getIsPrivate())
                                .isRecruiting(c.getIsRecruiting())
                                .memberCount(c.getMemberCount())
                                .maxMembers(c.getMaxMembers())
                                .createdAt(c.getCreatedAt())
                                .lat(c.getLat())
                                .lng(c.getLng())
                                .isDeleted(c.getIsDeleted())
                                .owner(ClubListResponse.OwnerSummaryDto.builder().nickname(c.getOwner().getNickname()).build())
                                .build();
                    })
                    .collect(Collectors.toList());

            if (isStandardQuery) {
                cachedAllClubs.put(cacheKey, allClubs);
                allClubsCacheTime.put(cacheKey, System.currentTimeMillis());
            }
        }

        String nextCursor = (allClubs.size() == limit) ? allClubs.get(allClubs.size() - 1).getId() : null;

        return ClubListResponse.builder()
                .my(myClubs)
                .all(allClubs)
                .nextCursor(nextCursor)
                .build();
    }

    @Transactional(readOnly = true)
    public ClubResponse getClubDetails(String id, String currentUserId) {
        Club club = clubRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND, "Club not found"));

        ClubMember myMembership = null;
        boolean isBookmarked = false;

        if (currentUserId != null) {
            myMembership = clubMemberRepository.findByClubIdAndUserId(id, currentUserId).orElse(null);
            isBookmarked = clubBookmarkRepository.findByClubIdAndUserId(id, currentUserId).isPresent();
        }

        // Fetch first 10 members
        List<ClubMember> members = clubMemberRepository.findByClubIdOrderByJoinedAtDesc(id);
        List<ClubMember> topMembers = members.stream().limit(10).collect(Collectors.toList());

        // Count posts
        // Note: For simple post count, JpaRepository counts posts by clubId
        long postsCount = postRepository.count(); // Placeholder or actual implementation: postRepository.countByClubId(id)

        return ClubResponse.of(club, myMembership, isBookmarked, topMembers, postsCount);
    }

    @Transactional
    public void deleteClub(String id, String userId) {
        Club club = clubRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND, "Club not found"));

        if (!club.getOwner().getId().equals(userId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION, "Only the club owner can delete the club");
        }

        club.setIsDeleted(true);
        clubRepository.save(club);
    }

    @Transactional
    public void hideClub(String id, String userId) {
        clubMemberRepository.deleteByClubIdAndUserId(id, userId);
        clubBookmarkRepository.deleteByClubIdAndUserId(id, userId);
    }

    @Transactional
    public ClubResponse updateClub(String id, String userId, String description, String coverImageUrl,
                                   String locationName, Double lat, Double lng, Boolean isPrivate) {
        Club club = clubRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND, "Club not found"));

        ClubMember membership = clubMemberRepository.findByClubIdAndUserId(id, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED_ACTION));

        if (membership.getRole() != ClubRole.OWNER) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION, "Only club owner can edit details");
        }

        if (description != null) club.setDescription(description.trim());
        if (locationName != null) club.setLocationName(locationName.trim());
        if (lat != null) club.setLat(lat);
        if (lng != null) club.setLng(lng);
        if (isPrivate != null) club.setIsPrivate(isPrivate);

        if (coverImageUrl != null) {
            club.setCoverImageUrl(saveCoverImage(userId, coverImageUrl));
        }

        Club updatedClub = clubRepository.save(club);
        return getClubDetails(updatedClub.getId(), userId);
    }

    @Transactional
    public Map<String, Boolean> toggleBookmark(String id, String userId) {
        Club club = clubRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND, "Club not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Optional<ClubBookmark> existing = clubBookmarkRepository.findByClubIdAndUserId(id, userId);
        Map<String, Boolean> result = new HashMap<>();

        if (existing.isPresent()) {
            clubBookmarkRepository.delete(existing.get());
            result.put("bookmarked", false);
        } else {
            ClubBookmark bookmark = ClubBookmark.builder()
                    .id(UUID.randomUUID().toString())
                    .club(club)
                    .user(user)
                    .build();
            clubBookmarkRepository.save(bookmark);
            result.put("bookmarked", true);
        }
        return result;
    }

    @Transactional
    public Map<String, Object> joinOrLeaveClub(String id, String userId, String applicationData) {
        Club club = clubRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND, "Club not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Optional<ClubMember> existing = clubMemberRepository.findByClubIdAndUserId(id, userId);
        Map<String, Object> result = new HashMap<>();

        if (existing.isPresent()) {
            ClubMember member = existing.get();
            if (member.getRole() == ClubRole.OWNER) {
                throw new CustomException(ErrorCode.INVALID_DATA_FORMAT, "Owner cannot leave club");
            }
            clubMemberRepository.delete(member);

            club.setLeftCount(club.getLeftCount() + 1);
            if (member.getRole() != ClubRole.PENDING) {
                club.setMemberCount(Math.max(1, club.getMemberCount() - 1));
            }
            clubRepository.save(club);

            result.put("status", "LEFT");
            return result;
        }

        if (!club.getIsRecruiting()) {
            throw new CustomException(ErrorCode.INVALID_DATA_FORMAT, "This club is no longer recruiting.");
        }

        // Apply as PENDING (All joins require approval)
        ClubMember newMember = ClubMember.builder()
                .id(UUID.randomUUID().toString())
                .club(club)
                .user(user)
                .role(ClubRole.PENDING)
                .applicationData(applicationData)
                .build();
        clubMemberRepository.save(newMember);

        // Notify club owner
        String ownerEmail = club.getOwner().getEmail();
        if (StringUtils.hasText(ownerEmail)) {
            new Thread(() -> mailService.sendClubApplicationNotification(ownerEmail, club.getName(), user.getNickname())).start();
        }

        result.put("status", "PENDING");
        return result;
    }

    @Transactional(readOnly = true)
    public ClubMembersResponse getClubMembers(String clubId, String userId) {
        ClubMember myMembership = clubMemberRepository.findByClubIdAndUserId(clubId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED_ACTION));

        boolean isManager = myMembership.getRole() == ClubRole.OWNER || myMembership.getRole() == ClubRole.ADMIN;

        List<ClubRole> roles = new ArrayList<>(Arrays.asList(ClubRole.OWNER, ClubRole.ADMIN, ClubRole.EVENT_MANAGER, ClubRole.CONTENT_MANAGER, ClubRole.MEMBER, ClubRole.NEWBIE));
        if (isManager) {
            roles.add(ClubRole.PENDING);
        }

        List<ClubMember> members = clubMemberRepository.findByClubIdAndRoleInOrderByRoleAscJoinedAtDesc(clubId, roles);

        List<ClubResponse.MemberDto> memberDtos = members.stream()
                .map(m -> ClubResponse.MemberDto.builder()
                        .id(m.getId())
                        .clubId(clubId)
                        .userId(m.getUser().getId())
                        .role(m.getRole().name())
                        .joinedAt(m.getJoinedAt())
                        .applicationData(m.getApplicationData())
                        .badges(m.getBadges())
                        .user(ClubResponse.MemberUserDto.builder()
                                .id(m.getUser().getId())
                                .nickname(m.getUser().getNickname())
                                .profileImageUrl(m.getUser().getProfileImageUrl())
                                .build())
                        .build())
                .collect(Collectors.toList());

        return ClubMembersResponse.builder()
                .members(memberDtos)
                .isManager(isManager)
                .build();
    }

    @Transactional
    public void manageMember(String clubId, String targetUserId, String action, String roleStr, String badgesStr, String userId) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND, "Club not found"));

        ClubMember myMembership = clubMemberRepository.findByClubIdAndUserId(clubId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED_ACTION));

        if (myMembership.getRole() != ClubRole.OWNER && myMembership.getRole() != ClubRole.ADMIN) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION, "Not authorized");
        }

        ClubMember targetMembership = clubMemberRepository.findByClubIdAndUserId(clubId, targetUserId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND, "Member not found"));

        if ("APPROVE".equalsIgnoreCase(action) && targetMembership.getRole() == ClubRole.PENDING) {
            targetMembership.setRole(ClubRole.MEMBER);
            clubMemberRepository.save(targetMembership);

            club.setMemberCount(club.getMemberCount() + 1);
            clubRepository.save(club);

            String email = targetMembership.getUser().getEmail();
            if (StringUtils.hasText(email)) {
                new Thread(() -> mailService.sendClubApprovalNotification(email, club.getName())).start();
            }
        } else if ("KICK".equalsIgnoreCase(action)) {
            if (targetMembership.getRole() == ClubRole.OWNER) {
                throw new CustomException(ErrorCode.INVALID_DATA_FORMAT, "Cannot kick owner");
            }
            clubMemberRepository.delete(targetMembership);

            club.setLeftCount(club.getLeftCount() + 1);
            if (targetMembership.getRole() != ClubRole.PENDING) {
                club.setMemberCount(Math.max(1, club.getMemberCount() - 1));
            }
            clubRepository.save(club);
        } else if ("UPDATE_ROLE".equalsIgnoreCase(action)) {
            if (targetMembership.getRole() == ClubRole.OWNER && !ClubRole.OWNER.name().equalsIgnoreCase(roleStr)) {
                throw new CustomException(ErrorCode.INVALID_DATA_FORMAT, "Cannot demote owner");
            }
            if (myMembership.getRole() != ClubRole.OWNER && ClubRole.ADMIN.name().equalsIgnoreCase(roleStr)) {
                throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION, "Only owner can assign admins");
            }
            targetMembership.setRole(ClubRole.valueOf(roleStr.toUpperCase()));
            clubMemberRepository.save(targetMembership);
        } else if ("UPDATE_BADGES".equalsIgnoreCase(action)) {
            targetMembership.setBadges(badgesStr);
            clubMemberRepository.save(targetMembership);
        }
    }

    @Transactional
    public ClubResponse updateRecruitment(String clubId, Boolean isRecruiting, String recruitDeadlineStr, String userId) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND, "Club not found"));

        ClubMember existing = clubMemberRepository.findByClubIdAndUserId(clubId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED_ACTION));

        if (existing.getRole() != ClubRole.OWNER && existing.getRole() != ClubRole.ADMIN) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION, "Only admins can toggle recruitment status");
        }

        if (isRecruiting != null) {
            club.setIsRecruiting(isRecruiting);
        }

        if (StringUtils.hasText(recruitDeadlineStr)) {
            try {
                club.setRecruitDeadline(LocalDateTime.parse(recruitDeadlineStr));
            } catch (Exception e) {
                // Ignore parse errors
            }
        } else {
            club.setRecruitDeadline(null);
        }

        Club saved = clubRepository.save(club);
        return getClubDetails(saved.getId(), userId);
    }

    private String getUploadsAbsolutePath(String subPath) {
        String userDir = System.getProperty("user.dir");
        File rootDir;
        if (userDir.endsWith("server-springboot")) {
            rootDir = new File(userDir).getParentFile();
        } else {
            rootDir = new File(userDir);
        }
        File uploadsDir = new File(rootDir, "uploads");
        if (subPath != null && !subPath.isEmpty()) {
            return new File(uploadsDir, subPath).getAbsolutePath();
        }
        return uploadsDir.getAbsolutePath();
    }
}
