import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendStoreTagNotification, sendAdInquiryAdminNotification, sendStoreNewsletterNotification } from '../utils/mailer.js';
import { ERROR_CODES } from '../utils/errorCodes';
import { extractHashtags } from '../utils/hashtagParser.js';
import { getAiResponse } from './ai-curator.js';
import { uploadLimiter } from '../utils/uploadLimiter.js';
import { getSettings } from '../utils/systemSettings.js';
import { initContentFilter, containsBannedWord } from '../utils/contentFilter.js';

const router = express.Router();
import prisma from '../utils/prisma.js';
const JWT_SECRET = process.env.JWT_SECRET as string;

initContentFilter(); // Start background caching

// --- Rate Limiter (Anti-Spam Stage 1) ---
// Limits a user to 5 posts/comments per minute
const userPostRateMap = new Map<string, Date[]>();
const isRateLimited = (userId: string, actionType: string, contentSnippet: string) => {
    const settings = getSettings();
    const limit = settings.spamRateLimitCount !== undefined ? settings.spamRateLimitCount : 5;
    const timeframeMs = settings.spamRateLimitTimeMs !== undefined ? settings.spamRateLimitTimeMs : 60000;

    const now = new Date();
    let timestamps = userPostRateMap.get(userId) || [];
    timestamps = timestamps.filter(t => now.getTime() - t.getTime() < timeframeMs);
    timestamps.push(now);
    userPostRateMap.set(userId, timestamps);
    if (timestamps.length > limit) {
        (prisma as any).spamLog.create({
            data: {
                userId,
                action: actionType,
                content: contentSnippet,
                reason: 'RATE_LIMIT_EXCEEDED'
            }
        }).catch((e: any) => console.error('SpamLog create error', e));
        return true;
    }
    return false;
};
// ----------------------------------------


// Middleware to authenticate JWT token
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log("Auth Middleware: Missing token");
        return res.status(401).json({ error: ERROR_CODES.MISSING_AUTH_HEADER });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            console.log("Auth Middleware: Invalid or expired token:", err.message);
            return res.status(403).json({ error: ERROR_CODES.INVALID_TOKEN });
        }
        req.user = user;
        next();
    });
};

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'community');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config for Disk Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for Shorts/ASMR
    fileFilter: (req: any, file: any, cb: any) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif|mp4|mov|webm/i;
        const isValid = allowedTypes.test(file.originalname) && allowedTypes.test(file.mimetype);
        if (isValid) cb(null, true);
        else cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
});

