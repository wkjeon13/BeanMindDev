package com.beanmind.curator.domain.post.controller;

import com.beanmind.curator.common.dto.ApiResponse;
import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.domain.post.dto.CommentImageGroupDto;
import com.beanmind.curator.domain.post.dto.CommentResponse;
import com.beanmind.curator.domain.post.service.CommentService;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final UserRepository userRepository;

    private String getRequiredUserId(Principal principal) {
        if (principal == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findByEmail(principal.getName())
                .map(User::getId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(
            @PathVariable("postId") String postId,
            @RequestParam(value = "limit", required = false, defaultValue = "50") int limit,
            @RequestParam(value = "skip", required = false, defaultValue = "0") int skip
    ) {
        List<CommentResponse> comments = commentService.getComments(postId, limit, skip);
        return ResponseEntity.ok(comments);
    }

    @GetMapping("/posts/{postId}/comment-images")
    public ResponseEntity<List<CommentImageGroupDto>> getCommentImages(
            @PathVariable("postId") String postId
    ) {
        List<CommentImageGroupDto> images = commentService.getCommentImages(postId);
        return ResponseEntity.ok(images);
    }

    @PostMapping(value = "/posts/{postId}/comments", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable("postId") String postId,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "parentId", required = false) String parentId,
            @RequestParam(value = "image", required = false) String image,
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        CommentResponse comment = commentService.addComment(userId, postId, content, parentId, files, image);
        return ResponseEntity.status(HttpStatus.CREATED).body(comment);
    }

    @PostMapping("/comments/{id}/reactions")
    public ResponseEntity<Map<String, Object>> toggleReaction(
            @PathVariable("id") String commentId,
            @RequestBody Map<String, String> body,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        String emoji = body.get("emoji");
        if (emoji == null || emoji.trim().isEmpty()) {
            throw new CustomException(ErrorCode.MISSING_REQUIRED_FIELDS);
        }
        Map<String, Object> result = commentService.toggleReaction(commentId, userId, emoji);
        return ResponseEntity.ok(result);
    }

    @PutMapping(value = "/comments/{id}", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    public ResponseEntity<CommentResponse> updateComment(
            @PathVariable("id") String commentId,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "existingImages", required = false) String existingImages,
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        CommentResponse comment = commentService.updateComment(commentId, userId, content, existingImages, files);
        return ResponseEntity.ok(comment);
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Map<String, Object>> deleteComment(
            @PathVariable("id") String commentId,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        commentService.deleteComment(commentId, userId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Comment deleted successfully"));
    }

    @PostMapping("/comments/{id}/pin")
    public ResponseEntity<Map<String, Object>> togglePin(
            @PathVariable("id") String commentId,
            Principal principal
    ) {
        String userId = getRequiredUserId(principal);
        Map<String, Object> result = commentService.togglePin(commentId, userId);
        return ResponseEntity.ok(result);
    }
}
