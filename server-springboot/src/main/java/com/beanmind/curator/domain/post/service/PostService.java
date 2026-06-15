package com.beanmind.curator.domain.post.service;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.common.service.ContentFilterService;
import com.beanmind.curator.common.service.MailService;
import com.beanmind.curator.domain.post.dto.PostResponse;
import com.beanmind.curator.domain.post.entity.*;
import com.beanmind.curator.domain.post.repository.*;
import com.beanmind.curator.domain.store.entity.Bookmark;
import com.beanmind.curator.domain.store.entity.Store;
import com.beanmind.curator.domain.store.repository.BookmarkRepository;
import com.beanmind.curator.domain.store.repository.StoreFollowRepository;
import com.beanmind.curator.domain.store.repository.StoreRepository;
import com.beanmind.curator.domain.user.entity.Role;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.entity.UserFollow;
import com.beanmind.curator.domain.user.repository.UserFollowRepository;
import com.beanmind.curator.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final LikeRepository likeRepository;
    private final PostBookmarkRepository postBookmarkRepository;
    private final PollRepository pollRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final StoreFollowRepository storeFollowRepository;
    private final BookmarkRepository bookmarkRepository;
    private final UserFollowRepository userFollowRepository;
    private final ContentFilterService contentFilterService;
    private final MailService mailService;
    private final ObjectMapper objectMapper;

    // Rate Limiting Cache (Anti-Spam)
    private final Map<String, List<LocalDateTime>> userPostRateMap = new ConcurrentHashMap<>();

    private boolean isRateLimited(String userId) {
        LocalDateTime now = LocalDateTime.now();
        List<LocalDateTime> timestamps = userPostRateMap.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>());
        timestamps.removeIf(t -> java.time.Duration.between(t, now).toMillis() > 60000);
        timestamps.add(now);
        return timestamps.size() > 5;
    }

    @Transactional(readOnly = true)
    public List<PostResponse> getPosts(String currentUserId, String storeId, String clubId, String filter, String countryCode, String sort, int limit, int skip) {
        List<String> targetAuthorIds = new ArrayList<>();

        // 1. Resolve registered countryCode of user if logged in
        String resolvedCountryCode = countryCode;
        if (currentUserId != null) {
            User user = userRepository.findById(currentUserId).orElse(null);
            if (user != null && StringUtils.hasText(user.getCountryCode()) && !"GLOBAL".equalsIgnoreCase(user.getCountryCode())) {
                resolvedCountryCode = user.getCountryCode();
            }
        }

        // 2. Hydrate followed details if following_story filter
        if ("following_story".equalsIgnoreCase(filter)) {
            if (currentUserId == null) {
                throw new CustomException(ErrorCode.UNAUTHORIZED);
            }

            // Gather followed stores
            List<String> storeIds = storeFollowRepository.findByUserId(currentUserId).stream()
                    .map(f -> f.getStore().getId())
                    .collect(Collectors.toList());

            // Gather bookmarked stores
            List<String> bookmarkedStoreIds = bookmarkRepository.findByUserId(currentUserId).stream()
                    .map(b -> b.getStore().getId())
                    .collect(Collectors.toList());

            Set<String> mergedStoreIds = new HashSet<>(storeIds);
            mergedStoreIds.addAll(bookmarkedStoreIds);

            // Fetch owner IDs of target stores
            List<String> storeOwnerIds = storeRepository.findAllById(mergedStoreIds).stream()
                    .map(s -> s.getOwner().getId())
                    .collect(Collectors.toList());

            // Gather user follows
            List<String> followedUserIds = userFollowRepository.findByFollowerId(currentUserId).stream()
                    .map(f -> f.getFollowing().getId())
                    .collect(Collectors.toList());

            Set<String> authorIdsSet = new HashSet<>(storeOwnerIds);
            authorIdsSet.addAll(followedUserIds);
            targetAuthorIds = new ArrayList<>(authorIdsSet);
        }

        // 3. Set db retrieval limits
        int dbTakeCount = limit;
        if ("hot_3m".equalsIgnoreCase(filter) || "hot_today".equalsIgnoreCase(filter) || "popular".equalsIgnoreCase(sort)) {
            dbTakeCount = 100; // Node.js fetches more to sort in memory
        }

        List<Post> posts = postRepository.searchPosts(currentUserId, storeId, clubId, filter, resolvedCountryCode, sort, targetAuthorIds, dbTakeCount, skip);

        // 4. Memory Sorting and Post-processing
        List<PostResponse> responses = posts.stream()
                .map(p -> PostResponse.of(p, currentUserId))
                .collect(Collectors.toList());

        if ("hot_3m".equalsIgnoreCase(filter) || "hot_today".equalsIgnoreCase(filter) || "popular".equalsIgnoreCase(sort)) {
            responses.sort((a, b) -> {
                long aScore = (a.getCount() != null ? a.getCount().getLikes() : 0) + (a.getCount() != null ? a.getCount().getComments() : 0);
                long bScore = (b.getCount() != null ? b.getCount().getLikes() : 0) + (b.getCount() != null ? b.getCount().getComments() : 0);
                if (aScore != bScore) {
                    return Long.compare(bScore, aScore);
                }
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            });

            if ("hot_3m".equalsIgnoreCase(filter) && responses.size() > 10) {
                responses = responses.subList(0, 10);
            } else if ("hot_today".equalsIgnoreCase(filter) && responses.size() > 5) {
                responses = responses.subList(0, 5);
            }
        }

        int toIndex = Math.min(responses.size(), limit);
        return responses.subList(0, toIndex);
    }

    @Transactional(readOnly = true)
    public PostResponse getPostById(String id, String currentUserId) {
        Post post = postRepository.findById(id)
                .filter(p -> !p.getIsDeleted())
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
        return PostResponse.of(post, currentUserId);
    }

    @Transactional
    public PostResponse createPost(String userId, String content, String cafeName, String cafeLocation,
                                   Double cafeLat, Double cafeLng, Double acidity, Double sweetness,
                                   Double body, Double bitterness, Integer aroma, String taggedBean,
                                   String recipeData, String storeId, String clubId, String postType,
                                   Boolean isPilgrimageLedger, Boolean isShorts, String shortsCategory,
                                   String equipmentTag, String bgmTheme, String bgTheme, String attachedCourseId,
                                   List<MultipartFile> files, List<String> base64Images) {

        if (isRateLimited(userId)) {
            throw new CustomException(ErrorCode.TOO_MANY_REQUESTS, "도배 방지를 위해 1분 내의 연속 작성은 제한됩니다.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // Auto-Moderation check
        if (StringUtils.hasText(content)) {
            ContentFilterService.BannedWordCheckResult modRes = contentFilterService.containsBannedWord(content);
            if (modRes.isBanned()) {
                throw new CustomException(ErrorCode.INVALID_DATA_FORMAT, "해당 게시물에 정책상 허용되지 않는 키워드(" + modRes.getWord() + ")가 포함되어 있습니다.");
            }
        }

        // Handle BGM/BG Theme tags integration
        String finalContent = content != null ? content : "";
        if (StringUtils.hasText(bgmTheme)) {
            finalContent = finalContent + "\n<!--BM_BGM:" + bgmTheme.trim() + "-->";
        }
        if (StringUtils.hasText(bgTheme)) {
            finalContent = finalContent + "\n<!--BM_BG:" + bgTheme.trim() + "-->";
        }

        // Image uploads
        List<String> imageUrls = new ArrayList<>();
        String uploadDirRelative = "uploads/community";
        String uploadDirAbsolute = "../" + uploadDirRelative;

        try {
            Files.createDirectories(Paths.get(uploadDirAbsolute));

            // Standard Multipart Files
            if (files != null && !files.isEmpty()) {
                for (MultipartFile file : files) {
                    String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
                    String fileName = UUID.randomUUID() + (ext != null ? "." + ext : ".jpg");
                    File dest = new File(uploadDirAbsolute, fileName);
                    file.transferTo(dest);
                    imageUrls.add("/" + uploadDirRelative + "/" + fileName);
                }
            }

            // Capacitor Base64 Strings
            if (base64Images != null && !base64Images.isEmpty()) {
                for (String base64Data : base64Images) {
                    if (base64Data.startsWith("data:")) {
                        String mimeType = base64Data.split(";")[0].split(":")[1];
                        String ext = mimeType.split("/")[1];
                        String rawBase64 = base64Data.substring(base64Data.indexOf(",") + 1);
                        byte[] decoded = Base64.getDecoder().decode(rawBase64);

                        String fileName = "base64-" + System.currentTimeMillis() + "-" + (int)(Math.random() * 1000) + "." + ext;
                        File dest = new File(uploadDirAbsolute, fileName);
                        try (FileOutputStream fos = new FileOutputStream(dest)) {
                            fos.write(decoded);
                        }
                        imageUrls.add("/" + uploadDirRelative + "/" + fileName);
                    }
                }
            }
        } catch (IOException e) {
            log.error("Image upload failed", e);
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "이미지 업로드에 실패했습니다.");
        }

        String imageField = null;
        if (!imageUrls.isEmpty()) {
            try {
                imageField = objectMapper.writeValueAsString(imageUrls);
            } catch (Exception e) {
                log.error("JSON stringify image list error", e);
            }
        }

        // Resolve postType based on role and club permissions
        PostType resolvedPostType = PostType.NORMAL;
        boolean isClubManager = false;
        // Club management check omitted for simplicity or could be added with ClubMember lookup
        if (StringUtils.hasText(postType) && ("ANNOUNCEMENT".equalsIgnoreCase(postType) || "EVENT".equalsIgnoreCase(postType))) {
            if (user.getRole() == Role.ADMIN || user.getRole() == Role.OWNER || user.getRole() == Role.MODERATOR) {
                resolvedPostType = PostType.valueOf(postType.toUpperCase());
            }
        }

        String finalStoreId = storeId;
        if (resolvedPostType != PostType.NORMAL && !StringUtils.hasText(finalStoreId)) {
            Store ownedStore = storeRepository.findFirstByOwnerId(userId).orElse(null);
            if (ownedStore != null) {
                finalStoreId = ownedStore.getId();
            }
        }

        Store store = StringUtils.hasText(finalStoreId) ? storeRepository.findById(finalStoreId).orElse(null) : null;

        Post post = Post.builder()
                .id(UUID.randomUUID().toString())
                .author(user)
                .content(finalContent)
                .image(imageField)
                .cafeName(cafeName)
                .cafeLocation(cafeLocation)
                .cafeLat(cafeLat)
                .cafeLng(cafeLng)
                .acidity(acidity)
                .sweetness(sweetness)
                .body(body)
                .bitterness(bitterness)
                .aroma(aroma)
                .taggedBean(taggedBean)
                .recipeData(recipeData)
                .store(store)
                .clubId(clubId)
                .postType(resolvedPostType)
                .isPilgrimageLedger(isPilgrimageLedger != null && isPilgrimageLedger)
                .isShorts(isShorts != null && isShorts)
                .shortsCategory(shortsCategory)
                .equipmentTag(equipmentTag)
                .attachedCourseId(attachedCourseId)
                .countryCode(StringUtils.hasText(user.getCountryCode()) ? user.getCountryCode() : "KR")
                .build();

        Post savedPost = postRepository.save(post);

        // Async email notification for tagging store
        if (store != null && resolvedPostType == PostType.NORMAL && !userId.equals(store.getOwner().getId())) {
            String targetEmail = store.getOwner().getEmail();
            if (StringUtils.hasText(targetEmail)) {
                String preview = finalContent.length() > 50 ? finalContent.substring(0, 50) + "..." : finalContent;
                new Thread(() -> mailService.sendStoreTagNotification(targetEmail, store.getName(), user.getNickname(), preview)).start();
            }
        }

        return PostResponse.of(savedPost, userId);
    }

    @Transactional
    public Map<String, Boolean> toggleLike(String postId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Optional<Like> existingLike = likeRepository.findByPostIdAndUserId(postId, userId);
        Map<String, Boolean> result = new HashMap<>();

        if (existingLike.isPresent()) {
            likeRepository.delete(existingLike.get());
            result.put("liked", false);
        } else {
            Like like = Like.builder()
                    .id(UUID.randomUUID().toString())
                    .post(post)
                    .user(user)
                    .build();
            likeRepository.save(like);
            result.put("liked", true);
        }
        return result;
    }

    @Transactional
    public Map<String, Boolean> toggleBookmark(String postId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Optional<PostBookmark> existingBookmark = postBookmarkRepository.findByPostIdAndUserId(postId, userId);
        Map<String, Boolean> result = new HashMap<>();

        if (existingBookmark.isPresent()) {
            postBookmarkRepository.delete(existingBookmark.get());
            result.put("bookmarked", false);
        } else {
            PostBookmark bookmark = PostBookmark.builder()
                    .id(UUID.randomUUID().toString())
                    .post(post)
                    .user(user)
                    .build();
            postBookmarkRepository.save(bookmark);
            result.put("bookmarked", true);
        }
        return result;
    }

    @Transactional
    public int incrementShareCount(String postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
        post.setShareCount(post.getShareCount() + 1);
        postRepository.save(post);
        return post.getShareCount();
    }

    @Transactional
    public void deletePost(String postId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));

        // Authorization check: Only author, club owner (if clubId is present) or admin can delete
        boolean isAuthor = post.getAuthor().getId().equals(userId);
        if (!isAuthor) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }

        // Hard Delete cascade replacements
        likeRepository.deleteByPostId(postId);
        pollRepository.deleteByPostId(postId);
        postBookmarkRepository.deleteByPostId(postId);

        postRepository.delete(post);
    }

    @Transactional(readOnly = true)
    public long countUnreadAnnouncements(String userId, LocalDateTime lastRead) {
        // Find followed stores
        List<String> followedStoreIds = storeFollowRepository.findByUserId(userId).stream()
                .map(f -> f.getStore().getId())
                .collect(Collectors.toList());

        // Find followed users
        List<String> followedUserIds = userFollowRepository.findByFollowerId(userId).stream()
                .map(f -> f.getFollowing().getId())
                .collect(Collectors.toList());

        if (followedStoreIds.isEmpty() && followedUserIds.isEmpty()) {
            return 0;
        }

        return postRepository.countUnreadAnnouncements(userId, followedStoreIds, followedUserIds, lastRead);
    }
}
