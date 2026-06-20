package com.beanmind.curator.domain.post.dto;

import com.beanmind.curator.common.util.EncryptionUtil;
import com.beanmind.curator.domain.post.entity.Post;
import com.beanmind.curator.domain.post.entity.PostType;
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
public class PostResponse {
    private String id;
    private String authorId;
    private PostType postType;
    private String content;
    private String image;
    private String cafeName;
    private String cafeLocation;
    private Double cafeLat;
    private Double cafeLng;
    private Double acidity;
    private Double sweetness;
    private Double body;
    private Double bitterness;
    private Integer aroma;
    private String taggedBean;
    private String recipeData;
    private Integer shareCount;
    private Boolean isPinned;
    private Boolean isSystemPopup;
    private Boolean isPilgrimageLedger;
    private LocalDateTime pinnedStartDate;
    private LocalDateTime pinnedEndDate;
    private Integer earnedBeans;
    private String storeId;
    private String attachedCourseId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String clubId;
    private Boolean isShorts;
    private String equipmentTag;
    private String shortsCategory;
    private Boolean isHidden;
    private Boolean isDeleted;
    private String countryCode;
    private String contentEn;
    private String imageEn;
    private String matchReason;
    private Double matchScore;
    
    private AuthorDto author;
    
    @JsonProperty("_count")
    private CountDto count;
    
    private StoreDto store;
    
    private List<LikeDto> likes;
    private List<BookmarkDto> bookmarks;
    private AttachedCourseDto attachedCourse;
    private List<CollectionItemDto> collectionItems;
    private List<CommentImageDto> comments;
    private PollDto poll;
    private String storeOwnerId;

    @Data
    @Builder
    public static class AuthorDto {
        private String id;
        private String nickname;
        private String profileImageUrl;
        private String role;
        private List<AuthorStoreDto> stores;
    }

    @Data
    @Builder
    public static class AuthorStoreDto {
        private String name;
    }

    @Data
    @Builder
    public static class CountDto {
        private long likes;
        private long comments;
        private long bookmarks;
    }

    @Data
    @Builder
    public static class StoreDto {
        private String id;
        private String ownerId;
        private String name;
        private String address;
        private Double lat;
        private Double lng;
        private String mainImageUrl;
        private String primaryCoffeeType;
    }

    @Data
    @Builder
    public static class LikeDto {
        private String id;
        private String postId;
        private String userId;
    }

    @Data
    @Builder
    public static class BookmarkDto {
        private String id;
        private String postId;
        private String userId;
    }

    @Data
    @Builder
    public static class AttachedCourseDto {
        private String id;
        private String name;
        private Boolean isPilgrimageCourse;
        @JsonProperty("_count")
        private AttachedCourseCountDto count;
    }

    @Data
    @Builder
    public static class AttachedCourseCountDto {
        private long items;
    }

    @Data
    @Builder
    public static class CollectionItemDto {
        private CollectionDto collection;
    }

    @Data
    @Builder
    public static class CollectionDto {
        private String userId;
    }

    @Data
    @Builder
    public static class CommentImageDto {
        private String imageUrl;
    }

    @Data
    @Builder
    public static class PollDto {
        private String id;
        private String postId;
        private String question;
        private LocalDateTime expiresAt;
        private LocalDateTime createdAt;
        private List<PollOptionDto> options;
    }

    @Data
    @Builder
    public static class PollOptionDto {
        private String id;
        private String pollId;
        private String text;
        private Integer sortOrder;
        @JsonProperty("_count")
        private PollOptionCountDto count;
        private List<PollVoteDto> votes;
    }

    @Data
    @Builder
    public static class PollOptionCountDto {
        private long votes;
    }

    @Data
    @Builder
    public static class PollVoteDto {
        private String userId;
    }

