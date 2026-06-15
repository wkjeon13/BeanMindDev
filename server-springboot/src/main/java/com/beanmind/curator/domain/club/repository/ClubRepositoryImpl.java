package com.beanmind.curator.domain.club.repository;

import com.beanmind.curator.domain.club.entity.Club;
import com.beanmind.curator.domain.club.entity.QClub;
import com.beanmind.curator.domain.user.entity.QUser;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class ClubRepositoryImpl implements ClubRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<Club> searchClubs(String q, Boolean recruitingOnly, String countryCode, String lastId, int skip, int limit) {
        QClub club = QClub.club;
        QUser owner = QUser.user;
        BooleanBuilder builder = new BooleanBuilder();

        builder.and(club.isDeleted.eq(false));

        if (StringUtils.hasText(countryCode) && !"GLOBAL".equalsIgnoreCase(countryCode)) {
            builder.and(club.countryCode.eq(countryCode.toUpperCase()));
        }

        if (Boolean.TRUE.equals(recruitingOnly)) {
            builder.and(club.isRecruiting.eq(true));
        }

        if (StringUtils.hasText(q)) {
            String keyword = q.trim();
            builder.and(club.name.containsIgnoreCase(keyword)
                    .or(club.locationName.containsIgnoreCase(keyword))
                    .or(club.owner.nickname.containsIgnoreCase(keyword)));
        }

        // Cursor pagination support
        if (StringUtils.hasText(lastId)) {
            Club lastClub = queryFactory.selectFrom(club)
                    .where(club.id.eq(lastId))
                    .fetchOne();
            if (lastClub != null) {
                builder.and(club.createdAt.before(lastClub.getCreatedAt())
                        .or(club.createdAt.eq(lastClub.getCreatedAt()).and(club.id.lt(lastId))));
            }
        }

        List<Club> results = queryFactory
                .selectFrom(club)
                .leftJoin(club.owner, owner).fetchJoin()
                .where(builder)
                .orderBy(club.createdAt.desc())
                .offset(StringUtils.hasText(lastId) ? 0 : skip)
                .limit(limit)
                .fetch();

        // Fallback Logic: If no clubs found under regional code, load from GLOBAL/ALL
        if (results.isEmpty() && StringUtils.hasText(countryCode) && !"GLOBAL".equalsIgnoreCase(countryCode)) {
            BooleanBuilder fallbackBuilder = new BooleanBuilder();
            fallbackBuilder.and(club.isDeleted.eq(false));

            if (Boolean.TRUE.equals(recruitingOnly)) {
                fallbackBuilder.and(club.isRecruiting.eq(true));
            }

            if (StringUtils.hasText(q)) {
                String keyword = q.trim();
                fallbackBuilder.and(club.name.containsIgnoreCase(keyword)
                        .or(club.locationName.containsIgnoreCase(keyword))
                        .or(club.owner.nickname.containsIgnoreCase(keyword)));
            }

            if (StringUtils.hasText(lastId)) {
                Club lastClub = queryFactory.selectFrom(club)
                        .where(club.id.eq(lastId))
                        .fetchOne();
                if (lastClub != null) {
                    fallbackBuilder.and(club.createdAt.before(lastClub.getCreatedAt())
                            .or(club.createdAt.eq(lastClub.getCreatedAt()).and(club.id.lt(lastId))));
                }
            }

            results = queryFactory
                    .selectFrom(club)
                    .leftJoin(club.owner, owner).fetchJoin()
                    .where(fallbackBuilder)
                    .orderBy(club.createdAt.desc())
                    .offset(StringUtils.hasText(lastId) ? 0 : skip)
                    .limit(limit)
                    .fetch();
        }

        return results;
    }
}
