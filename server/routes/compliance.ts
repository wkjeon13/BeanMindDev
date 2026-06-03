import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET as string;

// Middleware to authenticate JWT token
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'MISSING_AUTH_HEADER' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'INVALID_TOKEN' });
        req.user = user;
        next();
    });
};

// Middleware to optionally authenticate token (for guest compliance requests)
const optionalAuthenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (!err) {
            req.user = user;
        }
        next();
    });
};

// POST: Submit CCPA/CPRA Consumer Rights Request (Access / Delete / Opt-out)
router.post('/request', optionalAuthenticateToken, async (req: any, res: any) => {
    try {
        const { requestEmail, requestType } = req.body;

        if (!requestEmail || !requestType) {
            return res.status(400).json({ error: 'MISSING_REQUIRED_FIELDS' });
        }

        if (!['ACCESS', 'DELETE', 'OPT_OUT'].includes(requestType)) {
            return res.status(400).json({ error: 'INVALID_DATA_FORMAT' });
        }

        const userId = req.user?.id || null;

        const requestLog = await prisma.complianceRequestLog.create({
            data: {
                userId,
                requestEmail,
                requestType,
                status: 'PENDING'
            }
        });

        res.status(201).json({
            success: true,
            message: 'Your privacy request has been submitted successfully.',
            requestId: requestLog.id
        });
    } catch (error) {
        console.error("Submit compliance request error:", error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// GET: Export my personal data (CCPA Right to Access)
router.get('/my-data', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                _count: {
                    select: {
                        prescriptions: true,
                        posts: true,
                        comments: true,
                        bookmarks: true,
                        ownedClubs: true,
                        tastingNotes: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'USER_NOT_FOUND' });
        }

        // Generate clean export payload
        const personalData = {
            exportMeta: {
                exportedAt: new Date().toISOString(),
                description: "This is your personal data report requested under data protection regulations (GDPR / CCPA)."
            },
            accountInfo: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                role: user.role,
                status: user.status,
                loginType: user.loginType,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                preferredLanguage: user.preferredLanguage,
                countryCode: user.countryCode
            },
            profileDetails: {
                ageGroup: user.ageGroup,
                gender: user.gender,
                favoriteCafe: user.favoriteCafe,
                pointBalance: user.pointBalance,
                equippedBadge: user.equippedBadge,
                earnedBadges: user.earnedBadges ? user.earnedBadges.split(',') : []
            },
            tastePreferences: {
                prefAcidity: user.prefAcidity,
                prefSweetness: user.prefSweetness,
                prefBody: user.prefBody,
                prefBitterness: user.prefBitterness,
                prefAroma: user.prefAroma
            },
            statistics: {
                totalPrescriptions: user._count.prescriptions,
                totalPosts: user._count.posts,
                totalComments: user._count.comments,
                totalBookmarks: user._count.bookmarks,
                totalOwnedClubs: user._count.ownedClubs,
                totalTastingNotes: user._count.tastingNotes
            }
        };

        res.status(200).json({ success: true, data: personalData });
    } catch (error) {
        console.error("Export personal data error:", error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

export default router;
