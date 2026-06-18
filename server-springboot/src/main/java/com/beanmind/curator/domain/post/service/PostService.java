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
        String uploadDirAbsolute = new File(uploadDirRelative).getAbsolutePath();

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
    public PostResponse updatePost(String postId, String userId, String content, String cafeName, String cafeLocation,
                                   Double cafeLat, Double cafeLng, Double acidity, Double sweetness,
                                   Double body, Double bitterness, Integer aroma, String taggedBean,
                                   String recipeData, String existingImages, String storeId, String attachedCourseId,
                                   String bgmTheme, Boolean removeBgm, String bgTheme, Boolean removeBg,
                                   String pollData, Boolean removePoll,
                                   List<MultipartFile> files, List<String> base64Images) {

        Post post = postRepository.findById(postId)
                .filter(p -> !p.getIsDeleted())
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));

        if (!post.getAuthor().getId().equals(userId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }

        // Auto-Moderation check
        if (StringUtils.hasText(content)) {
            ContentFilterService.BannedWordCheckResult modRes = contentFilterService.containsBannedWord(content);
            if (modRes.isBanned()) {
                throw new CustomException(ErrorCode.INVALID_DATA_FORMAT, "해당 게시물에 정책상 허용되지 않는 키워드(" + modRes.getWord() + ")가 포함되어 있습니다.");
            }
        }

        String finalContent = content != null ? content : "";
        
        // BGM/BG Theme tags integration
        // 1. Remove existing tags
        finalContent = finalContent.replaceAll("(?s)<!--BM_BGM:(.*?)-->", "").trim();
        finalContent = finalContent.replaceAll("(?s)<!--BM_BG:(.*?)-->", "").trim();

        // 2. Append new tags if applicable
        if (StringUtils.hasText(bgmTheme) && (removeBgm == null || !removeBgm)) {
            try {
                Map<String, Object> parsedBgm = objectMapper.readValue(bgmTheme, Map.class);
                if (parsedBgm != null && parsedBgm.get("videoId") != null && parsedBgm.get("title") != null) {
                    String bgmJson = objectMapper.writeValueAsString(Map.of(
                            "title", parsedBgm.get("title"),
                            "videoId", parsedBgm.get("videoId")
                    ));
                    finalContent = finalContent + "\n<!--BM_BGM:" + bgmJson + "-->";
                }
            } catch (Exception e) {
                // fall back to string append
                finalContent = finalContent + "\n<!--BM_BGM:" + bgmTheme.trim() + "-->";
            }
        }

        if (StringUtils.hasText(bgTheme) && (removeBg == null || !removeBg)) {
            finalContent = finalContent + "\n<!--BM_BG:" + bgTheme.trim() + "-->";
        }

        // Image uploads integration
        List<String> imageUrls = new ArrayList<>();
        
        // Parse existing images
        if (StringUtils.hasText(existingImages)) {
            try {
                List<String> parsedExisting = objectMapper.readValue(existingImages, List.class);
                if (parsedExisting != null) {
                    imageUrls.addAll(parsedExisting);
                }
            } catch (Exception e) {
                log.error("Failed to parse existingImages", e);
            }
        }

        String uploadDirRelative = "uploads/community";
        String uploadDirAbsolute = new File(uploadDirRelative).getAbsolutePath();

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

        // Poll integration
        if (post.getPoll() != null && (StringUtils.hasText(pollData) || (removePoll != null && removePoll))) {
            pollRepository.deleteByPostId(postId);
            post.setPoll(null);
        }

        if (StringUtils.hasText(pollData) && (removePoll == null || !removePoll)) {
            try {
                Map<String, Object> parsed = objectMapper.readValue(pollData, Map.class);
                if (parsed != null && parsed.get("question") != null) {
                    String question = (String) parsed.get("question");
                    List<String> options = (List<String>) parsed.get("options");
                    Number durationHoursNum = (Number) parsed.get("durationHours");
                    int durationHours = durationHoursNum != null ? durationHoursNum.intValue() : 0;
                    LocalDateTime expiresAt = null;
                    if (durationHours > 0) {
                        expiresAt = LocalDateTime.now().plusHours(durationHours);
                    }

                    Poll newPoll = Poll.builder()
                            .id(UUID.randomUUID().toString())
                            .post(post)
                            .question(question)
                            .expiresAt(expiresAt)
                            .options(new ArrayList<>())
                            .build();

                    if (options != null) {
                        for (int i = 0; i < options.size(); i++) {
                            PollOption opt = PollOption.builder()
                                    .id(UUID.randomUUID().toString())
                                    .poll(newPoll)
                                    .text(options.get(i))
                                    .sortOrder(i)
                                    .build();
                            newPoll.getOptions().add(opt);
                        }
                    }
                    post.setPoll(newPoll);
                }
            } catch (Exception e) {
                log.error("POLL CREATE ERROR IN PUT:", e);
            }
        }

        Store store = StringUtils.hasText(storeId) ? storeRepository.findById(storeId).orElse(null) : null;

        post.setContent(finalContent);
        post.setImage(imageField);
        post.setCafeName(cafeName);
        post.setCafeLocation(cafeLocation);
        post.setCafeLat(cafeLat);
        post.setCafeLng(cafeLng);
        post.setAcidity(acidity);
        post.setSweetness(sweetness);
        post.setBody(body);
        post.setBitterness(bitterness);
        post.setAroma(aroma);
        post.setTaggedBean(taggedBean);
        post.setRecipeData(recipeData);
        post.setStore(store);
        post.setAttachedCourseId(attachedCourseId);

        Post savedPost = postRepository.save(post);
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
        // Delete comments first
        List<Comment> topLevelComments = commentRepository.findByPostIdAndParentIsNull(postId);
        commentRepository.deleteAll(topLevelComments);

        likeRepository.deleteByPostId(postId);
        pollRepository.deleteByPostId(postId);
        postBookmarkRepository.deleteByPostId(postId);

        postRepository.delete(post);
    }

    @Transactional(readOnly = true)
    public long countUnreadAnnouncements(String userId, LocalDateTime lastRead) {
        List<String> followedStoreIds = storeFollowRepository.findByUserId(userId).stream()
                .map(f -> f.getStore().getId())
                .collect(Collectors.toList());

        List<String> followedUserIds = userFollowRepository.findByFollowerId(userId).stream()
                .map(f -> f.getFollowing().getId())
                .collect(Collectors.toList());

        if (followedStoreIds.isEmpty() && followedUserIds.isEmpty()) {
            return 0;
        }

        return postRepository.countUnreadAnnouncements(userId, followedStoreIds, followedUserIds, lastRead);
    }

    @Transactional(readOnly = true)
    public List<PostResponse> getSystemNotices(String countryCode) {
        LocalDateTime now = LocalDateTime.now();
        String resolvedCountry = (countryCode != null && !countryCode.trim().isEmpty()) ? countryCode : "GLOBAL";
        List<Post> notices = postRepository.findActiveSystemNotices(now, resolvedCountry);
        return notices.stream()
                .map(p -> PostResponse.of(p, null))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getHotspots() {
        LocalDateTime startDate = LocalDateTime.now().minusDays(30);
        List<Post> recentPosts = postRepository.findRecentHotspots(startDate);

        List<Map<String, Object>> hotspots = new ArrayList<>();
        for (Post p : recentPosts) {
            Map<String, Object> h = new HashMap<>();
            h.put("lat", p.getCafeLat());
            h.put("lng", p.getCafeLng());
            h.put("cafeName", p.getCafeName());
            h.put("cafeLocation", p.getCafeLocation());
            int weight = 1;
            if (p.getLikes() != null) {
                weight += p.getLikes().size();
            }
            if (p.getComments() != null) {
                weight += p.getComments().size();
            }
            h.put("weight", weight);
            hotspots.add(h);
        }
        return hotspots;
    }
}
