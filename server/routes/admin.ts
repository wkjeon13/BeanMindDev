import express from 'express';
import { PrismaClient } from '@prisma/client';
import { decryptPII } from '../utils/encryption.js';
import { sendAdminAnnouncement, sendContentDeletionNotice, sendFalseReportNotice } from '../utils/mailer.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import mysqldump from 'mysqldump';
import { ERROR_CODES } from '../utils/errorCodes';
import { getSettings, updateSettings } from '../utils/systemSettings.js';
import { refreshBannedWordsCache } from '../utils/contentFilter.js';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const router = express.Router();
import prisma from '../utils/prisma.js';
const JWT_SECRET = process.env.JWT_SECRET as string;

// Middleware to authenticate JWT token and strictly check ADMIN role
const authenticateAdmin = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: ERROR_CODES.MISSING_AUTH_HEADER });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            console.error("authenticateAdmin: INVALID_TOKEN", err);
            return res.status(403).json({ error: ERROR_CODES.INVALID_TOKEN });
        }
        if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
            console.error("authenticateAdmin: UNAUTHORIZED_ACTION, role:", user.role);
            return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }
        req.user = user;
        next();
    });
};

const requireSuperAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: ERROR_CODES.SUPER_ADMIN_REQUIRED });
    }
    next();
};

router.use(authenticateAdmin);

// --- CONTENT MODERATION ---

