package com.beanmind.curator.domain.post.service;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.common.service.ContentFilterService;
import com.beanmind.curator.domain.post.dto.CommentImageGroupDto;
import com.beanmind.curator.domain.post.dto.CommentResponse;
import com.beanmind.curator.domain.post.entity.Comment;
import com.beanmind.curator.domain.post.entity.CommentReaction;
import com.beanmind.curator.domain.post.entity.Post;
import com.beanmind.curator.domain.post.repository.CommentReactionRepository;
import com.beanmind.curator.domain.post.repository.CommentRepository;
import com.beanmind.curator.domain.post.repository.PostRepository;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommentReactionRepository commentReactionRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final ContentFilterService contentFilterService;
    private final ObjectMapper objectMapper;

    private final Map<String, List<LocalDateTime>> userCommentRateMap = new ConcurrentHashMap<>();

    private boolean isRateLimited(String userId) {
        LocalDateTime now = LocalDateTime.now();
        List<LocalDateTime> timestamps = userCommentRateMap.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>());
        timestamps.removeIf(t -> java.time.Duration.between(t, now).toMillis() > 60000);
        timestamps.add(now);
        return timestamps.size() > 5;
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(String postId, int limit, int skip) {
        Pageable pageable = PageRequest.of(skip / limit, limit);
        List<Comment> comments = commentRepository.findByPostIdAndParentIsNullAndIsHiddenFalseAndIsDeletedFalse(postId, pageable);
        // Sorting by pin status desc, then createdAt asc (Query ordering fallback)
        comments.sort((c1, c2) -> {
            if (c1.getIsPinned() != c2.getIsPinned()) {
                return c2.getIsPinned().compareTo(c1.getIsPinned());
            }
            return c1.getCreatedAt().compareTo(c2.getCreatedAt());
        });

        return comments.stream()
                .map(CommentResponse::of)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CommentImageGroupDto> getCommentImages(String postId) {
        List<Comment> comments = commentRepository.findByPostIdAndImageUrlIsNotNullAndIsHiddenFalseAndIsDeletedFalseOrderByCreatedAtDesc(postId);

        Map<String, List<Comment>> groupedByAuthor = comments.stream()
                .collect(Collectors.groupingBy(c -> c.getAuthor().getId()));

        List<CommentImageGroupDto> result = new ArrayList<>();

        for (Map.Entry<String, List<Comment>> entry : groupedByAuthor.entrySet()) {
            Comment firstComment = entry.getValue().get(0);
            User author = firstComment.getAuthor();

            CommentResponse.AuthorDto authorDto = CommentResponse.AuthorDto.builder()
                    .id(author.getId())
                    .nickname(author.getNickname())
                    .profileImageUrl(author.getProfileImageUrl())
                    .role(author.getRole().name())
                    .stores(Collections.emptyList())
                    .build();

            List<CommentImageGroupDto.CommentImageItemDto> items = entry.getValue().stream()
                    .map(c -> {
                        List<String> urls = new ArrayList<>();
                        try {
                            // Parse JSON array string
                            if (c.getImageUrl().startsWith("[")) {
                                urls = objectMapper.readValue(c.getImageUrl(), List.class);
                            } else {
                                urls = Collections.singletonList(c.getImageUrl());
                            }
                        } catch (Exception e) {
                            urls = Collections.singletonList(c.getImageUrl());
                        }
                        return CommentImageGroupDto.CommentImageItemDto.builder()
                                .commentId(c.getId())
                                .content(c.getContent())
                                .createdAt(c.getCreatedAt())
                                .urls(urls)
                                .build();
                    })
                    .collect(Collectors.toList());

            result.add(CommentImageGroupDto.builder()
                    .author(authorDto)
                    .items(items)
                    .build());
        }

        return result;
    }

    @Transactional
    public CommentResponse addComment(String userId, String postId, String content, String parentId,
                                      List<MultipartFile> files, String imageBase64) {
        if (isRateLimited(userId)) {
            throw new CustomException(ErrorCode.TOO_MANY_REQUESTS, "도배 방지를 위해 1분 내의 연속 작성은 제한됩니다.");
        }

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (StringUtils.hasText(content)) {
            ContentFilterService.BannedWordCheckResult modRes = contentFilterService.containsBannedWord(content);
            if (modRes.isBanned()) {
                throw new CustomException(ErrorCode.INVALID_DATA_FORMAT, "댓글에 정책상 허용되지 않는 키워드(" + modRes.getWord() + ")가 포함되어 있습니다.");
            }
        }

        Comment parent = null;
        if (StringUtils.hasText(parentId)) {
            parent = commentRepository.findById(parentId).orElse(null);
        }

        // Image processing
        List<String> imageUrls = new ArrayList<>();
        String uploadDirRelative = "uploads/community";
        String uploadDirAbsolute = "../" + uploadDirRelative;

        try {
            Files.createDirectories(Paths.get(uploadDirAbsolute));

            if (files != null && !files.isEmpty()) {
                for (MultipartFile file : files) {
                    String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
                    String fileName = UUID.randomUUID() + (ext != null ? "." + ext : ".jpg");
                    File dest = new File(uploadDirAbsolute, fileName);
                    file.transferTo(dest);
                    imageUrls.add("/" + uploadDirRelative + "/" + fileName);
                }
            }

            if (StringUtils.hasText(imageBase64) && imageBase64.startsWith("data:")) {
                String mimeType = imageBase64.split(";")[0].split(":")[1];
                String ext = mimeType.split("/")[1];
                String rawBase64 = imageBase64.substring(imageBase64.indexOf(",") + 1);
                byte[] decoded = Base64.getDecoder().decode(rawBase64);

                String fileName = "comment-base64-" + System.currentTimeMillis() + "-" + (int)(Math.random() * 1000) + "." + ext;
                File dest = new File(uploadDirAbsolute, fileName);
                try (FileOutputStream fos = new FileOutputStream(dest)) {
                    fos.write(decoded);
                }
                imageUrls.add("/" + uploadDirRelative + "/" + fileName);
            }
        } catch (IOException e) {
            log.error("Comment image save failed", e);
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "댓글 이미지 업로드에 실패했습니다.");
        }

        String imageField = null;
        if (!imageUrls.isEmpty()) {
            try {
                imageField = objectMapper.writeValueAsString(imageUrls);
            } catch (Exception e) {
                log.error("JSON stringify comment image list error", e);
            }
        }

        Comment comment = Comment.builder()
                .id(UUID.randomUUID().toString())
                .post(post)
                .author(user)
                .parent(parent)
                .content(content != null ? content.trim() : "")
                .imageUrl(imageField)
                .build();

        Comment savedComment = commentRepository.save(comment);
        return CommentResponse.of(savedComment);
    }

    @Transactional
    public Map<String, Object> toggleReaction(String commentId, String userId, String emoji) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        List<CommentReaction> existingReactions = commentReactionRepository.findByCommentIdAndUserId(commentId, userId);
        Optional<CommentReaction> sameEmojiReaction = existingReactions.stream()
                .filter(r -> r.getEmoji().equals(emoji))
                .findFirst();

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("emoji", emoji);

        if (sameEmojiReaction.isPresent()) {
            commentReactionRepository.delete(sameEmojiReaction.get());
            result.put("action", "removed");
        } else {
            // Remove previous reactions from the same user on this comment
            if (!existingReactions.isEmpty()) {
                commentReactionRepository.deleteAll(existingReactions);
            }
            CommentReaction reaction = CommentReaction.builder()
                    .id(UUID.randomUUID().toString())
                    .comment(comment)
                    .user(user)
                    .emoji(emoji)
                    .build();
            commentReactionRepository.save(reaction);
            result.put("action", "added");
        }

        return result;
    }

    @Transactional
    public CommentResponse updateComment(String commentId, String userId, String content, String existingImages,
                                         List<MultipartFile> files) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getAuthor().getId().equals(userId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }

        if (StringUtils.hasText(content)) {
            ContentFilterService.BannedWordCheckResult modRes = contentFilterService.containsBannedWord(content);
            if (modRes.isBanned()) {
                throw new CustomException(ErrorCode.INVALID_DATA_FORMAT, "댓글에 정책상 허용되지 않는 키워드(" + modRes.getWord() + ")가 포함되어 있습니다.");
            }
        }

        List<String> imageUrls = new ArrayList<>();
        if (StringUtils.hasText(existingImages)) {
            try {
                imageUrls = objectMapper.readValue(existingImages, List.class);
            } catch (Exception e) {
                log.error("Failed to parse existingImages", e);
            }
        }

        String uploadDirRelative = "uploads/community";
        String uploadDirAbsolute = "../" + uploadDirRelative;

        try {
            Files.createDirectories(Paths.get(uploadDirAbsolute));
            if (files != null && !files.isEmpty()) {
                for (MultipartFile file : files) {
                    String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
                    String fileName = UUID.randomUUID() + (ext != null ? "." + ext : ".jpg");
                    File dest = new File(uploadDirAbsolute, fileName);
                    file.transferTo(dest);
                    imageUrls.add("/" + uploadDirRelative + "/" + fileName);
                }
            }
        } catch (IOException e) {
            log.error("Comment image update failed", e);
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "댓글 이미지 갱신에 실패했습니다.");
        }

        String imageField = null;
        if (!imageUrls.isEmpty()) {
            try {
                imageField = objectMapper.writeValueAsString(imageUrls);
            } catch (Exception e) {
                log.error("JSON stringify comment image list error", e);
            }
        }

        comment.setContent(content != null ? content.trim() : "");
        comment.setImageUrl(imageField);
        comment.setUpdatedAt(LocalDateTime.now());

        Comment savedComment = commentRepository.save(comment);
        return CommentResponse.of(savedComment);
    }

    @Transactional
    public void deleteComment(String commentId, String userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getAuthor().getId().equals(userId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }

        commentRepository.delete(comment);
    }

    @Transactional
    public Map<String, Object> togglePin(String commentId, String userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));

        // Pinned check permission: post author or store owner
        boolean isPostAuthor = comment.getPost().getAuthor().getId().equals(userId);
        boolean isStoreOwner = comment.getPost().getStore() != null &&
                               comment.getPost().getStore().getOwner().getId().equals(userId);

        if (!isPostAuthor && !isStoreOwner) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }

        comment.setIsPinned(!comment.getIsPinned());
        commentRepository.save(comment);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("isPinned", comment.getIsPinned());
        return result;
    }
}
