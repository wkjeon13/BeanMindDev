package com.beanmind.curator.common.service;

import com.beanmind.curator.domain.post.entity.BannedWord;
import com.beanmind.curator.domain.post.repository.BannedWordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
public class ContentFilterService {

    private final BannedWordRepository bannedWordRepository;
    private final List<String> cachedWords = new CopyOnWriteArrayList<>();

    @PostConstruct
    public void init() {
        reload();
    }

    public void reload() {
        cachedWords.clear();
        List<BannedWord> words = bannedWordRepository.findByLocale("ko");
        for (BannedWord w : words) {
            cachedWords.add(w.getWord().toLowerCase());
        }
    }

    public BannedWordCheckResult containsBannedWord(String content) {
        if (content == null || content.trim().isEmpty()) {
            return new BannedWordCheckResult(false, null);
        }
        String lowerContent = content.toLowerCase();
        for (String word : cachedWords) {
            if (lowerContent.contains(word)) {
                return new BannedWordCheckResult(true, word);
            }
        }
        return new BannedWordCheckResult(false, null);
    }

    public static class BannedWordCheckResult {
        private final boolean isBanned;
        private final String word;

        public BannedWordCheckResult(boolean isBanned, String word) {
            this.isBanned = isBanned;
            this.word = word;
        }

        public boolean isBanned() {
            return isBanned;
        }

        public String getWord() {
            return word;
        }
    }
}