// GET: Fetch Active System Popups
router.get('/system-notices', async (req, res) => {
    try {
        const now = new Date();
        const notices = await (prisma as any).post.findMany({
            where: {
                postType: 'ANNOUNCEMENT',
                isSystemPopup: true,
                AND: [
                    { OR: [{ pinnedStartDate: null }, { pinnedStartDate: { lte: now } }] },
                    { OR: [{ pinnedEndDate: null }, { pinnedEndDate: { gte: now } }] }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(notices);
    } catch (error) {
        console.error("Fetch system notices error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch Hotspots for Near Live heat map
router.get('/hotspots', async (req, res) => {
    try {
        const settings = getSettings();
        if (!settings.isHotspotFeatureEnabled) {
            return res.status(200).json([]);
        }

        const testWindow = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days for testing

        const recentPosts = await prisma.post.findMany({
            where: {
                createdAt: { gte: testWindow },
                cafeLat: { not: null },
                cafeLng: { not: null }
            },
            select: {
                cafeLat: true,
                cafeLng: true,
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        });

        const hotspots = recentPosts.map(p => ({
            lat: p.cafeLat,
            lng: p.cafeLng,
            weight: 1 + p._count.likes + p._count.comments
        }));

        res.status(200).json(hotspots);
    } catch (error) {
        console.error("Fetch hotspots error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch Posts (Feed)
router.get('/posts', async (req, res) => {
    try {
        const { storeId, filter, countryCode } = req.query;
        let whereClause: any = { isHidden: false };

        if (countryCode && countryCode !== 'GLOBAL') {
            whereClause.countryCode = String(countryCode);
        }
        
        let currentUserId: string | null = null;
        const authHeader = req.headers.authorization;
        if (authHeader) {
            try {
                const tokenStr = authHeader.split(' ')[1];
                const decoded = jwt.verify(tokenStr, JWT_SECRET) as any;
                currentUserId = decoded.id;
                
                // Override device countryCode with user's registered countryCode
                const dbUser = await (prisma as any).user.findUnique({ where: { id: currentUserId }, select: { countryCode: true } });
                if (dbUser && dbUser.countryCode && dbUser.countryCode !== 'GLOBAL') {
                    whereClause.countryCode = dbUser.countryCode;
                }
            } catch (e) {}
        }

        if (storeId) {
            whereClause.storeId = String(storeId);
        }

        if (req.query.clubId) {
            whereClause.clubId = String(req.query.clubId);
            if (currentUserId) {
                const membership = await (prisma as any).clubMember.findUnique({
                    where: { clubId_userId: { clubId: String(req.query.clubId), userId: currentUserId } }
                });
                if (!membership || membership.role === 'PENDING') {
                    return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
                }
            } else {
                return res.status(401).json({ error: ERROR_CODES.UNAUTHORIZED });
            }
        } else {
            whereClause.clubId = null;
        }

        if (filter === 'following_story') {
            if (!currentUserId) return res.status(401).json({ error: ERROR_CODES.UNAUTHORIZED });
            const followedStores = await (prisma as any).storeFollow.findMany({
                where: { userId: currentUserId },
                select: { storeId: true }
            });
            const followedStoreIds = followedStores.map((f: any) => f.storeId);
            const ownedStores = await (prisma as any).store.findMany({
                where: { ownerId: currentUserId },
                select: { id: true }
            });
            const ownedStoreIds = ownedStores.map((s: any) => s.id);
            const allRelevantStoreIds = [...followedStoreIds, ...ownedStoreIds];
            
            const followedUsers = await (prisma as any).userFollow.findMany({
                where: { followerId: currentUserId },
                select: { followingId: true }
            });
            const followedUserIds = followedUsers.map((f: any) => f.followingId);

            whereClause.postType = { not: 'NORMAL' };
            whereClause.OR = [
                { authorId: currentUserId },
                { store: { ownerId: currentUserId } }
            ];
            if (allRelevantStoreIds.length > 0) {
                whereClause.OR.push({ storeId: { in: allRelevantStoreIds } });
            }
            if (followedUserIds.length > 0) {
                whereClause.OR.push({ authorId: { in: followedUserIds } });
            }
        } else if (filter === 'shorts') {
            whereClause.OR = [
                { isShorts: true },
                { image: { contains: '.mp4' } },
                { image: { contains: '.mov' } },
                { image: { contains: '.webm' } }
            ];
        } else if (filter === 'hot_3m') {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            whereClause.createdAt = { gte: threeMonthsAgo };
            whereClause.image = { not: null };
            whereClause.postType = 'NORMAL';
        } else if (filter === 'hot_today') {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); // Expanded to 3 days to avoid empty feed in dev
            whereClause.createdAt = { gte: threeDaysAgo };
            whereClause.postType = 'NORMAL';
        } else if (!storeId && filter !== 'near_live') {
            whereClause.postType = 'NORMAL';
            whereClause.isShorts = false;
        }

        let takeCount = 30; // Optimized from 50
        if (filter === 'hot_3m' || filter === 'hot_today') {
            takeCount = 100; // Fetch more to sort by reactions in memory
        }

        const posts = await (prisma as any).post.findMany({
            where: whereClause,
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ],
            take: takeCount,
            include: {
                author: { select: {
                        id: true,
                        nickname: true,
                        profileImageUrl: true,
                        role: true,
                        stores: { select: { name: true } }
                    } 
                },
                _count: {
                    select: { likes: true, comments: true, bookmarks: true }
                },
                store: {
                    select: { 
                        id: true, 
                        ownerId: true,
                        name: true,
                        address: true,
                        lat: true,
                        lng: true,
                        mainImageUrl: true,
                        primaryCoffeeType: true
                    }
                },
                likes: currentUserId ? { where: { userId: currentUserId } } : undefined,
                bookmarks: currentUserId ? { where: { userId: currentUserId } } : undefined,
                attachedCourse: {
                    select: { id: true, name: true, isPilgrimageCourse: true, _count: { select: { items: true } } }
                },
                collectionItems: {
                    select: { collection: { select: { userId: true } } }
                },
                comments: {
                    where: { imageUrl: { not: null } },
                    select: { imageUrl: true },
                    orderBy: { createdAt: 'desc' },
                    take: 4
                },
                poll: {
                    include: {
                        options: {
                            include: {
                                _count: { select: { votes: true } },
                                votes: currentUserId ? {
                                    where: { userId: currentUserId },
                                    select: { userId: true }
                                } : undefined
                            }
                        }
                    }
                }
            }
        });

        const toDateStr = (d: Date | string) => new Date(d).toISOString().split('T')[0];
        const todayStr = toDateStr(new Date());

        const processedPosts = posts.filter((post: any) => {
            if (post.isPinned) {
                if (post.pinnedStartDate && toDateStr(post.pinnedStartDate) > todayStr) return false;
                if (post.pinnedEndDate && toDateStr(post.pinnedEndDate) < todayStr) return false;
            }
            return true;
        });

        if (filter === 'hot_3m' || filter === 'hot_today') {
            processedPosts.sort((a: any, b: any) => {
                const aScore = (a._count?.likes || 0) + (a._count?.comments || 0);
                const bScore = (b._count?.likes || 0) + (b._count?.comments || 0);
                return bScore - aScore;
            });
            if (filter === 'hot_3m') processedPosts.splice(10); // Keep top 10
            if (filter === 'hot_today') processedPosts.splice(5); // Keep top 5
        } else {
            processedPosts.sort((a: any, b: any) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        }

        res.json(processedPosts);
    } catch (error) {
        console.error("Fetch Posts Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch Unread Announcements Count for the Current User
router.get('/announcements/unread', authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const lastRead = req.query.lastRead ? new Date(req.query.lastRead as string) : new Date(0);

        const followedStores = await (prisma as any).storeFollow.findMany({
            where: { userId },
            select: { storeId: true }
        });
        const followedStoreIds = followedStores.map((f: any) => f.storeId);
        
        const followedUsers = await (prisma as any).userFollow.findMany({
            where: { followerId: userId },
            select: { followingId: true }
        });
        const followedUserIds = followedUsers.map((f: any) => f.followingId);

        if (followedStoreIds.length === 0 && followedUserIds.length === 0) {
            return res.json({ count: 0 });
        }

        const count = await (prisma as any).post.count({
            where: {
                OR: [
                    { 
                        storeId: { in: followedStoreIds },
                        postType: { not: 'NORMAL' }
                    },
                    { authorId: { in: followedUserIds } }
                ],
                authorId: { not: userId }, // Don't badge my own posts
                createdAt: { gt: lastRead }
            }
        });

        res.json({ count });
    } catch (error) {
        console.error("Fetch Unread Count Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch Single Post
router.get('/posts/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await (prisma as any).post.findUnique({
            where: { id: postId },
            include: {
                author: { select: { id: true, nickname: true, profileImageUrl: true, role: true , stores: { select: { name: true } }} },
                _count: { select: { likes: true, comments: true, bookmarks: true } },
                store: { 
                    select: { id: true, ownerId: true, name: true, address: true, lat: true, lng: true, mainImageUrl: true, primaryCoffeeType: true }
                },
                likes: true, 
                bookmarks: true,
                collectionItems: {
                    select: { collection: { select: { userId: true } } }
                },
                comments: {
                    where: { imageUrl: { not: null } },
                    select: { imageUrl: true },
                    orderBy: { createdAt: 'desc' },
                    take: 4
                },
                poll: {
                    include: {
                        options: {
                            include: {
                                _count: { select: { votes: true } },
                                votes: { select: { userId: true } }
                            }
                        }
                    }
                }
            }
        });
        
        if (!post) return res.status(404).json({ error: ERROR_CODES.POST_NOT_FOUND });
        res.json(post);
    } catch (error) {
        console.error("Fetch Single Post Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Helper middleware to catch Multer errors gracefully
const postUploadMiddleware = (req: any, res: any, next: any) => {
    upload.array('images', 10)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error("Multer Error during upload:", err);
            return res.status(400).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
        } else if (err) {
            console.error("Unknown Error during upload:", err);
            return res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
        }
        next();
    });
};

// POST: Create a new Post
router.post('/posts', authenticateToken, uploadLimiter, postUploadMiddleware, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const { content } = req.body;
        
        if (isRateLimited(userId, 'POST', content?.substring(0, 50) || '사진/동영상 게시물')) {
            return res.status(429).json({ error: '도배 방지를 위해 1분 내의 연속 작성은 제한됩니다.' });
        }

        // Always fetch the live role from DB to bypass stale JWT claims
        const userCheckResult = await (prisma as any).user.findUnique({ where: { id: userId }, select: { role: true, countryCode: true } });
        const userRole = userCheckResult?.role || (req as any).user.role;
        const userCountryCode = userCheckResult?.countryCode;

        const { cafeName, cafeLocation, cafeLat, cafeLng, acidity, sweetness, body, bitterness, aroma, taggedBean, recipeData, pollData, storeId, postType, isPilgrimageLedger, attachedCourseId, countryCode } = req.body;
        
        // Auto-Moderation Check (AI Safety via DB)
        if (content) {
            const modRes = await containsBannedWord(content, 'ko');
            if (modRes.isBanned) {
                return res.status(400).json({ error: `해당 게시물에 정책상 허용되지 않는 키워드(${modRes.word})가 포함되어 있습니다.` });
            }
        }
        
        let imageUrls: string[] = [];
        
        // Handle standard multipart/form-data files
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach(file => {
                imageUrls.push(`/uploads/community/${file.filename}`);
            });
        } 
        
        // Handle Base64 strings sent from Capacitor
        // body.images could be an array or a single string
        let base64Inputs: string[] = [];
        if (req.body.images) {
            base64Inputs = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
        } else if (req.body.image) {
            // Fallback for older single-image clients
            base64Inputs = Array.isArray(req.body.image) ? req.body.image : [req.body.image];
        }

        base64Inputs.forEach(base64Data => {
             const base64MimeType = base64Data.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';
             const extension = base64MimeType.split('/')[1] || 'jpg';
             const base64Image = base64Data.split(';base64,').pop();
             
             if (base64Image) {
                 const fileName = `base64-${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
                 const filePath = path.join(uploadDir, fileName);
                 fs.writeFileSync(filePath, base64Image, {encoding: 'base64'});
                 imageUrls.push(`/uploads/community/${fileName}`);
             }
        });

        const imageField = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;
        
        let finalStoreId = storeId || null;
        let isClubManager = false;
        if (req.body.clubId) {
            const membership = await (prisma as any).clubMember.findUnique({
                where: { clubId_userId: { clubId: String(req.body.clubId), userId } }
            });
            if (membership && ['OWNER', 'ADMIN', 'EVENT_MANAGER'].includes(membership.role)) {
                isClubManager = true;
            }
        }

        const normalizedPostType = Array.isArray(postType) ? postType[0] : postType;
        const resolvedPostType = (normalizedPostType && ['ANNOUNCEMENT', 'EVENT'].includes(normalizedPostType) && (['OWNER', 'HOST', 'ADMIN'].includes(userRole) || isClubManager)) ? normalizedPostType : 'NORMAL';

        // Auto-tag the Host's store if they forgot to do it manually for an announcement
        if (resolvedPostType !== 'NORMAL' && !finalStoreId) {
            const ownedStore = await (prisma as any).store.findFirst({
                where: { ownerId: userId },
                select: { id: true, name: true, address: true }
            });
            if (ownedStore) {
                finalStoreId = ownedStore.id;
                // Optionally backfill cafeName and Location strictly for UI consistency
                req.body.cafeName = req.body.cafeName || ownedStore.name;
                req.body.cafeLocation = req.body.cafeLocation || ownedStore.address;
            }
        }

        const post = await (prisma as any).post.create({
            data: {
                authorId: userId,
                countryCode: (userCountryCode && userCountryCode !== 'GLOBAL') ? userCountryCode : (countryCode || 'KR'),
                content,
                image: imageField,
                cafeName: req.body.cafeName ? String(req.body.cafeName).substring(0, 191) : null,
                cafeLocation: req.body.cafeLocation ? String(req.body.cafeLocation).substring(0, 191) : null,
                cafeLat: cafeLat ? parseFloat(cafeLat) : null,
                cafeLng: cafeLng ? parseFloat(cafeLng) : null,
                acidity: acidity ? parseInt(acidity) : null,
                sweetness: sweetness ? parseInt(sweetness) : null,
                body: body ? parseInt(body) : null,
                bitterness: bitterness ? parseInt(bitterness) : null,
                aroma: aroma ? parseInt(aroma) : null,
                taggedBean: taggedBean || null,
                shortsCategory: req.body.shortsCategory ? String(req.body.shortsCategory) : null,
                equipmentTag: req.body.equipmentTag ? String(req.body.equipmentTag) : null,
                recipeData: recipeData || null,
                storeId: finalStoreId,
                attachedCourseId: attachedCourseId || null,
                clubId: req.body.clubId || null,
                postType: resolvedPostType,
                isPilgrimageLedger: isPilgrimageLedger === 'true' || isPilgrimageLedger === true,
                isShorts: req.body.isShorts === 'true' || req.body.isShorts === true,
                ...(pollData ? (() => {
                    try {
                        const parsed = JSON.parse(pollData);
                        return {
                            poll: {
                                create: {
                                    question: parsed.question,
                                    expiresAt: parsed.durationHours ? new Date(Date.now() + parsed.durationHours * 60 * 60 * 1000) : null,
                                    options: {
                                        create: parsed.options.map((opt: string) => ({ text: opt }))
                                    }
                                }
                            }
                        };
                    } catch(e) { return {}; }
                })() : {})
            },
            include: {
                author: { select: { nickname: true, profileImageUrl: true , role: true, stores: { select: { name: true } }} },
                _count: { select: { likes: true, comments: true } },
                store: { 
                    select: { 
                        id: true, 
                        ownerId: true,
                        name: true,
                        address: true,
                        mainImageUrl: true,
                        primaryCoffeeType: true
                    } 
                },
                poll: {
                    include: {
                        options: { include: { _count: { select: { votes: true } }, votes: { select: { userId: true } } } }
                    }
                }
            }
        });

        // Map the result to include storeOwnerId directly for the frontend consistency
        const newPost = {
            ...post,
            storeOwnerId: post.store?.ownerId || null
        };

        res.status(201).json(newPost);

        // Async: Send email notification to store owner if a store was tagged by a user (not the owner themselves)
        if (storeId && resolvedPostType === 'NORMAL') {
            (async () => {
                try {
                    const storeData = await (prisma as any).store.findUnique({
                        where: { id: storeId },
                        include: { owner: { select: { email: true } } }
                    });

                    // Only send if the author is NOT the owner
                    if (storeData && storeData.owner && storeData.owner.email && storeData.ownerId !== userId) {
                        const authorName = post.author?.nickname || '방문자';
                        // Use the original plain text content or a shortened version
                        const previewContent = content.length > 50 ? content.substring(0, 50) + '...' : content;
                        
                        // We assume email is NOT PII-encrypted since it's a @unique login field. 
                        await sendStoreTagNotification(
                            storeData.owner.email,
                            storeData.name,
                            authorName,
                            previewContent
                        );
                    }
                } catch (notiError) {
                    console.error("Failed to process store tag notification:", notiError);
                }
            })();
        }

        // Async: Send Newsletter to Followers if requested
        if (req.body.sendEmail === 'true' && resolvedPostType === 'ANNOUNCEMENT' && finalStoreId) {
            (async () => {
                try {
                    const storeData = await (prisma as any).store.findUnique({
                        where: { id: finalStoreId },
                        select: { name: true }
                    });

                    // Find followers
                    const followers = await (prisma as any).storeFollow.findMany({
                        where: { storeId: finalStoreId },
                        include: { user: { select: { email: true } } }
                    });

                    const bccs: string[] = followers
                        .map((f: any) => f.user?.email)
                        .filter((email: any) => email && typeof email === 'string' && email.includes('@'));

                    if (storeData && bccs.length > 0) {
                        const previewContent = content.length > 300 ? content.substring(0, 300) + '...' : content;
                        await sendStoreNewsletterNotification(bccs, storeData.name, previewContent, imageUrls);
                    }
                } catch (newsletterError) {
                    console.error("Failed to process store newsletter notification:", newsletterError);
                }
            })();
        }

    } catch (error) {
        console.error("Create Post Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Toggle Like
router.post('/posts/:id/like', authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const postId = req.params.id;

        const existingLike = await (prisma as any).like.findUnique({
            where: {
                postId_userId: {
                    postId,
                    userId
                }
            }
        });

        if (existingLike) {
            await (prisma as any).like.delete({ where: { id: existingLike.id } });
            res.json({ liked: false });
        } else {
            await (prisma as any).like.create({
                data: { postId, userId }
            });
            res.json({ liked: true });
        }
    } catch (error) {
        console.error("Toggle Like Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch Comments for a Post
router.get('/posts/:id/comments', async (req, res) => {
    try {
        const postId = req.params.id;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = parseInt(req.query.skip as string) || 0;
        const safeLimit = limit > 100 ? 100 : limit;

        const comments = await (prisma as any).comment.findMany({
            where: { postId, parentId: null, isHidden: false },
            take: safeLimit,
            skip: skip,
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }],
            include: {
                author: { select: { id: true, nickname: true, profileImageUrl: true, role: true , stores: { select: { name: true } }} },
                post: {
                    select: { authorId: true }
                },
                reactions: true,
                replies: {
                    where: { isHidden: false },
                    orderBy: { createdAt: 'asc' },
                    take: 50, // Hard limit nested replies to prevent massive explosion
                    include: {
                        author: { select: { id: true, nickname: true, profileImageUrl: true, role: true , stores: { select: { name: true } }} },
                        reactions: true
                    }
                }
            }
        });
        res.json(comments);
    } catch (error) {
         console.error("Fetch Comments Error:", error);
         res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch Comment Images for a Post (Grouped)
router.get('/posts/:id/comment-images', async (req, res) => {
    try {
        const postId = req.params.id;
        const commentsWithImages = await (prisma as any).comment.findMany({
            where: { 
                postId,
                imageUrl: { not: null },
                isHidden: false
            },
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { id: true, nickname: true, profileImageUrl: true , role: true, stores: { select: { name: true } }} }
            }
        });

        // Group by user (author)
        const groupedByUser: Record<string, any> = {};
        commentsWithImages.forEach((comment: any) => {
            const authorId = comment.author.id;
            if (!groupedByUser[authorId]) {
                groupedByUser[authorId] = {
                    author: comment.author,
                    items: []
                };
            }
            
            let urls: string[] = [];
            try {
                const parsed = JSON.parse(comment.imageUrl);
                urls = Array.isArray(parsed) ? parsed : [comment.imageUrl];
            } catch (e) {
                urls = [comment.imageUrl];
            }
            
            groupedByUser[authorId].items.push({
                commentId: comment.id,
                content: comment.content,
                createdAt: comment.createdAt,
                urls
            });
        });

        res.json(Object.values(groupedByUser));
    } catch (error) {
        console.error("Fetch Comment Images Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Add Comment
router.post('/posts/:id/comments', authenticateToken, uploadLimiter, postUploadMiddleware, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const postId = req.params.id;
        const { content, parentId } = req.body;

        if (isRateLimited(userId, 'COMMENT', content?.substring(0, 50) || '사진/동영상 댓글')) {
            return res.status(429).json({ error: '도배 방지를 위해 1분 내의 연속 작성은 제한됩니다.' });
        }

        // Auto-Moderation Check (AI Safety via DB)
        if (content) {
            const modRes = await containsBannedWord(content, 'ko');
            if (modRes.isBanned) {
                return res.status(400).json({ error: `댓글에 정책상 허용되지 않는 키워드(${modRes.word})가 포함되어 있습니다.` });
            }
        }

        const hasImages = (req.files && Array.isArray(req.files) && req.files.length > 0) || 
                          (req.body.image && typeof req.body.image === 'string' && req.body.image.length > 0);

        if ((!content || content.trim().length === 0) && !hasImages) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        let imageUrls: string[] = [];
        
        // Handle standard multipart/form-data files
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach(file => {
                imageUrls.push(`/uploads/community/${file.filename}`);
            });
        }
        
        // Backwards compatibility for single base64 string
        if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:')) {
            const base64Data = req.body.image;
            const base64MimeType = base64Data.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';
            const extension = base64MimeType.split('/')[1] || 'jpg';
            const base64Image = base64Data.split(';base64,').pop();
            
            if (base64Image) {
                const fileName = `comment-base64-${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
                const filePath = path.join(uploadDir, fileName);
                fs.writeFileSync(filePath, base64Image, {encoding: 'base64'});
                imageUrls.push(`/uploads/community/${fileName}`);
            }
        }

        const imageField = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;

        const finalContent = content ? content.trim() : "";
        const comment = await (prisma as any).comment.create({
            data: {
                postId,
                authorId: userId,
                parentId: parentId || null,
                content: finalContent,
                imageUrl: imageField
            },
            include: {
                author: { select: { id: true, nickname: true, profileImageUrl: true, role: true , stores: { select: { name: true } }} },
                reactions: true,
                replies: { include: { author: { select: { id: true, nickname: true, profileImageUrl: true, role: true , stores: { select: { name: true } }} }, reactions: true } }
            }
        });

        res.status(201).json(comment);
    } catch (error) {
        console.error("Add Comment Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Toggle Comment Emoji Reaction
router.post('/comments/:id/reactions', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const commentId = req.params.id;
        const { emoji } = req.body;

        if (!emoji) return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });

        const existingReactions = await (prisma as any).commentReaction.findMany({
            where: {
                commentId,
                userId
            }
        });

        const sameEmojiReaction = existingReactions.find((r: any) => r.emoji === emoji);

        if (sameEmojiReaction) {
            await (prisma as any).commentReaction.delete({ where: { id: sameEmojiReaction.id } });
            res.json({ success: true, action: 'removed', emoji });
        } else {
            // Delete any existing reactions if modifying to a new one
            for (const r of existingReactions) {
                await (prisma as any).commentReaction.delete({ where: { id: r.id } });
            }
            await (prisma as any).commentReaction.create({
                data: { commentId, userId, emoji }
            });
            res.json({ success: true, action: 'added', emoji });
        }
    } catch (error) {
        console.error("Toggle Comment Reaction Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update Comment
router.put('/comments/:id', authenticateToken, uploadLimiter, postUploadMiddleware, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const commentId = req.params.id;
        const { content, existingImages } = req.body;

        // Auto-Moderation Check (AI Safety via DB)
        if (content) {
            const modRes = await containsBannedWord(content, 'ko');
            if (modRes.isBanned) {
                return res.status(400).json({ error: `댓글에 정책상 허용되지 않는 키워드(${modRes.word})가 포함되어 있습니다.` });
            }
        }

        const hasImages = 
            (req.files && Array.isArray(req.files) && req.files.length > 0) || 
            (existingImages && Array.isArray(JSON.parse(existingImages)) && JSON.parse(existingImages).length > 0);

        if ((!content || content.trim().length === 0) && !hasImages) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        const comment = await (prisma as any).comment.findUnique({
            where: { id: commentId }
        });

        if (!comment) return res.status(404).json({ error: ERROR_CODES.COMMENT_NOT_FOUND });

        // Ensure only author can edit
        if (comment.authorId !== userId) {
            return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }

        let imageUrls: string[] = [];
        
        // Add existing remote images
        if (existingImages) {
            try {
                const parsedExisting = JSON.parse(existingImages);
                if (Array.isArray(parsedExisting)) {
                    imageUrls = [...parsedExisting];
                }
            } catch (e) {
                console.error("Failed to parse existingImages", e);
            }
        }

        // Add newly uploaded physical files
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach(file => {
                imageUrls.push(`/uploads/community/${file.filename}`);
            });
        }
        
        const imageField = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;
        const finalContent = content ? content.trim() : "";

        const updatedComment = await (prisma as any).comment.update({
            where: { id: commentId },
            data: { content: finalContent, imageUrl: imageField, updatedAt: new Date() }
        });

        res.json(updatedComment);
    } catch (error) {
        console.error("Update Comment Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// DELETE: Delete Comment
router.delete('/comments/:id', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const commentId = req.params.id;

        const comment = await (prisma as any).comment.findUnique({
            where: { id: commentId },
            include: { post: true }
        });

        if (!comment) return res.status(404).json({ error: ERROR_CODES.COMMENT_NOT_FOUND });

        // User must be the comment author OR the post owner (optional admin logic)
        // Here we restrict to comment author only as requested.
        if (comment.authorId !== userId) {
            return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }

        await (prisma as any).comment.delete({
            where: { id: commentId }
        });

        res.json({ success: true, message: "Comment deleted successfully" });
    } catch (error) {
        console.error("Delete Comment Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Toggle Comment Pin
router.post('/comments/:id/pin', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const commentId = req.params.id;

        const comment = await (prisma as any).comment.findUnique({
            where: { id: commentId },
            include: { 
                post: {
                    include: { 
                        club: true,
                        store: { select: { ownerId: true } }
                    }
                } 
            }
        });

        if (!comment) return res.status(404).json({ error: ERROR_CODES.COMMENT_NOT_FOUND });

        // Post author, Club Owner or Store Owner can pin/unpin comments
        const isPostAuthor = comment.post.authorId === userId;
        const isClubOwner = comment.post.club && comment.post.club.ownerId === userId;
        const isStoreOwner = comment.post.store && comment.post.store.ownerId === userId;
        
        if (!isPostAuthor && !isClubOwner && !isStoreOwner) {
            return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }

        const updatedComment = await (prisma as any).comment.update({
            where: { id: commentId },
            data: { isPinned: !comment.isPinned }
        });

        res.json({ success: true, isPinned: updatedComment.isPinned });
    } catch (error) {
        console.error("Toggle Pin Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Toggle Bookmark
router.post('/posts/:id/bookmark', authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const postId = req.params.id;

        const existingBookmark = await (prisma as any).postBookmark.findUnique({
            where: {
                postId_userId: {
                    postId,
                    userId
                }
            }
        });

        if (existingBookmark) {
            await (prisma as any).postBookmark.delete({ where: { id: existingBookmark.id } });
            res.json({ bookmarked: false });
        } else {
            await (prisma as any).postBookmark.create({
                data: { postId, userId }
            });
            res.json({ bookmarked: true });
        }
    } catch (error) {
        console.error("Toggle Bookmark Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Increment Share Count
router.post('/posts/:id/share', async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await (prisma as any).post.update({
            where: { id: postId },
            data: { shareCount: { increment: 1 } },
            select: { shareCount: true }
        });
        res.json({ shareCount: post.shareCount });
    } catch (error) {
        console.error("Share Increment Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch Bookmarked Posts for a User
router.get('/posts/bookmarked', authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const bookmarks = await (prisma as any).postBookmark.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                post: {
                    include: {
                        author: { select: {
                                id: true,
                                nickname: true,
                                profileImageUrl: true,
                                role: true,
                                stores: { select: { name: true } }
                            }
                        },
                        _count: {
                            select: { likes: true, comments: true, bookmarks: true }
                        }
                    }
                }
            }
        });

        res.json(bookmarks);
    } catch (error) {
        console.error("Fetch Bookmarked Posts Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// DELETE: Delete a Post
router.delete('/posts/:id', authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const postId = req.params.id;

        const post = await (prisma as any).post.findUnique({
            where: { id: postId },
            select: { authorId: true, clubId: true, club: { select: { ownerId: true } } }
        });

        if (!post) {
            return res.status(404).json({ error: ERROR_CODES.POST_NOT_FOUND });
        }

        const isAuthor = post.authorId === userId;
        const isClubOwner = post.club && post.club.ownerId === userId;
        
        let isContentManager = false;
        if (post.clubId) {
             const membership = await (prisma as any).clubMember.findUnique({
                 where: { clubId_userId: { clubId: post.clubId, userId } }
             });
             if (membership && ['OWNER', 'ADMIN', 'CONTENT_MANAGER'].includes(membership.role)) {
                 isContentManager = true;
             }
        }

        if (!isAuthor && !isClubOwner && !isContentManager) {
            return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }

        // Delete associated records if they not cascade
        await (prisma as any).like.deleteMany({ where: { postId } });
        await (prisma as any).comment.deleteMany({ where: { postId } });
        await (prisma as any).postBookmark.deleteMany({ where: { postId } });

        await (prisma as any).post.delete({
            where: { id: postId }
        });

        res.json({ success: true, message: "Post deleted" });
    } catch (error) {
        console.error("Delete Post Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: // PUT: Update an existing Post
router.put('/posts/:id', authenticateToken, uploadLimiter, upload.array('images', 5), async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = (req as any).user.id;
        const { content, cafeName, cafeLocation, cafeLat, cafeLng, acidity, sweetness, body, bitterness, aroma, taggedBean, recipeData, existingImages, storeId } = req.body;

        const post = await (prisma as any).post.findUnique({ where: { id: postId }, include: { poll: true } });
        if (!post) return res.status(404).json({ error: ERROR_CODES.POST_NOT_FOUND });
        if (post.authorId !== userId) return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED });

        // Parse existing images that the user kept
        let imageUrls: string[] = [];
        if (existingImages) {
            const parsedExisting = JSON.parse(existingImages);
            imageUrls = Array.isArray(parsedExisting) ? parsedExisting : [];
        }

        // Handle standard multipart/form-data new files
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach(file => {
                imageUrls.push(`/uploads/community/${file.filename}`);
            });
        } 

        // Handle Base64 strings sent from Capacitor
        let base64Inputs: string[] = [];
        if (req.body.images) {
            base64Inputs = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
        } else if (req.body.image) {
             base64Inputs = Array.isArray(req.body.image) ? req.body.image : [req.body.image];
        }

        base64Inputs.forEach(base64Data => {
             const base64MimeType = base64Data.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';
             const extension = base64MimeType.split('/')[1] || 'jpg';
             const base64Image = base64Data.split(';base64,').pop();
             
             if (base64Image) {
                 const fileName = `base64-${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
                 const filePath = path.join(uploadDir, fileName);
                 fs.writeFileSync(filePath, base64Image, {encoding: 'base64'});
                 imageUrls.push(`/uploads/community/${fileName}`);
             }
        });
        
        const imageField = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;

        const updatedPost = await (prisma as any).post.update({
            where: { id: postId },
            data: {
                content,
                image: imageField,
                cafeName: cafeName || null,
                cafeLocation: cafeLocation || null,
                cafeLat: cafeLat ? parseFloat(cafeLat) : null,
                cafeLng: cafeLng ? parseFloat(cafeLng) : null,
                acidity: acidity ? parseInt(acidity) : null,
                sweetness: sweetness ? parseInt(sweetness) : null,
                body: body ? parseInt(body) : null,
                bitterness: bitterness ? parseInt(bitterness) : null,
                aroma: aroma ? parseInt(aroma) : null,
                taggedBean: taggedBean || null,
                shortsCategory: req.body.shortsCategory ? String(req.body.shortsCategory) : null,
                equipmentTag: req.body.equipmentTag ? String(req.body.equipmentTag) : null,
                recipeData: recipeData || null,
                ...((() => {
                    let pollOp: any = {};
                    if (req.body.pollData) {
                        try {
                            const parsed = JSON.parse(req.body.pollData);
                            pollOp = {
                                upsert: {
                                    create: {
                                        question: parsed.question,
                                        expiresAt: parsed.durationHours ? new Date(Date.now() + parsed.durationHours * 60 * 60 * 1000) : null,
                                        options: { create: parsed.options.map((opt: string) => ({ text: opt })) }
                                    },
                                    update: {
                                        expiresAt: parsed.durationHours ? new Date(Date.now() + parsed.durationHours * 60 * 60 * 1000) : null
                                    }
                                }
                            };
                        } catch(e) {}
                    } else if (req.body.removePoll === 'true' && post.poll) {
                        pollOp = { delete: true };
                    }
                    return Object.keys(pollOp).length > 0 ? { poll: pollOp } : {};
                })())
            },
            include: {
                author: { select: { nickname: true, profileImageUrl: true, role: true , stores: { select: { name: true } }} },
                _count: { select: { likes: true, comments: true, bookmarks: true } },
                poll: {
                    include: {
                        options: { include: { _count: { select: { votes: true } }, votes: { select: { userId: true } } } }
                    }
                }
            }
        });

        res.json(updatedPost);
    } catch (error) {
        console.error("Edit Post Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Toggle Post Pin (Announcements)
router.post('/posts/:id/pin', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const postId = req.params.id;

        const post = await (prisma as any).post.findUnique({
            where: { id: postId },
            include: { club: true }
        });

        if (!post) {
            return res.status(404).json({ error: ERROR_CODES.POST_NOT_FOUND });
        }

        const isAuthor = post.authorId === userId;
        const isClubOwner = post.club && post.club.ownerId === userId;

        let isContentManager = false;
        if (post.clubId) {
             const membership = await (prisma as any).clubMember.findUnique({
                 where: { clubId_userId: { clubId: post.clubId, userId } }
             });
             if (membership && ['OWNER', 'ADMIN', 'CONTENT_MANAGER'].includes(membership.role)) {
                 isContentManager = true;
             }
        }

        if (!isAuthor && !isClubOwner && !isContentManager) {
            return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }

        const updatedPost = await (prisma as any).post.update({
            where: { id: postId },
            data: { isPinned: !post.isPinned }
        });

        res.json({ success: true, isPinned: updatedPost.isPinned });
    } catch (error) {
        console.error("Toggle Post Pin Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Vote on a poll
router.post('/posts/:postId/poll/vote', authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const { postId } = req.params;
        const { optionId } = req.body;

        if (!optionId) return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });

        const poll = await (prisma as any).poll.findUnique({
            where: { postId },
            include: { options: true }
        });
        if (!poll) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        if (poll.expiresAt && new Date() > new Date(poll.expiresAt)) return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        if (!poll.options.find((o: any) => o.id === optionId)) return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });

        const existingVote = await (prisma as any).pollVote.findFirst({
            where: { userId, option: { pollId: poll.id } }
        });

        if (existingVote) {
             if (existingVote.optionId === optionId) {
                  return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
             }
             await (prisma as any).pollVote.delete({ where: { id: existingVote.id } });
        }

        const newVote = await (prisma as any).pollVote.create({
            data: { userId, optionId }
        });

        res.json({ success: true, vote: newVote });
    } catch (error) {
        console.error("Poll Vote Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- ADS ---

router.get('/ads', async (req, res) => {
    try {
        const country = (req.query.country as string) || 'GLOBAL';
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        
        const currentDayStr = now.getDay().toString();
        const currentHourStr = now.getHours().toString().padStart(2, '0');
        
        // Find active creatives under active campaigns and contracts
        const creatives = await prisma.adCreative.findMany({
            where: {
                status: 'ACTIVE',
                campaign: {
                    status: 'ACTIVE',
                    startDate: { lte: now },
                    endDate: { gte: startOfDay },
                    targetCountry: { in: ['GLOBAL', country.toUpperCase()] },
                    contract: {
                        status: 'ACTIVE',
                        startDate: { lte: now },
                        endDate: { gte: startOfDay }
                    }
                }
            },
            include: {
                campaign: {
                    include: { contract: true }
                },
                placement: true
            }
        });

        // Day and Time Parting Filtering
        const currentDayNum = Number(currentDayStr);
        const currentHourNum = Number(currentHourStr);
        
        const validCreatives = creatives.filter((c: any) => {
            const camp = c.campaign;
            const contract = camp.contract;

            // Strict Budget Enforcement (Fallback for stuck ACTIVE states)
            if (contract.pricingModel !== 'FIXED' && contract.spentBudget >= contract.totalBudget) {
                return false;
            }

            if (camp.targetDays && camp.targetDays.trim() !== '') {
                const dayParts = camp.targetDays.split(',').map((d: string) => d.trim());
                let dayMatched = false;
                for (const part of dayParts) {
                    if (part.includes('~') || part.includes('-')) {
                        const sep = part.includes('~') ? '~' : '-';
                        const [start, end] = part.split(sep).map(Number);
                        if (!isNaN(start) && !isNaN(end) && currentDayNum >= start && currentDayNum <= end) {
                            dayMatched = true; break;
                        }
                    } else if (Number(part) === currentDayNum) {
                        dayMatched = true; break;
                    }
                }
                if (!dayMatched) return false;
            }
            if (camp.targetHours && camp.targetHours.trim() !== '') {
                const hourParts = camp.targetHours.split(',').map((h: string) => h.trim());
                let hourMatched = false;
                for (const part of hourParts) {
                    if (part.includes('~') || part.includes('-')) {
                        const sep = part.includes('~') ? '~' : '-';
                        const [start, end] = part.split(sep).map(Number);
                        if (!isNaN(start) && !isNaN(end) && currentHourNum >= start && currentHourNum <= end) {
                            hourMatched = true; break;
                        }
                    } else if (Number(part) === currentHourNum) {
                        hourMatched = true; break;
                    }
                }
                if (!hourMatched) return false;
            }
            return true;
        });

        const userTags = req.query.tags ? String(req.query.tags).split(',').map(t=>t.trim()) : [];

        // Map and score based on Contextual Taste Tags
        const formattedAds = validCreatives.map((c: any) => {
            let score = c.priority || 1;
            
            // Contextual AI Matching: Boost score if tags overlap
            if (userTags.length > 0) {
                if (c.flavorTags) {
                    const adFlavors = c.flavorTags.split(',').map((t: string) => t.trim());
                    const matchCount = adFlavors.filter((t: string) => userTags.includes(t)).length;
                    score += matchCount * 10; 
                }
                if (c.originTags) {
                    const adOrigins = c.originTags.split(',').map((t: string) => t.trim());
                    const matchCount = adOrigins.filter((t: string) => userTags.includes(t)).length;
                    score += matchCount * 10;
                }
            }

            return {
                id: c.id,
                title: c.name,
                type: c.type,
                size: c.size,
                content: c.content,
                linkUrl: c.linkUrl,
                placement: c.placement?.locationKey || 'FEED_STANDARD',
                targetCountry: c.campaign.targetCountry,
                matchScore: score,
                overlayText: c.overlayText,
                overlayFontSize: c.overlayFontSize,
                overlayColor: c.overlayColor,
                overlayPosition: c.overlayPosition
            };
        }).sort((a: any, b: any) => b.matchScore - a.matchScore);

        res.status(200).json(formattedAds);
    } catch (error) {
        console.error("Fetch ads error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.post('/ads/:id/click', async (req, res) => {
    try {
        const { id } = req.params;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        await prisma.adLog.create({
            data: {
                creativeId: id,
                actionType: 'CLICK',
                ipAddress: ip ? String(ip) : null,
                userAgent: req.headers['user-agent'] || null
            }
        });

        // CPC Deduction Logic
        const creative = await prisma.adCreative.findUnique({
            where: { id },
            include: { campaign: { include: { contract: true } } }
        });

        if (creative && creative.cpcPrice && creative.cpcPrice > 0 && creative.campaign?.contract) {
            const contract = creative.campaign.contract;
            
            // ATOMIC DECREMENT to prevent race conditions during parallel concurrent clicks
            const updatedContract = await prisma.contract.update({
                where: { id: contract.id },
                data: {
                    spentBudget: { increment: creative.cpcPrice }
                }
            });

            // Complete campaigns if spent exceeds total budget
            if (updatedContract.spentBudget >= updatedContract.totalBudget && updatedContract.status !== 'COMPLETED') {
                await prisma.contract.update({
                    where: { id: contract.id },
                    data: { status: 'COMPLETED' }
                });

                await prisma.campaign.updateMany({
                    where: { contractId: contract.id },
                    data: { status: 'COMPLETED' }
                });
            }
        }
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Ad click error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.post('/ads/:id/impression', async (req, res) => {
    try {
        const { id } = req.params;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        await prisma.adLog.create({
            data: {
                creativeId: id,
                actionType: 'IMPRESSION',
                ipAddress: ip ? String(ip) : null,
                userAgent: req.headers['user-agent'] || null
            }
        });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Ad impression error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- AD INQUIRIES ---

router.post('/ad-inquiries', async (req, res) => {
    try {
        const { advertiser, content, contactName, contactPhone, contactEmail, userId } = req.body;
        
        if (!advertiser || !content || !contactName || !contactPhone || !contactEmail) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        const inquiry = await prisma.adInquiry.create({
            data: {
                advertiser,
                content,
                contactName,
                contactPhone,
                contactEmail,
                userId: userId || null
            }
        });

        const adminEmail = process.env.ADMIN_EMAIL || 'wjeon@infosk.co.kr';
        await sendAdInquiryAdminNotification(adminEmail, inquiry);

        res.status(201).json(inquiry);
    } catch (error) {
        console.error("Failed to submit ad inquiry:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- PUBLIC COURSES (Phase 7) ---

// GET: Fetch Public Pilgrimage Course
router.get('/courses/:id', async (req, res) => {
    try {
        let authUserId = null;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            try {
                const user = jwt.verify(token, process.env.JWT_SECRET as string);
                authUserId = (user as any).id;
            } catch (e) {} // Fail silently if anonymous/expired token
        }

        const { id } = req.params;
        const course = await (prisma as any).collection.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, nickname: true, profileImageUrl: true, role: true } },
                items: {
                    include: {
                        post: {
                            include: {
                                author: { select: { nickname: true, profileImageUrl: true, role: true , stores: { select: { name: true } }} }
                            }
                        },
                        store: {
                            select: { id: true, mainImageUrl: true, name: true, address: true, lat: true, lng: true }
                        }
                    },
                    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }]
                }
            }
        });

        if (!course) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });

        // Allow access: if someone has the specific UUID (e.g. via CoffeeTalk post attachment), they can view it.

        res.json(course);
    } catch (error) {
        console.error("Fetch Public Course Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Fork Public Course
router.post('/courses/:id/fork', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const originalCourse = await (prisma as any).collection.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!originalCourse) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });

        // Allow forking if they have the UUID link:
        if (originalCourse.userId === userId) return res.status(400).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });

        // Deep copy the collection
        const newCollection = await (prisma as any).collection.create({
            data: {
                userId,
                name: `${originalCourse.name} (Fork)`,
                description: originalCourse.description,
                isPublic: false,
                isPilgrimageCourse: originalCourse.isPilgrimageCourse,
                items: {
                    create: originalCourse.items.map((item: any) => ({
                        postId: item.postId,
                        storeId: item.storeId
                    }))
                }
            }
        });

        res.status(201).json(newCollection);
    } catch (error) {
        console.error("Fork Course Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Report a Post (Anti-spam Stage 3)
router.post('/posts/:id/report', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const postId = req.params.id;
        const { reason } = req.body;

        const post = await (prisma as any).post.findUnique({ where: { id: postId } });
        if (!post) return res.status(404).json({ error: ERROR_CODES.POST_NOT_FOUND });

        // Check if already reported by this user
        const existing = await (prisma as any).report.findFirst({
            where: { reporterId: userId, targetId: postId, targetType: 'POST' }
        });
        if (existing) return res.status(400).json({ error: '이미 신고하신 게시글입니다.' });

        await (prisma as any).report.create({
            data: { reporterId: userId, targetId: postId, targetType: 'POST', reason: reason || '유저 신고' }
        });

        const reportCount = await (prisma as any).report.count({
            where: { targetId: postId, targetType: 'POST' }
        });

        // Auto-blind trigger
        let blindThreshold = getSettings().autoBlindReportCount !== undefined ? getSettings().autoBlindReportCount : 5;
        
        // 악성 신고(음란, 불법, 범죄 등)인 경우 즉시 블라인드 처리 (1단계 적용)
        if (reason && (reason.includes('음란') || reason.includes('불법') || reason.includes('도배') || reason.includes('범죄') || reason.includes('성인'))) {
            blindThreshold = 1;
        }

        if (reportCount >= blindThreshold) {
            await (prisma as any).post.update({
                where: { id: postId },
                data: { isHidden: true }
            });
        }

        res.json({ success: true, isHidden: reportCount >= blindThreshold });
    } catch (error) {
        console.error("Report Post Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Report a Comment (Anti-spam Stage 3)
router.post('/comments/:id/report', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const commentId = req.params.id;
        const { reason } = req.body;

        const comment = await (prisma as any).comment.findUnique({ where: { id: commentId } });
        if (!comment) return res.status(404).json({ error: ERROR_CODES.COMMENT_NOT_FOUND });

        // Check if already reported by this user
        const existing = await (prisma as any).report.findFirst({
            where: { reporterId: userId, targetId: commentId, targetType: 'COMMENT' }
        });
        if (existing) return res.status(400).json({ error: '이미 신고하신 댓글입니다.' });

        await (prisma as any).report.create({
            data: { reporterId: userId, targetId: commentId, targetType: 'COMMENT', reason: reason || '유저 신고' }
        });

        const reportCount = await (prisma as any).report.count({
            where: { targetId: commentId, targetType: 'COMMENT' }
        });

        // Auto-blind trigger
        let blindThreshold = getSettings().autoBlindReportCount !== undefined ? getSettings().autoBlindReportCount : 5;
        
        // 악성 신고(음란, 불법, 범죄 등)인 경우 즉시 블라인드 처리 (1단계 적용)
        if (reason && (reason.includes('음란') || reason.includes('불법') || reason.includes('도배') || reason.includes('범죄') || reason.includes('성인'))) {
            blindThreshold = 1;
        }

        if (reportCount >= blindThreshold) {
            await (prisma as any).comment.update({
                where: { id: commentId },
                data: { isHidden: true }
            });
        }

        res.json({ success: true, isHidden: reportCount >= blindThreshold });
    } catch (error) {
        console.error("Report Comment Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});


// GET: Fetch Single Post Details
router.get('/posts/:id', authenticateToken, async (req: any, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.id;

        const post = await (prisma as any).post.findUnique({
            where: { id },
            include: {
                author: { select: {
                        id: true,
                        nickname: true,
                        profileImageUrl: true,
                        role: true,
                        stores: { select: { name: true } }
                    } 
                },
                _count: {
                    select: { likes: true, comments: true, bookmarks: true }
                },
                store: {
                    select: { 
                        id: true, 
                        ownerId: true,
                        name: true,
                        address: true,
                        lat: true,
                        lng: true,
                        mainImageUrl: true,
                        primaryCoffeeType: true
                    }
                },
                likes: currentUserId ? { where: { userId: currentUserId } } : undefined,
                bookmarks: currentUserId ? { where: { userId: currentUserId } } : undefined,
                attachedCourse: {
                    select: { id: true, name: true, isPilgrimageCourse: true, _count: { select: { items: true } } }
                },
                collectionItems: {
                    select: { collection: { select: { userId: true } } }
                },
                comments: {
                    where: { imageUrl: { not: null } },
                    select: { imageUrl: true },
                    orderBy: { createdAt: 'desc' },
                    take: 4
                },
                poll: {
                    include: {
                        options: {
                            include: {
                                _count: { select: { votes: true } },
                                votes: currentUserId ? {
                                    where: { userId: currentUserId },
                                    select: { userId: true }
                                } : undefined
                            }
                        }
                    }
                }
            }
        });

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json(post);
    } catch (error) {
        console.error("Error fetching single post:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

export default router;
