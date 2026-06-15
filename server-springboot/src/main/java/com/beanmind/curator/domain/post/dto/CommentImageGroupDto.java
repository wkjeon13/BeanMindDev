package com.beanmind.curator.domain.post.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CommentImageGroupDto {
    private CommentResponse.AuthorDto author;
    private List<CommentImageItemDto> items;

    @Data
    @Builder
    public static class CommentImageItemDto {
        private String commentId;
        private String content;
        private LocalDateTime createdAt;
        private List<String> urls;
    }
}
