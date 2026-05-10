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

const router = express.Router();
import prisma from '../utils/prisma.js';

// GET: /api/home/personalized
// Fetches personalized content for the logged-in user
router.get('/personalized', authenticateToken, async (req: any, res) => {
    try {
        const currentUserId = req.user?.id;
        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Fetch User and Preferences
        const user = await (prisma as any).user.findUnique({
            where: { id: currentUserId }
        });

        // 1. Latest Prescription for Hero Banner
        const latestPrescription = await (prisma as any).prescription.findFirst({
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

        let followingFeeds: any[] = [];
        if (followedUserIds.length > 0 || followedStoreIds.length > 0) {
            followingFeeds = await (prisma as any).post.findMany({
                where: {
                    isHidden: false,
                    clubId: null,
                    OR: [
                        ...(followedUserIds.length > 0 ? [{ authorId: { in: followedUserIds } }] : []),
                        ...(followedStoreIds.length > 0 ? [{ storeId: { in: followedStoreIds } }] : [])
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    author: { select: { id: true, nickname: true, profileImageUrl: true, role: true } },
                    _count: { select: { likes: true, comments: true } }
                }
            });
        }

        // 3. Taste Matched Feeds (Simplified match: Posts with non-null acidity/body that somewhat match user's profile)
        // Note: For advanced math, it's better to fetch candidates and filter in memory, but for speed, we do a relaxed SQL check or just fetch recent tasting notes.
        const userAcidity = user?.acidity || 3;
        const userBody = user?.body || 3;
        
        const { countryCode } = req.query;
        let finalCountryCode = countryCode && countryCode !== 'GLOBAL' ? String(countryCode) : undefined;
        if (user && user.countryCode && user.countryCode !== 'GLOBAL') {
            finalCountryCode = user.countryCode;
        }

        const tasteMatchedFeeds = await (prisma as any).post.findMany({
            where: {
                isHidden: false,
                clubId: null,
                postType: 'NORMAL',
                image: { not: null },
                ...(finalCountryCode ? { countryCode: finalCountryCode } : {})
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                author: { select: { id: true, nickname: true, profileImageUrl: true } },
                _count: { select: { likes: true, comments: true } }
            }
        });

        // 4. My Club Feeds OR Recommended Clubs by Region
        const myClubMemberships = await (prisma as any).clubMember.findMany({
            where: { userId: currentUserId },
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
        const allPairings = await (prisma as any).todayPairing.findMany({
            where: { isActive: true, countryCode: userCountry }
        });
        
        // Simple Fisher-Yates shuffle
        for (let i = allPairings.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allPairings[i], allPairings[j]] = [allPairings[j], allPairings[i]];
        }
        
        const todayPairings = allPairings.slice(0, 4);

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

        res.json({
            latestPrescription,
            followingFeeds,
            tasteMatchedFeeds,
            myClubFeeds,
            recommendedClubs,
            todayPairings,
            userPairings
        });

    } catch (error) {
        console.error("Error fetching personalized home data:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

export default router;
