package com.beanmind.curator.domain.post.repository;

import com.beanmind.curator.domain.post.entity.Post;
import java.time.LocalDateTime;
import java.util.List;

public interface PostRepositoryCustom {
    List<Post> searchPosts(String currentUserId, String storeId, String clubId, String filter, String countryCode, String sort, List<String> targetAuthorIds, int limit, int skip);
    long countUnreadAnnouncements(String userId, List<String> followedStoreIds, List<String> followedUserIds, LocalDateTime lastRead);
}