// GET: Fetch Spam Logs (Stage 1 rate limiting)
router.get('/moderation/spam-logs', async (req: any, res: any) => {
    try {
        const logs = await (prisma as any).spamLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { user: { select: { nickname: true, email: true, profileImageUrl: true } } }
        });
        res.json(logs);
    } catch (error) {
        console.error("Fetch spam logs error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch Blinded Content (Stage 3 report-based)
router.get('/moderation/blinded-content', async (req: any, res: any) => {
    try {
        const posts = await (prisma as any).post.findMany({
            where: { isHidden: true },
            orderBy: { createdAt: 'desc' },
            include: { author: { select: { nickname: true, email: true, profileImageUrl: true } } }
        });
        
        const comments = await (prisma as any).comment.findMany({
            where: { isHidden: true },
            orderBy: { createdAt: 'desc' },
            include: { author: { select: { nickname: true, email: true, profileImageUrl: true } } }
        });

        res.json({ posts, comments });
    } catch (error) {
        console.error("Fetch blinded content error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Restore Blinded Content
router.put('/moderation/blinded-content/:type/:id/restore', async (req: any, res: any) => {
    try {
        const { type, id } = req.params;
        
        if (type === 'POST') {
            await (prisma as any).post.update({
                where: { id },
                data: { isHidden: false }
            });
            // Optional: Also clear reports so it doesn't immediately get blinded again
            await (prisma as any).report.deleteMany({ where: { targetId: id, targetType: 'POST' } });
        } else if (type === 'COMMENT') {
            await (prisma as any).comment.update({
                where: { id },
                data: { isHidden: false }
            });
            await (prisma as any).report.deleteMany({ where: { targetId: id, targetType: 'COMMENT' } });
        } else {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Restore blinded content error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});
// GET: Fetch other content reports (Store, User, Review)
router.get('/moderation/other-reports', async (req: any, res: any) => {
    try {
        const reports = await prisma.report.findMany({
            where: { targetType: { in: ['STORE', 'USER', 'REVIEW', 'POST', 'COMMENT'] } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        // Enhance reports with target details
        const enrichedReports = await Promise.all(reports.map(async (report) => {
            let targetName = '알 수 없음';
            if (report.targetType === 'STORE') {
                const store = await prisma.store.findUnique({ where: { id: report.targetId }, select: { name: true } });
                if (store) targetName = store.name;
            } else if (report.targetType === 'USER') {
                const user = await prisma.user.findUnique({ where: { id: report.targetId }, select: { nickname: true, email: true } });
                if (user) targetName = `${user.nickname} (${user.email})`;
            } else if (report.targetType === 'REVIEW') {
                const review = await prisma.storeReview.findUnique({ where: { id: report.targetId }, select: { content: true } });
                if (review) targetName = `리뷰 내용: ${review.content?.substring(0, 30)}...`;
            } else if (report.targetType === 'POST') {
                const post = await prisma.post.findUnique({ where: { id: report.targetId }, select: { content: true } });
                targetName = `[게시글] ${post?.content?.substring(0, 30) || '사진/내용없음'}...`;
            } else if (report.targetType === 'COMMENT') {
                const comment = await prisma.comment.findUnique({ where: { id: report.targetId }, select: { content: true } });
                targetName = `[댓글] ${comment?.content?.substring(0, 30)}...`;
            }
            
            const reporter = await prisma.user.findUnique({ where: { id: report.reporterId }, select: { nickname: true, email: true } });
            
            return {
                ...report,
                targetName,
                reporterName: reporter ? `${reporter.nickname} (${reporter.email})` : '알 수 없음'
            };
        }));

        res.json(enrichedReports);
    } catch (error) {
        console.error("Fetch other reports error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// DELETE: Delete a report (resolve it)
router.delete('/moderation/reports/:id', async (req: any, res: any) => {
    try {
        await prisma.report.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        console.error("Delete report error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Reject a false report
router.put('/moderation/reports/:id/reject', async (req: any, res: any) => {
    try {
        const { reason, targetName } = req.body;
        
        const report = await prisma.report.findUnique({
            where: { id: req.params.id }
        });
        
        if (!report) return res.status(404).json({ error: ERROR_CODES.REPORT_NOT_FOUND || 'REPORT_NOT_FOUND' });
        
        // Update report status
        const updatedReport = await prisma.report.update({
            where: { id: req.params.id },
            data: { status: 'REJECTED' }
        });
        
        // Fetch Reporter email directly since Prisma \`Report.reporterId\` doesn't have an explicit relation in schema to User currently
        const reporter = await prisma.user.findUnique({ where: { id: report.reporterId } });
        
        if (reporter && reporter.email) {
            await sendFalseReportNotice(
                reporter.email, 
                report.targetType, 
                targetName || '알 수 없음(삭제됨)', 
                reason || '신고 내용을 관리자가 검토하였으나 특이사항이 발견되지 않았습니다. 허위/장난 신고의 경우 서비스 제한 조치가 있을 수 있습니다.'
            );
        }
        
        res.json({ success: true, report: updatedReport });
    } catch (error) {
        console.error("Reject report error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Accept a report and penalize the target
router.put('/moderation/reports/:id/accept', async (req: any, res: any) => {
    try {
        const report = await prisma.report.findUnique({
            where: { id: req.params.id }
        });
        
        if (!report) return res.status(404).json({ error: ERROR_CODES.REPORT_NOT_FOUND || 'REPORT_NOT_FOUND' });
        
        if (report.targetType === 'STORE') {
            await prisma.store.update({
                where: { id: report.targetId },
                data: { status: 'REJECTED' }
            }).catch(() => {});
        } else if (report.targetType === 'USER') {
            await prisma.user.update({
                where: { id: report.targetId },
                data: { status: 'SUSPENDED' }
            }).catch(() => {});
        } else if (report.targetType === 'REVIEW') {
            await prisma.storeReview.delete({
                where: { id: report.targetId }
            }).catch(() => {});
        } else if (report.targetType === 'POST') {
            await prisma.post.update({
                where: { id: report.targetId },
                data: { isHidden: true }
            }).catch(() => {});
        } else if (report.targetType === 'COMMENT') {
            await prisma.comment.update({
                where: { id: report.targetId },
                data: { isHidden: true }
            }).catch(() => {});
        }
        
        // Delete the report record after penalizing target
        await prisma.report.delete({ where: { id: req.params.id } });
        
        res.json({ success: true });
    } catch (error) {
        console.error("Accept report error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Delete community post or comment directly
router.post('/content/delete', async (req: any, res: any) => {
    try {
        const { type, id, reason } = req.body;
        
        if (!type || !id || !reason) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        if (type === 'POST') {
            const post = await prisma.post.findUnique({
                where: { id },
                include: { author: true }
            });
            if (!post) return res.status(404).json({ error: ERROR_CODES.POST_NOT_FOUND });

            await prisma.post.delete({ where: { id } });

            if (post.author && post.author.email) {
                // Send background email
                sendContentDeletionNotice(post.author.email, 'POST', post.content || '게시글 내용 없음', reason).catch(console.error);
            }
        } else if (type === 'COMMENT') {
            const comment = await prisma.comment.findUnique({
                where: { id },
                include: { author: true, post: true }
            });
            if (!comment) return res.status(404).json({ error: ERROR_CODES.COMMENT_NOT_FOUND });

            await prisma.comment.delete({ where: { id } });

            if (comment.author && comment.author.email) {
                // Send background email
                sendContentDeletionNotice(comment.author.email, 'COMMENT', comment.content || '댓글 내용 없음', reason).catch(console.error);
            }
        } else {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to admin-delete content:', error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Set up file upload for admin ads
const uploadDir = path.join(process.cwd(), 'uploads', 'ads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'ad-' + uniqueSuffix + ext);
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req: any, file: any, cb: any) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif|mp4|mov|webm/i;
        const isValid = allowedTypes.test(file.originalname) && allowedTypes.test(file.mimetype);
        if (isValid) cb(null, true);
        else cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
});

router.post('/upload-ad-media', upload.single('media'), async (req: any, res: any) => {
    try {
        if (!req.file) return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        const mediaUrl = `/uploads/ads/${req.file.filename}`;
        res.status(200).json({ url: mediaUrl });
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Generic upload endpoint for Pairings and other settings
router.post('/upload', upload.single('image'), async (req: any, res: any) => {
    try {
        if (!req.file) return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        const mediaUrl = `/uploads/ads/${req.file.filename}`;
        res.status(200).json({ url: mediaUrl });
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- POINT POLICY (COFFEE BEANS) MANAGEMENT ---

const POLICY_FILE = path.join(process.cwd(), 'data', 'policy.json');

// Helper to get policy
const getPointPolicy = () => {
    try {
        if (!fs.existsSync(POLICY_FILE)) {
            const defaultPolicy = {
                id: 'singleton',
                welcomeBeans: 0,
                welcomeFreePrescriptions: 3,
                prescriptionCost: 100,
                reviewReward: 50,
                p2pFeePercent: 0,
                exchangeRate: 1,
                minExchangeAmount: 10000,
                adFrequencyCapHours: 24
            };
            if (!fs.existsSync(path.dirname(POLICY_FILE))) {
                fs.mkdirSync(path.dirname(POLICY_FILE), { recursive: true });
            }
            fs.writeFileSync(POLICY_FILE, JSON.stringify(defaultPolicy, null, 2));
            return defaultPolicy;
        }
        const data = fs.readFileSync(POLICY_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading policy file:", error);
        return {
            id: 'singleton',
            welcomeBeans: 0,
            welcomeFreePrescriptions: 3,
            prescriptionCost: 100,
            reviewReward: 50,
            p2pFeePercent: 0,
            exchangeRate: 1,
            minExchangeAmount: 10000,
            adFrequencyCapHours: 24
        };
    }
};

// GET: Fetch global point policy
router.get('/point-policy', requireSuperAdmin, async (req: any, res: any) => {
    try {
        const policy = getPointPolicy();
        res.status(200).json(policy);
    } catch (error) {
        console.error("Fetch point policy error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update global point policy
router.put('/point-policy', requireSuperAdmin, async (req: any, res: any) => {
    try {
        const { welcomeBeans, welcomeFreePrescriptions, prescriptionCost, reviewReward, p2pFeePercent, exchangeRate, minExchangeAmount, adFrequencyCapHours } = req.body;
        
        const updatedPolicy = {
            id: 'singleton',
            welcomeBeans: welcomeBeans !== undefined ? parseInt(welcomeBeans) : 0,
            welcomeFreePrescriptions: welcomeFreePrescriptions !== undefined ? parseInt(welcomeFreePrescriptions) : 3,
            prescriptionCost: prescriptionCost !== undefined ? parseInt(prescriptionCost) : 100,
            reviewReward: reviewReward !== undefined ? parseInt(reviewReward) : 50,
            p2pFeePercent: p2pFeePercent !== undefined ? parseFloat(p2pFeePercent) : 0,
            exchangeRate: exchangeRate !== undefined ? parseInt(exchangeRate) : 1,
            minExchangeAmount: minExchangeAmount !== undefined ? parseInt(minExchangeAmount) : 10000,
            adFrequencyCapHours: adFrequencyCapHours !== undefined ? parseInt(adFrequencyCapHours) : 24
        };

        if (!fs.existsSync(path.dirname(POLICY_FILE))) {
            fs.mkdirSync(path.dirname(POLICY_FILE), { recursive: true });
        }
        fs.writeFileSync(POLICY_FILE, JSON.stringify(updatedPolicy, null, 2));

        res.status(200).json({ message: 'Point policy updated successfully.', policy: updatedPolicy });
    } catch (error) {
        console.error("Update point policy error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// ----------------------------------------

// GET: Fetch system settings
router.get('/settings', requireSuperAdmin, async (req: any, res: any) => {
    try {
        res.status(200).json(getSettings());
    } catch (error) {
        console.error("Fetch settings error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update system settings
router.put('/settings', requireSuperAdmin, async (req: any, res: any) => {
    try {
        updateSettings(req.body);
        res.status(200).json({ message: 'Settings updated.', settings: getSettings() });
    } catch (error) {
        console.error("Update settings error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// ----------------------------------------

// GET: Fetch all users
router.get('/users', async (req: any, res: any) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                nickname: true, role: true, status: true, createdAt: true, isEmailVerified: true, aiPrescriptionLimit: true,
                _count: {
                    select: { prescriptions: true }
                },
                prescriptions: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { createdAt: true }
                },
                stores: { select: { id: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(users);
    } catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PATCH: Update individual user AI prescription limit
router.patch('/users/:id/limit', async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { limit } = req.body;

        if (typeof limit !== 'number' || limit < 0) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { aiPrescriptionLimit: limit }
        });

        res.status(200).json({ message: 'User limit updated successfully.', user: updatedUser });
    } catch (error) {
        console.error("Update user limit error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PATCH: Bulk update AI prescription limit for all users
router.patch('/bulk-limit', async (req: any, res: any) => {
    try {
        const { limit } = req.body;

        if (typeof limit !== 'number' || limit < 0) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        const result = await prisma.user.updateMany({
            data: { aiPrescriptionLimit: limit }
        });

        res.status(200).json({ message: `Successfully updated AI limit for ${result.count} users.` });
    } catch (error) {
        console.error("Bulk update limit error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update user status (Active / Suspended)
router.put('/users/:id/status', async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        // Prevent self-suspension
        if (req.user.id === id) {
            return res.status(400).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { status }
        });

        res.status(200).json({ message: `User status updated to ${status}.`, user: updatedUser });
    } catch (error) {
        console.error("Update user status error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update user role (Enable / Revoke Admin)
router.put('/users/:id/role', requireSuperAdmin, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['USER', 'OWNER', 'ADMIN', 'MODERATOR'].includes(role)) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        // Prevent self-demotion or role altering
        if (req.user.id === id) {
            return res.status(400).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { role }
        });

        res.status(200).json({ message: `User role updated to ${role}.`, user: updatedUser });
    } catch (error) {
        console.error("Update user role error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// DELETE: Delete a user by ID
router.delete('/users/:id', async (req: any, res: any) => {
    try {
        const { id } = req.params;
        // Don't allow an admin to delete themselves directly through this endpoint
        if (req.user.id === id) {
            return res.status(400).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }
        // Additional logic: A MODERATOR cannot delete an ADMIN
        if (req.user.role !== 'ADMIN') {
            const userToDelete = await prisma.user.findUnique({ where: { id } });
            if (userToDelete && userToDelete.role === 'ADMIN') {
                return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
            }
        }

        await prisma.user.delete({ where: { id } });
        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch all shops
router.get('/shops', async (req: any, res: any) => {
    try {
        const stores = await prisma.store.findMany({
            include: {
                owner: { select: { email: true, nickname: true } },
                media: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Decrypt PII before sending to Admin
        const decryptedShops = stores.map(store => ({
            ...store,
            address: store.address ? decryptPII(store.address) : '',
            phone: store.phone ? decryptPII(store.phone) : ''
        }));

        res.status(200).json(decryptedShops);
    } catch (error) {
        console.error("Fetch shops error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update shop status (Approve / Reject)
router.put('/shops/:id/status', async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        const dataPayload: any = { status };
        if (status === 'REJECTED' && rejectionReason) {
            dataPayload.rejectionReason = rejectionReason;
        } else if (status === 'APPROVED' || status === 'PENDING') {
            dataPayload.rejectionReason = null;
        }

        const updatedShop = await prisma.store.update({
            where: { id },
            data: dataPayload,
            include: { owner: true } // Need owner details for email
        });

        // --- Store Approval Email Logic ---
        if (status === 'APPROVED') {
            try {
                const template = await prisma.emailTemplate.findUnique({
                    where: { type: 'STORE_APPROVAL' }
                });

                if (template && updatedShop.owner?.email) {
                    const ownerName = updatedShop.owner.nickname || '?�원';
                    const storeName = updatedShop.name || '매장';

                    let finalSubject = template.subject
                        .replace(/\{\{storeName\}\}/g, storeName)
                        .replace(/\{\{ownerName\}\}/g, ownerName);

                    let finalBody = template.body
                        .replace(/\{\{storeName\}\}/g, `<strong>${storeName}</strong>`)
                        .replace(/\{\{ownerName\}\}/g, `<strong>${ownerName}</strong>`);

                    // Send the email
                    await sendAdminAnnouncement(updatedShop.owner.email, finalSubject, finalBody);
                    console.log(`Approval email sent to ${updatedShop.owner.email} for store ${storeName}`);
                }
            } catch (emailErr) {
                console.error("Failed to send store approval email:", emailErr);
                // We don't fail the whole request if just the email fails, but we log it.
            }
        }

        res.status(200).json({ message: `Shop status updated to ${status}.`, shop: updatedShop });
    } catch (error) {
        console.error("Update shop status error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update shop premium plan (BASIC / PREMIUM)
router.put('/shops/:id/plan', async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { storePlan } = req.body;

        if (!['BASIC', 'PREMIUM'].includes(storePlan)) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        const updatedShop = await prisma.store.update({
            where: { id },
            data: { storePlan },
            include: { owner: true }
        });

        res.status(200).json({ message: `Shop plan updated to ${storePlan}.`, shop: updatedShop });
    } catch (error) {
        console.error("Update shop plan error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Override max approval requests limitation for a permanently rejected shop
router.put('/shops/:id/allow-resubmit', async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const shop = await prisma.store.findUnique({ where: { id } });

        if (!shop) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });

        if (shop.status !== 'REJECTED' || shop.approvalRequestsCount < 3) {
            return res.status(400).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }

        const updatedShop = await prisma.store.update({
            where: { id },
            data: { approvalRequestsCount: 1, rejectionReason: null } // Resetting count gives them 3 fresh attempts without modifying behavior
        });

        res.status(200).json({ message: 'Shop approval request count has been reset.', shop: updatedShop });
    } catch (error) {
        console.error("Allow resubmit error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Send simulated email/notification to a shop owner
router.post('/email', async (req: any, res: any) => {
    try {
        const { email, subject, message } = req.body;

        if (!email || !subject || !message) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        // Send real email notification
        const success = await sendAdminAnnouncement(email, subject, message);

        if (!success) {
            return res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
        }

        res.status(200).json({ message: 'Email notification dispatched successfully.' });
    } catch (error) {
        console.error("Send email error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch an email template by type
router.get('/email-templates/:type', requireSuperAdmin, async (req: any, res: any) => {
    try {
        const { type } = req.params;
        const template = await prisma.emailTemplate.findUnique({
            where: { type }
        });

        if (!template) {
            // Return an empty 200 so the frontend can create it later, or a default
            return res.status(200).json(null);
        }

        res.status(200).json(template);
    } catch (error) {
        console.error("Fetch email template error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Upsert an email template by type
router.put('/email-templates/:type', requireSuperAdmin, async (req: any, res: any) => {
    try {
        const { type } = req.params;
        const { subject, body, variables } = req.body;

        if (!subject || !body) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        const template = await prisma.emailTemplate.upsert({
            where: { type },
            update: { subject, body, variables },
            create: { type, subject, body, variables }
        });

        res.status(200).json({ message: 'Email template saved successfully.', template });
    } catch (error) {
        console.error("Upsert email template error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Aggregated Dashboard Metrics
router.get('/metrics', async (req: any, res: any) => {
    try {
        const [
            totalGeneralUsers,
            totalHostUsers,
            totalAnonymousVisitors,
            aiPrescriptionsLoggedIn,
            aiUsersLoggedIn,
            aiUsersAnonymous,
            anonymousUsageSum
        ] = await Promise.all([
            prisma.user.count({ where: { role: 'USER' } }),
            prisma.user.count({ where: { role: 'OWNER' } }),
            prisma.anonymousVisitor.count(),
            prisma.prescription.count(),
            prisma.user.count({ where: { aiUsageCount: { gt: 0 } } }),
            prisma.anonymousVisitor.count({ where: { hasUsedAi: true } }),
            prisma.anonymousVisitor.aggregate({ _sum: { aiUsageCount: true } })
        ]);
        
        const aiPrescriptionsAnonymous = anonymousUsageSum._sum.aiUsageCount || 0;
        const totalPrescriptions = aiPrescriptionsLoggedIn + aiPrescriptionsAnonymous;

        res.json({
            totalGeneralUsers,
            totalHostUsers,
            totalUsers: totalGeneralUsers + totalHostUsers + 1, // +1 for the single Admin explicitly excluded or included by role count
            totalAnonymousVisitors,
            totalPrescriptions,
            aiPrescriptionsLoggedIn,
            aiPrescriptionsAnonymous,
            aiUsersLoggedIn,
            aiUsersAnonymous,
            totalAiUsers: aiUsersLoggedIn + aiUsersAnonymous
        });
    } catch (error) {
        console.error("Dashboard metrics error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- COMMUNITY ANNOUNCEMENTS (PINNED POSTS) ---

// GET: Fetch all announcements (pinned posts)
router.get('/announcements', async (req: any, res: any) => {
    try {
        const announcements = await prisma.post.findMany({
            where: { isPinned: true },
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { nickname: true, profileImageUrl: true } }
            }
        });
        res.status(200).json(announcements);
    } catch (error) {
        console.error("Fetch announcements error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Create a new announcement (pinned post)
// For simplicity, we assume text-only or pre-uploaded images. 
// A robust implementation would use multer here too if admins upload fresh images.
router.post('/announcements', async (req: any, res: any) => {
    try {
        const { content, contentEn, startDate, endDate, image, imageEn, isSystemPopup, countryCode } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        const announcementData: any = {
            authorId: req.user.id,
            content,
            contentEn: contentEn || null,
            image: image || null,
            imageEn: imageEn || null,
            isPinned: true,
            postType: 'ANNOUNCEMENT',
            countryCode: countryCode || 'GLOBAL',
            isSystemPopup: isSystemPopup ? true : false,
            pinnedStartDate: startDate ? new Date(startDate) : null,
            pinnedEndDate: endDate ? new Date(endDate) : null,
        };

        const announcement = await prisma.post.create({
            data: announcementData
        });

        res.status(201).json({ message: 'Announcement created successfully.', announcement });
    } catch (error) {
        console.error("Create announcement error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update an announcement
router.put('/announcements/:id', async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { content, contentEn, startDate, endDate, isPinned, image, imageEn, isSystemPopup, countryCode } = req.body;

        const updateData: any = { postType: 'ANNOUNCEMENT' };
        if (content !== undefined) updateData.content = content;
        if (contentEn !== undefined) updateData.contentEn = contentEn;
        if (startDate !== undefined) updateData.pinnedStartDate = startDate ? new Date(startDate) : null;
        if (endDate !== undefined) updateData.pinnedEndDate = endDate ? new Date(endDate) : null;
        if (isPinned !== undefined) updateData.isPinned = isPinned;
        if (image !== undefined) updateData.image = image;
        if (imageEn !== undefined) updateData.imageEn = imageEn;
        if (isSystemPopup !== undefined) updateData.isSystemPopup = isSystemPopup;
        if (countryCode !== undefined) updateData.countryCode = countryCode;

        const announcement = await prisma.post.update({
            where: { id },
            data: updateData
        });

        res.status(200).json({ message: 'Announcement updated successfully.', announcement });
    } catch (error) {
        console.error("Update announcement error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// DELETE: Delete an announcement
router.delete('/announcements/:id', async (req: any, res: any) => {
    try {
        const { id } = req.params;

        await prisma.post.delete({
            where: { id }
        });

        res.status(200).json({ message: 'Announcement deleted successfully.' });
    } catch (error) {
        console.error("Delete announcement error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- AD CAMPAIGNS ---

// ==========================================
// FULL-SCALE AD SERVER CRM ENDPOINTS
// ==========================================

// --- Host User Search (For linking Advertisers) ---
router.get('/hosts/search', async (req: any, res: any) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });

        const hosts = await prisma.user.findMany({
            where: {
                OR: [
                    { nickname: { contains: q as string } },
                    { email: { contains: q as string } }
                ]
            },
            take: 10,
            select: { 
                id: true, 
                nickname: true, 
                email: true, 
                profileImageUrl: true,
                stores: { select: { name: true, ownerName: true }, take: 1 }
            }
        });
        
        res.status(200).json(hosts);
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- Advertisers ---
router.get('/advertisers', async (req: any, res: any) => {
    try {
        const advertisers = await prisma.advertiser.findMany({ 
            include: { user: { select: { nickname: true, email: true } } },
            orderBy: { createdAt: 'desc' } 
        });
        res.status(200).json(advertisers);
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.post('/advertisers', async (req: any, res: any) => {
    try {
        const body = { ...req.body };
        const { adInquiryId } = body;
        
        if (!adInquiryId) {
            return res.status(400).json({ error: ERROR_CODES.AD_NOT_APPROVED });
        }

        const inquiry = await prisma.adInquiry.findUnique({ where: { id: adInquiryId } });
        if (!inquiry || inquiry.status !== 'APPROVED') {
            return res.status(400).json({ error: ERROR_CODES.AD_NOT_FOUND });
        }

        delete body.adInquiryId; // Not a field in Advertiser schema
        if (!body.userId) delete body.userId; // Clean empty string
        
        const ad = await prisma.advertiser.create({ data: body });
        res.status(201).json(ad);
    } catch (error: any) {
        console.error("Failed to create advertiser:", error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: ERROR_CODES.ADVERTISER_EXISTS });
        }
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.put('/advertisers/:id', async (req: any, res: any) => {
    try {
        const body = { ...req.body };
        delete body.user; // Cannot update relations directly via object
        if (!body.userId) body.userId = null; // Allow unlinking
        const ad = await prisma.advertiser.update({ where: { id: req.params.id }, data: body });
        res.status(200).json(ad);
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.delete('/advertisers/:id', async (req: any, res: any) => {
    try {
        await prisma.advertiser.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- Contracts ---
router.get('/contracts', async (req: any, res: any) => {
    try {
        const contracts = await prisma.contract.findMany({ 
            include: { advertiser: true },
            orderBy: { createdAt: 'desc' } 
        });
        res.status(200).json(contracts);
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.post('/contracts', async (req: any, res: any) => {
    try {
        const body = { ...req.body };
        delete body.advertiser;
        delete body.contract;
        delete body.campaign;
        delete body.placement;
        delete body.creatives;
        delete body._count;

        if (body.startDate) body.startDate = new Date(body.startDate);
        if (body.endDate) body.endDate = new Date(body.endDate);
        if (body.totalBudget) body.totalBudget = parseFloat(body.totalBudget);
        if (body.priceRate) body.priceRate = parseFloat(body.priceRate);
        if (body.maxImpressions) body.maxImpressions = parseInt(body.maxImpressions);
        if (body.maxClicks) body.maxClicks = parseInt(body.maxClicks);
        
        const contract = await prisma.contract.create({ data: body });
        res.status(201).json(contract);
    } catch (error) {
        console.error("Contract Create Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.put('/contracts/:id', async (req: any, res: any) => {
    try {
        const existing = await prisma.contract.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Contract not found' });
        if (existing.spentBudget > 0) return res.status(403).json({ error: '이미 광고 게재가 시작되어 예산이 소진된 계약 정보는 수정할 수 없습니다.' });

        const body = { ...req.body };
        delete body.advertiser;
        delete body.contract;
        delete body.campaign;
        delete body.placement;
        delete body.creatives;
        delete body._count;
        delete body.id;

        if (body.startDate) body.startDate = new Date(body.startDate);
        if (body.endDate) body.endDate = new Date(body.endDate);
        if (body.totalBudget) body.totalBudget = parseFloat(body.totalBudget);
        if (body.priceRate) body.priceRate = parseFloat(body.priceRate);
        if (body.maxImpressions) body.maxImpressions = parseInt(body.maxImpressions);
        if (body.maxClicks) body.maxClicks = parseInt(body.maxClicks);

        const contract = await prisma.contract.update({ where: { id: req.params.id }, data: body });

        // Sync dates and status to all child campaigns (per user requirement)
        const syncData: any = {};
        if (body.startDate) syncData.startDate = body.startDate;
        if (body.endDate) syncData.endDate = body.endDate;
        if (body.status) syncData.status = body.status;
        
        if (Object.keys(syncData).length > 0) {
            await prisma.campaign.updateMany({
                where: { contractId: req.params.id },
                data: syncData
            });
        }

        res.status(200).json(contract);
    } catch (error) {
        console.error("Contract Update Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.delete('/contracts/:id', async (req: any, res: any) => {
    try {
        await prisma.contract.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- Campaigns ---
router.get('/campaigns', async (req: any, res: any) => {
    try {
        const items = await prisma.campaign.findMany({ 
            include: { advertiser: true, contract: true },
            orderBy: { createdAt: 'desc' } 
        });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.post('/campaigns', async (req: any, res: any) => {
    try {
        const body = { ...req.body };
        delete body.advertiser;
        delete body.contract;
        delete body.campaign;
        delete body.placement;
        delete body.creatives;
        delete body._count;

        if (body.startDate) body.startDate = new Date(body.startDate);
        if (body.endDate) body.endDate = new Date(body.endDate);
        if (body.budget) body.budget = parseFloat(body.budget);
        
        const item = await prisma.campaign.create({ data: body });
        res.status(201).json(item);
    } catch (error) {
        console.error("Campaign Create Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.put('/campaigns/:id', async (req: any, res: any) => {
    try {
        const body = { ...req.body };
        delete body.advertiser;
        delete body.contract;
        delete body.campaign;
        delete body.placement;
        delete body.creatives;
        delete body._count;
        delete body.id;

        if (body.startDate) body.startDate = new Date(body.startDate);
        if (body.endDate) body.endDate = new Date(body.endDate);
        if (body.budget) body.budget = parseFloat(body.budget);

        const item = await prisma.campaign.update({ where: { id: req.params.id }, data: body });
        res.status(200).json(item);
    } catch (error) {
        console.error("Campaign Update Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.delete('/campaigns/:id', async (req: any, res: any) => {
    try {
        await prisma.campaign.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- AdCreatives ---
router.get('/creatives', async (req: any, res: any) => {
    try {
        const items = await prisma.adCreative.findMany({ 
            include: { campaign: { include: { contract: true } }, placement: true },
            orderBy: { createdAt: 'desc' } 
        });

        const logs = await prisma.adLog.groupBy({
            by: ['creativeId', 'actionType'],
            _count: { _all: true }
        });

        const itemsWithStats = items.map(item => {
            const impressions = logs.find(l => l.creativeId === item.id && l.actionType === 'IMPRESSION')?._count._all || 0;
            const clicks = logs.find(l => l.creativeId === item.id && l.actionType === 'CLICK')?._count._all || 0;
            return {
                ...item,
                impressions,
                clicks
            };
        });

        res.status(200).json(itemsWithStats);
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.post('/creatives', async (req: any, res: any) => {
    try {
        const body = { ...req.body };
        delete body.advertiser;
        delete body.contract;
        delete body.campaign;
        delete body.placement;
        delete body.creatives;
        delete body._count;

        // URL Sanitization
        if (body.content) {
            body.content = body.content.replace(/^[??t\s]+/, '').trim().replace('https:// ', 'https://').replace('http:// ', 'http://');
        }
        if (body.linkUrl) {
            body.linkUrl = body.linkUrl.replace(/^[??t\s]+/, '').trim();
            if (body.linkUrl && !/^https?:\/\//i.test(body.linkUrl)) {
                body.linkUrl = 'https://' + body.linkUrl;
            }
            if (body.linkUrl) {
                body.linkUrl = body.linkUrl.replace('https:// ', 'https://').replace('http:// ', 'http://');
            }
        }

        if (body.priority !== undefined) body.priority = parseInt(body.priority);
        if (body.weight !== undefined) body.weight = parseInt(body.weight);
        if (body.cpcPrice !== undefined && body.cpcPrice !== '') body.cpcPrice = parseFloat(body.cpcPrice); else body.cpcPrice = null;
        if (!body.placementId) delete body.placementId; // Optional relative

        if (body.overlayFontSize !== undefined) {
            body.overlayFontSize = body.overlayFontSize === '' ? null : parseInt(body.overlayFontSize);
        }

        const item = await prisma.adCreative.create({ data: body });
        res.status(201).json(item);
    } catch (error) {
        console.error("Creative Create Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.put('/creatives/:id', async (req: any, res: any) => {
    try {
        const body = { ...req.body };
        delete body.advertiser;
        delete body.contract;
        delete body.campaign;
        delete body.placement;
        delete body.creatives;
        delete body._count;
        delete body.id;
        delete body.impressions;
        delete body.clicks;

        // URL Sanitization
        if (body.content) {
            body.content = body.content.replace(/^[??t\s]+/, '').trim();
        }
        if (body.linkUrl) {
            body.linkUrl = body.linkUrl.replace(/^[??t\s]+/, '').trim();
            if (body.linkUrl && !/^https?:\/\//i.test(body.linkUrl)) {
                body.linkUrl = 'https://' + body.linkUrl;
            }
        }

        if (body.priority !== undefined) body.priority = parseInt(body.priority);
        if (body.weight !== undefined) body.weight = parseInt(body.weight);
        if (body.cpcPrice !== undefined && body.cpcPrice !== '') body.cpcPrice = parseFloat(body.cpcPrice); else body.cpcPrice = null;
        if (!body.placementId) body.placementId = null;

        if (body.overlayFontSize !== undefined) {
            body.overlayFontSize = body.overlayFontSize === '' ? null : parseInt(body.overlayFontSize);
        }

        const item = await prisma.adCreative.update({ where: { id: req.params.id }, data: body });
        res.status(200).json(item);
    } catch (error) {
        console.error("Creative Update Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.delete('/creatives/:id', async (req: any, res: any) => {
    try {
        await prisma.adCreative.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- Placements ---
router.get('/placements', async (req: any, res: any) => {
    try {
        const items = await prisma.placement.findMany({ orderBy: { createdAt: 'desc' } });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.post('/placements', async (req: any, res: any) => {
    try {
        const item = await prisma.placement.create({ data: req.body });
        res.status(201).json(item);
    } catch (error: any) {
        if(error?.code === 'P2002') return res.status(400).json({ error: 'ALREADY_EXISTS' });
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.put('/placements/:id', async (req: any, res: any) => {
    try {
        const item = await prisma.placement.update({ where: { id: req.params.id }, data: req.body });
        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.delete('/placements/:id', async (req: any, res: any) => {
    try {
        await prisma.placement.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- AD INQUIRIES ---

router.get('/ad-inquiries', async (req: any, res: any) => {
    try {
        const inquiries = await prisma.adInquiry.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { email: true, nickname: true } } }
        });
        res.status(200).json(inquiries);
    } catch (error) {
        console.error("Failed to fetch ad inquiries:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.put('/ad-inquiries/:id/status', async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { status, adminMemo } = req.body;
        
        const updateData: any = {};
        if (status) updateData.status = status;
        if (adminMemo !== undefined) updateData.adminMemo = adminMemo;

        const inquiry = await prisma.adInquiry.update({
            where: { id },
            data: updateData
        });
        
        res.status(200).json(inquiry);
    } catch (error) {
        console.error("Failed to update inquiry status:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.post('/ad-inquiries/:id/email', async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { subject, message, newStatus } = req.body;
        
        const inquiry = await prisma.adInquiry.findUnique({ where: { id } });
        if (!inquiry) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });

        console.log(`[DEBUG] Attempting to send email from admin UI.`);
        console.log(`[DEBUG] Inquiry ID: ${id}`);
        console.log(`[DEBUG] contactEmail: ${inquiry.contactEmail}`);
        console.log(`[DEBUG] Subject: ${subject}`);
        console.log(`[DEBUG] Message: ${message}`);

        const emailSent = await sendAdminAnnouncement(inquiry.contactEmail, subject, message);
        console.log(`[DEBUG] emailSent Result:`, emailSent);
        
        let updatedInquiry = inquiry;
        if (emailSent === true && newStatus && newStatus !== inquiry.status) {
            updatedInquiry = await prisma.adInquiry.update({
                where: { id },
                data: { status: newStatus }
            });
        }

        res.status(200).json({ success: emailSent === true, error: emailSent !== true ? emailSent : null, inquiry: updatedInquiry });
    } catch (error) {
        console.error("Failed to send inquiry email:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// ==========================================
// DB Backup API
// ==========================================
router.post('/backup', requireSuperAdmin, async (req: any, res: any) => {
    try {
        const { backupType, tableName, savePath, fileName } = req.body;

        if (!backupType || !savePath || !fileName) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
        }

        const urlObj = new URL(dbUrl);
        const host = urlObj.hostname;
        const port = urlObj.port ? parseInt(urlObj.port, 10) : 3306;
        const user = urlObj.username;
        const password = urlObj.password;
        const database = urlObj.pathname.substring(1);

        if (!fs.existsSync(savePath)) {
            fs.mkdirSync(savePath, { recursive: true });
        }

        const fullPath = path.join(savePath, fileName);
        
        let dumpConfig: any = {
            connection: {
                host,
                port,
                user,
                password,
                database
            },
            dumpToFile: fullPath
        };

        if (backupType === 'schema') {
            dumpConfig.dump = { data: false };
        } else if (backupType === 'table') {
            if (!tableName) return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
            dumpConfig.dump = { tables: [tableName] };
        }

        await mysqldump(dumpConfig);

        res.status(200).json({ success: true, message: 'Database backup completed successfully.', path: fullPath });

    } catch (error: any) {
        console.error("Backup processing error:", error);
        res.status(500).json({ error: error.message || 'Internal server error.' });
    }
});

// ==========================================
// BANNED WORDS (AUTO-MODERATION)
// ==========================================

router.get('/banned-words', async (req: any, res: any) => {
    try {
        const words = await (prisma as any).bannedWord.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(words);
    } catch (error) {
        console.error("Fetch banned words error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.post('/banned-words', async (req: any, res: any) => {
    try {
        const { word, category, locale } = req.body;
        if (!word) return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });

        const newWord = await (prisma as any).bannedWord.create({
            data: { word, category: category || 'PROFANITY', locale: locale || 'ko' }
        });
        
        // Refresh memory cache across Node server
        refreshBannedWordsCache();
        
        res.status(201).json(newWord);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "이미 등록된 금칙어입니다." });
        }
        console.error("Create banned word error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.put('/banned-words/:id', async (req: any, res: any) => {
    try {
        const { word, category } = req.body;
        const updateData: any = {};
        if (word) updateData.word = word;
        if (category) updateData.category = category;

        const updatedWord = await (prisma as any).bannedWord.update({
            where: { id: req.params.id },
            data: updateData
        });
        
        refreshBannedWordsCache();
        res.status(200).json(updatedWord);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "이미 존재하는 금칙어입니다." });
        }
        console.error("Update banned word error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.delete('/banned-words/:id', async (req: any, res: any) => {
    try {
        await (prisma as any).bannedWord.delete({ where: { id: req.params.id } });
        
        // Refresh memory cache
        refreshBannedWordsCache();
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Delete banned word error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.post('/banned-words/bulk', async (req: any, res: any) => {
    try {
        const { words } = req.body;
        if (!words || !Array.isArray(words)) return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });

        let insertedCount = 0;
        let skippedCount = 0;

        for (const item of words) {
            try {
                if (!item.word || !item.word.trim()) continue;
                await (prisma as any).bannedWord.create({
                    data: {
                        word: item.word.trim(),
                        category: item.category || 'PROFANITY',
                        locale: item.locale || 'ko'
                    }
                });
                insertedCount++;
            } catch (err: any) {
                // Ignore duplicates
                if (err.code === 'P2002') skippedCount++;
            }
        }

        refreshBannedWordsCache();

        res.status(201).json({ success: true, insertedCount, skippedCount });
    } catch (error) {
        console.error("Bulk create banned words error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- Home Campaigns (SDUI) ---
router.get('/home-campaigns', authenticateAdmin, async (req, res) => {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: {
                key: { in: ['HOME_FLASH_DROP', 'HOME_ROULETTE', 'HOME_NATIVE_AD', 'HOME_WEEKLY_MBTI'] }
            }
        });
        
        const config: any = {
            HOME_FLASH_DROP: { isActive: false, title: '', description: '', imageUrl: '', linkUrl: '', badgeText: 'Flash Drop' },
            HOME_ROULETTE: { isActive: true },
            HOME_NATIVE_AD: { isActive: false, title: '', imageUrl: '', linkUrl: '' },
            HOME_WEEKLY_MBTI: { isActive: true, title: '', subtitle: '', imageUrl: '', badgeText: '' }
        };

        settings.forEach((s: any) => {
            try {
                config[s.key as keyof typeof config] = JSON.parse(s.value);
            } catch (e) {}
        });

        res.json(config);
    } catch (error) {
        console.error('Fetch home campaigns error:', error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.put('/home-campaigns', authenticateAdmin, async (req, res) => {
    try {
        const payload = req.body;
        // Upsert each key
        for (const [key, value] of Object.entries(payload)) {
            if (['HOME_FLASH_DROP', 'HOME_ROULETTE', 'HOME_NATIVE_AD', 'HOME_WEEKLY_MBTI'].includes(key)) {
                await prisma.systemSetting.upsert({
                    where: { key },
                    update: { value: JSON.stringify(value) },
                    create: { key, value: JSON.stringify(value) }
                });
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Update home campaigns error:', error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- Today's Perfect Pairing Management ---

// Get all pairings
router.get('/pairings', async (req, res) => {
    try {
        const pairings = await prisma.todayPairing.findMany({
            include: { translations: true },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });
        res.json(pairings);
    } catch (error) {
        console.error('Fetch pairings error:', error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Create new pairing
router.post('/pairings', async (req, res) => {
    try {
        const { icon, availableRegions, isActive, order, translations } = req.body;
        
        const newPairing = await prisma.todayPairing.create({
            data: {
                icon,
                availableRegions: availableRegions || 'GLOBAL',
                isActive: isActive ?? true,
                order: order ?? 0,
                translations: {
                    create: translations || []
                }
            },
            include: { translations: true }
        });
        res.json(newPairing);
    } catch (error) {
        console.error('Create pairing error:', error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Update pairing
router.put('/pairings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { icon, availableRegions, isActive, order, translations } = req.body;
        
        // Upsert translations
        const translationOps = [];
        if (translations && Array.isArray(translations)) {
            // First, delete any translations that were removed in the UI
            const activeLangCodes = translations.map(t => t.languageCode);
            translationOps.push(
                prisma.todayPairingTranslation.deleteMany({
                    where: {
                        pairingId: id,
                        languageCode: { notIn: activeLangCodes }
                    }
                })
            );

            for (const t of translations) {
                translationOps.push(
                    prisma.todayPairingTranslation.upsert({
                        where: { pairingId_languageCode: { pairingId: id, languageCode: t.languageCode } },
                        update: {
                            name: t.name,
                            coffee: t.coffee,
                            desc: t.desc,
                            season: t.season,
                            tasteProfile: t.tasteProfile
                        },
                        create: {
                            pairingId: id,
                            languageCode: t.languageCode,
                            name: t.name,
                            coffee: t.coffee,
                            desc: t.desc,
                            season: t.season,
                            tasteProfile: t.tasteProfile
                        }
                    })
                );
            }
        }
        
        const updated = await prisma.$transaction([
            prisma.todayPairing.update({
                where: { id },
                data: {
                    ...(icon !== undefined && { icon }),
                    ...(availableRegions !== undefined && { availableRegions }),
                    ...(isActive !== undefined && { isActive }),
                    ...(order !== undefined && { order })
                }
            }),
            ...translationOps
        ]);

        const finalItem = await prisma.todayPairing.findUnique({
            where: { id },
            include: { translations: true }
        });
        
        res.json(finalItem);
    } catch (error: any) {
        console.error('Update pairing error:', error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Delete pairing
router.delete('/pairings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.todayPairing.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete pairing error:', error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Auto-translate pairing fields
router.post('/pairings/translate', authenticateAdmin, async (req, res) => {
    try {
        const { name, coffee, desc, season, tasteProfile } = req.body;
        
        if (!name || !coffee) {
            return res.status(400).json({ error: 'Name and Coffee are required for translation.' });
        }

        const prompt = `You are a professional culinary translator specialized in coffee and dessert pairings.
Translate the following pairing details from Korean to English, Japanese, and Simplified Chinese.

Korean Input:
Dessert Name: ${name}
Matching Coffee: ${coffee}
Description: ${desc || ''}
Season: ${season || ''}
Taste Profile: ${tasteProfile || ''}

Return the response EXACTLY in the following JSON format without any markdown blocks or backticks:
{
  "en": { "name": "", "coffee": "", "desc": "", "season": "", "tasteProfile": "" },
  "ja": { "name": "", "coffee": "", "desc": "", "season": "", "tasteProfile": "" },
  "zh": { "name": "", "coffee": "", "desc": "", "season": "", "tasteProfile": "" }
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.2,
                responseMimeType: 'application/json'
            }
        });

        const text = response.text || '';
        const translations = JSON.parse(text);
        
        res.json(translations);
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch all payment transactions with filters for admin
router.get('/payments', async (req: any, res: any) => {
    try {
        const { search, platform, status } = req.query;

        // Fetch payment transactions
        const queryOptions: any = {
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        nickname: true,
                        pointBalance: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        };

        const rawTransactions = await prisma.paymentTransaction.findMany(queryOptions);

        // Fetch all cancel transactions to dynamically match cancel status
        const cancelTransactions = await prisma.pointTransaction.findMany({
            where: {
                type: 'CHARGE_CANCEL'
            }
        });

        const cancelMap = new Set(
            cancelTransactions
                .map(tx => {
                    const match = tx.description.match(/ID:\s*([a-f0-9\-]+)/i);
                    return match ? match[1] : null;
                })
                .filter(Boolean)
        );

        let enrichedTransactions = rawTransactions.map(tx => {
            const isCancelled = cancelMap.has(tx.id);
            return {
                id: tx.id,
                userId: tx.userId,
                storeTransactionId: tx.storeTransactionId,
                amount: tx.amount,
                platform: tx.platform,
                productId: tx.productId,
                createdAt: tx.createdAt,
                user: tx.user,
                isCancelled
            };
        });

        // Apply filters in memory
        if (platform && platform !== 'ALL') {
            enrichedTransactions = enrichedTransactions.filter(tx => tx.platform === platform);
        }

        if (status && status !== 'ALL') {
            if (status === 'CANCELLED') {
                enrichedTransactions = enrichedTransactions.filter(tx => tx.isCancelled);
            } else if (status === 'COMPLETED') {
                enrichedTransactions = enrichedTransactions.filter(tx => !tx.isCancelled);
            }
        }

        if (search) {
            const query = search.toLowerCase();
            enrichedTransactions = enrichedTransactions.filter(tx => 
                tx.user?.email.toLowerCase().includes(query) || 
                tx.user?.nickname.toLowerCase().includes(query) ||
                tx.storeTransactionId.toLowerCase().includes(query) ||
                tx.id.toLowerCase().includes(query)
            );
        }

        res.status(200).json(enrichedTransactions);
    } catch (error) {
        console.error("Fetch admin payments error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Cancel / Refund a payment transaction and revoke beans
router.post('/payments/:id/cancel', async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { force, reason } = req.body; // force: allow negative balance, reason: cancel description

        const payment = await prisma.paymentTransaction.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!payment) {
            return res.status(404).json({ error: 'PAYMENT_NOT_FOUND' });
        }

        // Check if already cancelled
        const cancelTx = await prisma.pointTransaction.findFirst({
            where: {
                type: 'CHARGE_CANCEL',
                description: {
                    contains: `ID: ${id}`
                }
            }
        });

        if (cancelTx) {
            return res.status(400).json({ error: 'ALREADY_CANCELLED' });
        }

        const cancelAmount = payment.amount;
        const user = payment.user;

        // Check for negative balance protection
        if (!force && user.pointBalance < cancelAmount) {
            return res.status(400).json({ 
                error: 'INSUFFICIENT_BALANCE_FOR_CANCEL',
                message: `회원의 현재 커피콩 잔액(${user.pointBalance}개)이 회수할 수량(${cancelAmount}개)보다 부족합니다. 강제 진행 옵션을 켜주세요.`
            });
        }

        const cancelReason = reason || '관리자 결제 취소 강제 회수';

        const result = await prisma.$transaction(async (tx) => {
            // Deduct pointBalance from User
            const updatedUser = await tx.user.update({
                where: { id: user.id },
                data: {
                    pointBalance: {
                        decrement: cancelAmount
                    }
                },
                select: {
                    pointBalance: true
                }
            });

            // Create PointTransaction logs
            const pointTx = await tx.pointTransaction.create({
                data: {
                    userId: user.id,
                    amount: -cancelAmount,
                    type: 'CHARGE_CANCEL',
                    description: `결제 취소 회수 [사유: ${cancelReason}] (ID: ${id})`
                }
            });

            return { balance: updatedUser.pointBalance, transaction: pointTx };
        });

        res.status(200).json({ success: true, result });
    } catch (error) {
        console.error("Cancel admin payment error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

export default router;
