import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { ERROR_CODES } from '../utils/errorCodes.js';

const JWT_SECRET = process.env.JWT_SECRET as string;

const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const optionalAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (!err) {
            req.user = user;
        }
        next();
    });
};

const router = express.Router();
import prisma from '../utils/prisma.js';

// GET: /api/home/personalized
// Fetches personalized content for the logged-in user, and public content for guests
router.get('/personalized', optionalAuth, async (req: any, res) => {
    try {
        const currentUserId = req.user?.id;

        let latestPrescription = null;
        let followingFeeds: any[] = [];
        let user: any = null;

        if (currentUserId) {
            // Fetch User and Preferences
            user = await (prisma as any).user.findUnique({
                where: { id: currentUserId }
            });

            // 1. Latest Prescription for Hero Banner
            latestPrescription = await (prisma as any).prescription.findFirst({
                where: { userId: currentUserId },
                orderBy: { createdAt: 'desc' }
            });

            // 2. Following & Followed Store Feeds
            const followedUsers = await (prisma as any).userFollow.findMany({
                where: { followerId: currentUserId },
                select: { followingId: true }
            });
            const followedUserIds = followedUsers.map((f: any) => f.followingId);

            const followedStores = await (prisma as any).storeFollow.findMany({
                where: { userId: currentUserId },
                select: { storeId: true }
            });
            const followedStoreIds = followedStores.map((f: any) => f.storeId);

            if (followedUserIds.length > 0 || followedStoreIds.length > 0) {
                followingFeeds = await (prisma as any).post.findMany({
                    where: {
                        isHidden: false,
                        clubId: null,
                        OR: [
                            { authorId: { in: followedUserIds } },
                            { storeId: { in: followedStoreIds } }
                        ]
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    include: {
                        author: { select: { id: true, nickname: true, profileImage: true } },
                        store: { select: { id: true, name: true, address: true } },
                        _count: { select: { comments: true, likes: true } }
                    }
                });
            }
        }

        const { countryCode } = req.query;
        let finalCountryCode = countryCode && countryCode !== 'GLOBAL' ? String(countryCode) : undefined;
        if (user && user.countryCode && user.countryCode !== 'GLOBAL') {
            finalCountryCode = user.countryCode;
        }

        const rawTasteFeeds = await (prisma as any).post.findMany({
            where: {
                isHidden: false,
                clubId: null,
                postType: 'NORMAL',
                image: { not: null },
                ...(finalCountryCode ? { countryCode: finalCountryCode } : {})
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                author: { select: { id: true, nickname: true, profileImageUrl: true } },
                _count: { select: { likes: true, comments: true } }
            }
        });

        const userInterests = user?.interests ? user.interests.split(',').map((i: string) => i.trim().toLowerCase()) : [];

        const scoredFeeds = rawTasteFeeds.map((post: any) => {
            let score = 0;
            let matchReason = '';

            // 1. Interest Matching (Max 50 pts)
            let interestScore = 0;
            if (userInterests.length > 0 && post.content) {
                const postContentLower = post.content.toLowerCase();
                for (const interest of userInterests) {
                    const cleanInterest = interest.replace('#', '');
                    if (postContentLower.includes(cleanInterest)) {
                        interestScore += 25; // max 50
                        if (!matchReason) matchReason = `🎯 #${cleanInterest} 관심사 매치`;
                    }
                }
                interestScore = Math.min(interestScore, 50);
            }

            // 2. Taste Profile Matching (Acidity, Body, Sweetness, Bitterness) (Max 50 pts)
            let tasteScore = 0;
            if (user?.prefAcidity && post.acidity) {
                let distSq = 0;
                let count = 0;
                
                if (post.acidity !== null) { distSq += Math.pow(user.prefAcidity - post.acidity, 2); count++; }
                if (user.prefBody && post.body !== null) { distSq += Math.pow(user.prefBody - post.body, 2); count++; }
                if (user.prefSweetness && post.sweetness !== null) { distSq += Math.pow(user.prefSweetness - post.sweetness, 2); count++; }
                if (user.prefBitterness && post.bitterness !== null) { distSq += Math.pow(user.prefBitterness - post.bitterness, 2); count++; }

                if (count > 0) {
                    const avgDist = Math.sqrt(distSq / count);
                    tasteScore = Math.max(0, 50 - (avgDist * 10)); 
                    
                    if (!matchReason && tasteScore > 35) {
                        matchReason = `🎯 ${Math.round(tasteScore * 2)}% 취향 일치`;
                    }
                }
            }

            score = interestScore + tasteScore;
            // Fallback reason
            if (!matchReason) {
                matchReason = '🔥 최신 트렌드 피드';
            }

            return { ...post, matchScore: score, matchReason };
        });

        // Sort by score DESC, then createdAt DESC
        scoredFeeds.sort((a: any, b: any) => {
            if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
            return b.createdAt.getTime() - a.createdAt.getTime();
        });

        const tasteMatchedFeeds = scoredFeeds.slice(0, 10);

        // 4. My Club Feeds OR Recommended Clubs by Region
        const myClubMemberships = await (prisma as any).clubMember.findMany({
            where: { userId: currentUserId || 'NOT_LOGGED_IN' },
            select: { clubId: true, club: { select: { name: true } } }
        });
        const myClubIds = myClubMemberships.map((m: any) => m.clubId);

        let myClubFeeds = [];
        let recommendedClubs = [];

        if (myClubIds.length > 0) {
            const rawFeeds = await (prisma as any).post.findMany({
                where: { 
                    isHidden: false,
                    clubId: { in: myClubIds } 
                },
                orderBy: { createdAt: 'desc' },
                take: 30,
                include: {
                    author: { select: { id: true, nickname: true, profileImageUrl: true } },
                    club: { select: { id: true, name: true, coverImageUrl: true, isRecruiting: true, locationName: true } },
                    _count: { select: { likes: true, comments: true } }
                }
            });
            // Filter to keep only the latest 1 post per club
            const seenClubs = new Set();
            for (const feed of rawFeeds) {
                if (!seenClubs.has(feed.clubId)) {
                    seenClubs.add(feed.clubId);
                    myClubFeeds.push(feed);
                    if (myClubFeeds.length >= 10) break;
                }
            }
        } else {
            const reqLat = parseFloat(req.query.lat as string);
            const reqLng = parseFloat(req.query.lng as string);

            if (!isNaN(reqLat) && !isNaN(reqLng)) {
                // GPS provided: sort by distance
                const allClubs = await (prisma as any).club.findMany({
                    where: { isDeleted: false, isPrivate: false }
                });
                
                allClubs.forEach((club: any) => {
                    if (club.lat && club.lng) {
                        const dLat = club.lat - reqLat;
                        const dLng = club.lng - reqLng;
                        club.distance = dLat * dLat + dLng * dLng; // euclidean distance squared
                    } else {
                        club.distance = 999999;
                    }
                });
                
                allClubs.sort((a: any, b: any) => a.distance - b.distance);
                recommendedClubs = allClubs.slice(0, 5);
            } else {
                // Fallback: Popular clubs
                recommendedClubs = await (prisma as any).club.findMany({
                    where: { isDeleted: false, isPrivate: false },
                    orderBy: { memberCount: 'desc' },
                    take: 5
                });
            }
        }

        // 5. Today's Pairings (Randomized 4 items to keep UI clean and dynamic)
        const userCountry = user?.countryCode || 'KR';
        const targetLang = userCountry === 'US' ? 'en' : (userCountry === 'JP' ? 'ja' : (userCountry === 'CN' ? 'zh' : 'ko'));
        
        const allPairings = await (prisma as any).todayPairing.findMany({
            where: { 
                isActive: true,
                OR: [
                    { availableRegions: 'GLOBAL' },
                    { availableRegions: { contains: userCountry } }
                ]
            },
            include: { translations: true }
        });
        
        // Flatten translations based on user language
        const flattenedPairings = allPairings.map((p: any) => {
            const translation = p.translations.find((t: any) => t.languageCode === targetLang) 
                                || p.translations.find((t: any) => t.languageCode === 'en')
                                || p.translations.find((t: any) => t.languageCode === 'ko') 
                                || p.translations[0];
            
            return {
                id: p.id,
                icon: p.icon,
                order: p.order,
                name: translation?.name || 'Unknown',
                coffee: translation?.coffee || 'Unknown',
                desc: translation?.desc || '',
                season: translation?.season || null,
                tasteProfile: translation?.tasteProfile || null
            };
        });
        
        // Simple Fisher-Yates shuffle
        for (let i = flattenedPairings.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [flattenedPairings[i], flattenedPairings[j]] = [flattenedPairings[j], flattenedPairings[i]];
        }
        
        const todayPairings = flattenedPairings.slice(0, 4);

        // 6. User Pairings (Posts with #페어링 or #Pairing based on country)
        const pairingTag = userCountry === 'US' ? '#Pairing' : '#페어링';
        const userPairings = await (prisma as any).post.findMany({
            where: {
                isHidden: false,
                countryCode: userCountry,
                content: { contains: pairingTag },
                image: { not: null }
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                author: { select: { nickname: true } },
                _count: { select: { likes: true } }
            }
        });

        // 7. Native Ad
        const nativeAdSetting = await prisma.systemSetting.findUnique({ where: { key: 'HOME_NATIVE_AD' } });
        let nativeAd = null;
        if (nativeAdSetting && nativeAdSetting.value) {
            try {
                const config = JSON.parse(nativeAdSetting.value);
                if (config.isActive) {
                    nativeAd = config;
                }
            } catch (e) {}
        }

        // 8. Weekly MBTI
        const weeklyMbtiSetting = await prisma.systemSetting.findUnique({ where: { key: 'HOME_WEEKLY_MBTI' } });
        let weeklyMbti = { isActive: true, title: '이번 주말, 당신의 기분은?', imageUrl: '' };
        if (weeklyMbtiSetting && weeklyMbtiSetting.value) {
            try {
                const config = JSON.parse(weeklyMbtiSetting.value);
                weeklyMbti = config;
            } catch (e) {}
        }

        // 9. Other Campaigns for Layout Visibility
        const flashDropSetting = await prisma.systemSetting.findUnique({ where: { key: 'HOME_FLASH_DROP' } });
        let flashDropActive = false;
        if (flashDropSetting && flashDropSetting.value) {
            try {
                const config = JSON.parse(flashDropSetting.value);
                flashDropActive = !!config.isActive;
            } catch (e) {}
        }

        const rouletteSetting = await prisma.systemSetting.findUnique({ where: { key: 'HOME_ROULETTE' } });
        let rouletteActive = true;
        if (rouletteSetting && rouletteSetting.value) {
            try {
                const config = JSON.parse(rouletteSetting.value);
                rouletteActive = !!config.isActive;
            } catch (e) {}
        }

        res.json({
            latestPrescription,
            followingFeeds,
            tasteMatchedFeeds,
            myClubFeeds,
            recommendedClubs,
            todayPairings,
            userPairings,
            nativeAd,
            weeklyMbti,
            campaigns: {
                flashDrop: flashDropActive,
                roulette: rouletteActive
            }
        });

    } catch (error) {
        console.error("Error fetching personalized home data:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

export default router;
