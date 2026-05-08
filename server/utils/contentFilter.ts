import { PrismaClient } from '@prisma/client';

import prisma from '../utils/prisma.js';

// Memory Cache
let bannedWordsCacheType: { word: string; category: string; locale: string }[] = [];
let isCacheLoaded = false;
let lastCacheUpdate = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes polling as a fallback

export const refreshBannedWordsCache = async () => {
    try {
        const words = await (prisma as any).bannedWord.findMany({
            select: { word: true, category: true, locale: true }
        });
        bannedWordsCacheType = words;
        isCacheLoaded = true;
        lastCacheUpdate = Date.now();
        console.log(`[Auto-Moderation] Banned words cache refreshed. Total words: ${words.length}`);
    } catch (error) {
        console.error("Failed to refresh banned words cache:", error);
    }
};

export const initContentFilter = () => {
    refreshBannedWordsCache();
    // Fallback TTL refresher
    setInterval(refreshBannedWordsCache, CACHE_TTL);
};

export const containsBannedWord = async (content: string, locale: string = 'ko'): Promise<{ isBanned: boolean; word?: string, category?: string }> => {
    if (!content) return { isBanned: false };

    // Trigger cache load if first time
    if (!isCacheLoaded) {
        await refreshBannedWordsCache();
    }

    const lowerContent = content.toLowerCase();

    for (const item of bannedWordsCacheType) {
        if (item.locale !== locale && item.locale !== 'all') continue;

        const pWord = item.word.toLowerCase();

        // 1. Exact or Substring Match (e.g. "시발" -> matches "시발", "시발점")
        if (lowerContent.includes(pWord)) {
            return { isBanned: true, word: item.word, category: item.category };
        }

        // 2. Space/Special Character Evasion Match (e.g. "시 발", "시*발")
        const evasionPattern = Array.from(pWord).join('[^\\p{L}\\p{N}]*');
        const regex = new RegExp(evasionPattern, 'uid');
        
        // Exclude extremely short words (like 1-2 chars) from heavy evasion regex to avoid false positives 
        // Example: "개" -> "ㄱ ㅐ" check is okay, but "개" normally matches normal words easily. 
        // We only apply evasion checking for words 2 characters or longer
        if (pWord.length >= 2 && regex.test(lowerContent)) {
             return { isBanned: true, word: item.word, category: item.category };
        }
    }

    return { isBanned: false };
};
