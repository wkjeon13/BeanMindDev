package com.beanmind.curator.domain.analytics.service;

import com.beanmind.curator.domain.analytics.entity.AnonymousVisitor;
import com.beanmind.curator.domain.analytics.repository.AnonymousVisitorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final AnonymousVisitorRepository anonymousVisitorRepository;

    @Transactional
    public void trackVisit(String visitorId) {
        String uuid = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        anonymousVisitorRepository.upsertVisit(uuid, visitorId, now);
    }

    @Transactional
    public void trackAiUsage(String visitorId) {
        String uuid = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        anonymousVisitorRepository.upsertAiUsage(uuid, visitorId, now);
    }
}