    public static PostResponse of(Post post, String currentUserId) {
        if (post == null) return null;

        AuthorDto authorDto = null;
        if (post.getAuthor() != null) {
            authorDto = AuthorDto.builder()
                    .id(post.getAuthor().getId())
                    .nickname(post.getAuthor().getNickname())
                    .profileImageUrl(post.getAuthor().getProfileImageUrl())
                    .role(post.getAuthor().getRole().name())
                    // Node.js: stores: { select: { name: true } }
                    .stores(Collections.emptyList()) // Can be hydrated or mapped if user stores are queried
                    .build();
        }

        CountDto countDto = CountDto.builder()
                .likes(post.getLikes() != null ? post.getLikes().size() : 0)
                .comments(post.getComments() != null ? post.getComments().stream().filter(c -> !c.getIsDeleted() && !c.getIsHidden()).count() : 0)
                .bookmarks(post.getBookmarks() != null ? post.getBookmarks().size() : 0)
                .build();

        StoreDto storeDto = null;
        if (post.getStore() != null) {
            String decryptedAddress = post.getStore().getAddress();
            try {
                decryptedAddress = EncryptionUtil.decryptPII(decryptedAddress);
            } catch (Exception e) {
                // Keep raw address if decryption fails
            }
            storeDto = StoreDto.builder()
                    .id(post.getStore().getId())
                    .ownerId(post.getStore().getOwner() != null ? post.getStore().getOwner().getId() : null)
                    .name(post.getStore().getName())
                    .address(decryptedAddress)
                    .lat(post.getStore().getLat())
                    .lng(post.getStore().getLng())
                    .mainImageUrl(post.getStore().getMainImageUrl())
                    .primaryCoffeeType(post.getStore().getPrimaryCoffeeType() != null ? post.getStore().getPrimaryCoffeeType().name() : null)
                    .build();
        }

        List<LikeDto> likeDtos = null;
        if (currentUserId != null && post.getLikes() != null) {
            likeDtos = post.getLikes().stream()
                    .filter(l -> currentUserId.equals(l.getUser().getId()))
                    .map(l -> LikeDto.builder()
                            .id(l.getId())
                            .postId(post.getId())
                            .userId(currentUserId)
                            .build())
                    .collect(Collectors.toList());
        }

        List<BookmarkDto> bookmarkDtos = null;
        if (currentUserId != null && post.getBookmarks() != null) {
            bookmarkDtos = post.getBookmarks().stream()
                    .filter(b -> currentUserId.equals(b.getUser().getId()))
                    .map(b -> BookmarkDto.builder()
                            .id(b.getId())
                            .postId(post.getId())
                            .userId(currentUserId)
                            .build())
                    .collect(Collectors.toList());
        }

        PollDto pollDto = null;
        if (post.getPoll() != null) {
            pollDto = PollDto.builder()
                    .id(post.getPoll().getId())
                    .postId(post.getId())
                    .question(post.getPoll().getQuestion())
                    .expiresAt(post.getPoll().getExpiresAt())
                    .createdAt(post.getPoll().getCreatedAt())
                    .options(post.getPoll().getOptions() != null ? post.getPoll().getOptions().stream()
                            .map(o -> PollOptionDto.builder()
                                    .id(o.getId())
                                    .pollId(post.getPoll().getId())
                                    .text(o.getText())
                                    .sortOrder(o.getSortOrder())
                                    .count(PollOptionCountDto.builder()
                                            .votes(o.getVotes() != null ? o.getVotes().size() : 0)
                                            .build())
                                    .votes(o.getVotes() != null && currentUserId != null ? o.getVotes().stream()
                                            .filter(v -> currentUserId.equals(v.getUser().getId()))
                                            .map(v -> PollVoteDto.builder().userId(currentUserId).build())
                                            .collect(Collectors.toList()) : Collections.emptyList())
                                    .build())
                            .collect(Collectors.toList()) : Collections.emptyList())
                    .build();
        }

        // Fetching comment images (up to 4)
        List<CommentImageDto> commentImageDtos = Collections.emptyList();
        if (post.getComments() != null) {
            commentImageDtos = post.getComments().stream()
                    .filter(c -> !c.getIsDeleted() && !c.getIsHidden() && c.getImageUrl() != null)
                    .limit(4)
                    .map(c -> CommentImageDto.builder().imageUrl(c.getImageUrl()).build())
                    .collect(Collectors.toList());
        }

        return PostResponse.builder()
                .id(post.getId())
                .authorId(post.getAuthor() != null ? post.getAuthor().getId() : null)
                .postType(post.getPostType())
                .content(post.getContent())
                .image(post.getImage())
                .cafeName(post.getCafeName())
                .cafeLocation(post.getCafeLocation())
                .cafeLat(post.getCafeLat())
                .cafeLng(post.getCafeLng())
                .acidity(post.getAcidity())
                .sweetness(post.getSweetness())
                .body(post.getBody())
                .bitterness(post.getBitterness())
                .aroma(post.getAroma())
                .taggedBean(post.getTaggedBean())
                .recipeData(post.getRecipeData())
                .shareCount(post.getShareCount())
                .isPinned(post.getIsPinned())
                .isSystemPopup(post.getIsSystemPopup())
                .isPilgrimageLedger(post.getIsPilgrimageLedger())
                .pinnedStartDate(post.getPinnedStartDate())
                .pinnedEndDate(post.getPinnedEndDate())
                .earnedBeans(post.getEarnedBeans())
                .storeId(post.getStore() != null ? post.getStore().getId() : null)
                .attachedCourseId(post.getAttachedCourseId())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .clubId(post.getClubId())
                .isShorts(post.getIsShorts())
                .equipmentTag(post.getEquipmentTag())
                .shortsCategory(post.getShortsCategory())
                .isHidden(post.getIsHidden())
                .isDeleted(post.getIsDeleted())
                .countryCode(post.getCountryCode())
                .contentEn(post.getContentEn())
                .imageEn(post.getImageEn())
                .author(authorDto)
                .count(countDto)
                .store(storeDto)
                .likes(likeDtos)
                .bookmarks(bookmarkDtos)
                .comments(commentImageDtos)
                .poll(pollDto)
                .storeOwnerId(post.getStore() != null && post.getStore().getOwner() != null ? post.getStore().getOwner().getId() : null)
                .build();
    }
}
