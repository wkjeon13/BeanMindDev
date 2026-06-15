package com.beanmind.curator.domain.post.repository;

import com.beanmind.curator.domain.post.entity.Post;
import com.beanmind.curator.domain.post.entity.PostType;
import com.beanmind.curator.domain.post.entity.QPost;
import com.beanmind.curator.domain.store.entity.QStore;
import com.beanmind.curator.domain.user.entity.QUser;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class PostRepositoryImpl implements PostRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<Post> searchPosts(String currentUserId, String storeId, String clubId, String filter, String countryCode, String sort, List<String> targetAuthorIds, int limit, int skip) {
        QPost post = QPost.post;
        BooleanBuilder builder = new BooleanBuilder();

        // Default constraints
        builder.and(post.isHidden.eq(false));
        builder.and(post.isSystemPopup.eq(false));
        builder.and(post.isDeleted.eq(false));

        // Pinned / Announcement / Event Start/End Date validation
        LocalDateTime now = LocalDateTime.now();
        builder.and(
            post.postType.eq(PostType.NORMAL).and(post.isPinned.eq(false))
            .or(
                post.postType.in(PostType.ANNOUNCEMENT, PostType.EVENT).or(post.isPinned.eq(true))
                .and(post.pinnedStartDate.isNull().or(post.pinnedStartDate.loe(now)))
                .and(post.pinnedEndDate.isNull().or(post.pinnedEndDate.goe(now)))
            )
        );

        // Country code filter
        if (StringUtils.hasText(countryCode) && !"GLOBAL".equalsIgnoreCase(countryCode)) {
            builder.and(post.countryCode.in(countryCode.toUpperCase(), "GLOBAL"));
        }

        // Store ID filter
        if (StringUtils.hasText(storeId)) {
            builder.and(post.store.id.eq(storeId));
        }

        // Club ID filter
        if (StringUtils.hasText(clubId)) {
            builder.and(post.clubId.eq(clubId));
        } else {
            builder.and(post.clubId.isNull());
        }

        // Following Story filter
        if ("following_story".equalsIgnoreCase(filter)) {
            builder.and(post.postType.in(PostType.NORMAL, PostType.ANNOUNCEMENT, PostType.EVENT));
            if (targetAuthorIds != null && !targetAuthorIds.isEmpty()) {
                builder.and(post.author.id.in(targetAuthorIds));
            } else {
                builder.and(post.id.eq("non-existent-id"));
            }
        }
        // Shorts filter
        else if ("shorts".equalsIgnoreCase(filter)) {
            builder.and(post.isShorts.eq(true)
                    .or(post.image.contains(".mp4"))
                    .or(post.image.contains(".mov"))
                    .or(post.image.contains(".webm")));
        }
        // Hot 3 Months
        else if ("hot_3m".equalsIgnoreCase(filter)) {
            builder.and(post.createdAt.goe(now.minusMonths(3)));
            builder.and(post.image.isNotNull());
            builder.and(post.postType.in(PostType.NORMAL, PostType.ANNOUNCEMENT, PostType.EVENT));
        }
        // Hot Today
        else if ("hot_today".equalsIgnoreCase(filter)) {
            builder.and(post.createdAt.goe(now.minusDays(3))); // Node.js expanded to 3 days
            builder.and(post.postType.in(PostType.NORMAL, PostType.ANNOUNCEMENT, PostType.EVENT));
        }
        // General Normal Feed Type filter
        else if (!StringUtils.hasText(storeId) && !"near_live".equalsIgnoreCase(filter)) {
            builder.and(post.postType.in(PostType.NORMAL, PostType.ANNOUNCEMENT, PostType.EVENT));
            builder.and(post.isShorts.eq(false));
        }

        // Ordering Logic (Sponsored / Latest / Default Pinned priority)
        List<OrderSpecifier<?>> orderSpecifiers = new ArrayList<>();
        if ("sponsored".equalsIgnoreCase(sort)) {
            orderSpecifiers.add(post.earnedBeans.desc());
        } else {
            // default/latest sort
            orderSpecifiers.add(post.isPinned.desc());
        }
        orderSpecifiers.add(post.createdAt.desc());

        return queryFactory
                .selectFrom(post)
                .leftJoin(post.author, QUser.user).fetchJoin()
                .leftJoin(post.store, QStore.store).fetchJoin()
                .where(builder)
                .orderBy(orderSpecifiers.toArray(new OrderSpecifier[0]))
                .offset(skip)
                .limit(limit)
                .fetch();
    }

    @Override
    public long countUnreadAnnouncements(String userId, List<String> followedStoreIds, List<String> followedUserIds, LocalDateTime lastRead) {
        QPost post = QPost.post;
        BooleanBuilder builder = new BooleanBuilder();

        BooleanBuilder orBuilder = new BooleanBuilder();
        if (followedStoreIds != null && !followedStoreIds.isEmpty()) {
            orBuilder.or(post.store.id.in(followedStoreIds).and(post.postType.ne(PostType.NORMAL)));
        }
        if (followedUserIds != null && !followedUserIds.isEmpty()) {
            orBuilder.or(post.author.id.in(followedUserIds));
        }
        builder.and(orBuilder);

        builder.and(post.author.id.ne(userId));
        builder.and(post.createdAt.gt(lastRead));
        builder.and(post.isDeleted.eq(false));
        builder.and(post.isHidden.eq(false));

        return queryFactory
                .selectFrom(post)
                .where(builder)
                .fetchCount();
    }
}
