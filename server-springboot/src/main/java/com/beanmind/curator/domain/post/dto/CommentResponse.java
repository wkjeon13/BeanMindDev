package com.beanmind.curator.domain.post.dto;

import com.beanmind.curator.domain.post.entity.Comment;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CommentResponse {
    private String id;
    private String postId;
    private String authorId;
    private String parentId;
    private String content;
    private String imageUrl;
    private Boolean isPinned;
    private Integer earnedBeans;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isHidden;
    private Boolean isDeleted;
    
    private AuthorDto author;
    private PostSummaryDto post;
    private List<ReactionDto> reactions;
    private List<CommentResponse> replies;

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
    public static class PostSummaryDto {
        private String authorId;
    }

    @Data
    @Builder
    public static class ReactionDto {
        private String id;
        private String commentId;
        private String userId;
        private String emoji;
        private LocalDateTime createdAt;
    }

    public static CommentResponse of(Comment comment) {
        if (comment == null) return null;

        AuthorDto authorDto = null;
        if (comment.getAuthor() != null) {
            authorDto = AuthorDto.builder()
                    .id(comment.getAuthor().getId())
                    .nickname(comment.getAuthor().getNickname())
                    .profileImageUrl(comment.getAuthor().getProfileImageUrl())
                    .role(comment.getAuthor().getRole().name())
                    .stores(Collections.emptyList())
                    .build();
        }

        PostSummaryDto postSummaryDto = null;
        if (comment.getPost() != null && comment.getPost().getAuthor() != null) {
            postSummaryDto = PostSummaryDto.builder()
                    .authorId(comment.getPost().getAuthor().getId())
                    .build();
        }

        List<ReactionDto> reactionDtos = Collections.emptyList();
        if (comment.getReactions() != null) {
            reactionDtos = comment.getReactions().stream()
                    .map(r -> ReactionDto.builder()
                            .id(r.getId())
                            .commentId(comment.getId())
                            .userId(r.getUser().getId())
                            .emoji(r.getEmoji())
                            .createdAt(r.getCreatedAt())
                            .build())
                    .collect(Collectors.toList());
        }

        List<CommentResponse> replyDtos = Collections.emptyList();
        if (comment.getReplies() != null) {
            replyDtos = comment.getReplies().stream()
                    .filter(r -> !r.getIsDeleted() && !r.getIsHidden())
                    .map(CommentResponse::of)
                    .collect(Collectors.toList());
        }

        return CommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPost() != null ? comment.getPost().getId() : null)
                .authorId(comment.getAuthor() != null ? comment.getAuthor().getId() : null)
                .parentId(comment.getParent() != null ? comment.getParent().getId() : null)
                .content(comment.getContent())
                .imageUrl(comment.getImageUrl())
                .isPinned(comment.getIsPinned())
                .earnedBeans(comment.getEarnedBeans())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .isHidden(comment.getIsHidden())
                .isDeleted(comment.getIsDeleted())
                .author(authorDto)
                .post(postSummaryDto)
                .reactions(reactionDtos)
                .replies(replyDtos)
                .build();
    }
}
