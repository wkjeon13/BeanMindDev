import express from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { sendPushNotification } from '../utils/firebaseAdmin.js';
import { decryptPII } from '../utils/encryption.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { uploadLimiter } from '../utils/uploadLimiter.js';

const router = express.Router();
import prisma from '../utils/prisma.js';
const JWT_SECRET = process.env.JWT_SECRET as string;


// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'users');
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
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req: any, file: any, cb: any) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif/i;
        const isValid = allowedTypes.test(file.originalname) && allowedTypes.test(file.mimetype);
        if (isValid) cb(null, true);
        else cb(new Error('Invalid file type. Only images are allowed.'));
    }
});

// Middleware to authenticate JWT token
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ errorCode: ERROR_CODES.MISSING_AUTH_HEADER });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ errorCode: ERROR_CODES.INVALID_TOKEN });
        req.user = user;
        next();
    });
};

// GET: Fetch user's saved prescriptions
router.get('/prescriptions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const prescriptions = await prisma.prescription.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(prescriptions);
    } catch (error) {
        console.error("Fetch prescriptions error:", error);
        res.status(500).json({ errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Save a new AI prescription
router.post('/prescriptions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, beanName, brand, aiComment, usePoints } = req.body;

        if (!beanName || !brand || !aiComment) {
            return res.status(400).json({ errorCode: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }
        
        let prescriptionCost = 100;

        const userDb = await prisma.user.findUnique({ where: { id: userId } });
        if (!userDb) return res.status(404).json({ errorCode: ERROR_CODES.USER_NOT_FOUND });
        
        const canUseFree = userDb.aiUsageCount < userDb.aiPrescriptionLimit;

        if (!canUseFree && !usePoints) {
            return res.status(403).json({ 
                errorCode: ERROR_CODES.DAILY_LIMIT_EXCEEDED, 
                current: userDb.aiUsageCount, 
                limit: userDb.aiPrescriptionLimit,
                pointBalance: userDb.pointBalance,
                cost: prescriptionCost
            });
        }

        try {
            const newPrescription = await prisma.$transaction(async (tx) => {
                if (canUseFree) {
                    const updated = await tx.user.updateMany({
                        where: { id: userId, aiUsageCount: { lt: userDb.aiPrescriptionLimit } },
                        data: { aiUsageCount: { increment: 1 } }
                    });
                    if (updated.count === 0) throw new Error("INSUFFICIENT_FREE");
                } else {
                    const updated = await tx.user.updateMany({
                        where: { id: userId, pointBalance: { gte: prescriptionCost } },
                        data: { pointBalance: { decrement: prescriptionCost }, aiUsageCount: { increment: 1 } }
                    });
                    if (updated.count === 0) throw new Error("INSUFFICIENT_BEANS");
                    
                    await tx.pointTransaction.create({ 
                        data: { userId, amount: -prescriptionCost, type: 'USE', description: 'AI 커피 처방전 발급' }
                    });
                }

                return await tx.prescription.create({
                    data: {
                        userId,
                        title,
                        beanName,
                        brand,
                        aiComment
                    }
                });
            });

            res.status(201).json({ message: 'Prescription saved successfully!', prescription: newPrescription });
        } catch (txError: any) {
            if (txError.message === "INSUFFICIENT_FREE") {
                return res.status(403).json({ errorCode: ERROR_CODES.DAILY_LIMIT_EXCEEDED });
            }
            if (txError.message === "INSUFFICIENT_BEANS") {
                return res.status(400).json({ errorCode: ERROR_CODES.INSUFFICIENT_BEANS });
            }
            throw txError;
        }
    } catch (error) {
        console.error("Save prescription error:", error);
        res.status(500).json({ errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update prescription title
router.put('/prescriptions/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { title } = req.body;

        const prescription = await prisma.prescription.findUnique({ where: { id } });
        if (!prescription) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        if (prescription.userId !== userId) return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED });

        const updated = await prisma.prescription.update({
            where: { id },
            data: { title }
        });
        res.status(200).json(updated);
    } catch (error) {
        console.error("Update prescription error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// DELETE: Delete a prescription
router.delete('/prescriptions/:id', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const prescription = await prisma.prescription.findUnique({ where: { id } });
        if (!prescription) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        if (prescription.userId !== userId) return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED });

        await prisma.prescription.delete({ where: { id } });
        res.status(200).json({ message: 'Prescription deleted successfully.' });
    } catch (error) {
        console.error("Delete prescription error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Rate a prescription and adjust taste preferences
router.put('/prescriptions/:id/rating', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { rating, beanAcidity, beanSweetness, beanBody } = req.body;

        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        const prescription = await prisma.prescription.findUnique({ where: { id } });
        if (!prescription) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        if (prescription.userId !== userId) return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED });

        // Update the prescription rating
        const updatedPrescription = await prisma.prescription.update({
            where: { id },
            data: { rating }
        });

        // Feedback Loop: Adjust user taste preferences based on rating
        // If rating is >= 4, shift user's pref towards the bean's profile
        // If rating is <= 2, shift user's pref slightly away from the bean's profile
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user && beanAcidity !== undefined && beanSweetness !== undefined && beanBody !== undefined) {
            let shiftFactor = 0;
            if (rating >= 4) shiftFactor = 0.2; // Move 20% closer to the bean's profile
            else if (rating <= 2) shiftFactor = -0.1; // Move 10% away from the bean's profile
            
            if (shiftFactor !== 0) {
                // Function to compute new value, bound between 1 and 5
                const adjust = (current: number | null, target: number) => {
                    if (current === null) return target;
                    const diff = target - current;
                    let newVal = current + (diff * shiftFactor);
                    return Math.max(1, Math.min(5, Math.round(newVal * 10) / 10)); // Keep one decimal
                };

                const newAcidity = adjust(user.prefAcidity, beanAcidity);
                const newSweetness = adjust(user.prefSweetness, beanSweetness);
                const newBody = adjust(user.prefBody, beanBody);

                const updatedUser = await prisma.user.update({
                    where: { id: userId },
                    data: {
                        prefAcidity: newAcidity,
                        prefSweetness: newSweetness,
                        prefBody: newBody
                    }
                });

                // Strip password
                const { password, ...safeUser } = updatedUser;
                return res.status(200).json({ message: 'Rating saved and preferences updated.', prescription: updatedPrescription, user: safeUser });
            }
        }

        res.status(200).json({ message: 'Rating saved.', prescription: updatedPrescription });
    } catch (error) {
        console.error("Rate prescription error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

const POLICY_FILE = path.join(process.cwd(), 'data', 'policy.json');

const getPointPolicy = () => {
    try {
        if (!fs.existsSync(POLICY_FILE)) {
            return { welcomeFreePrescriptions: 3, prescriptionCost: 100 };
        }
        const data = fs.readFileSync(POLICY_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return { welcomeFreePrescriptions: 3, prescriptionCost: 100 };
    }
};

// GET: Check if user is eligible to use AI (has free tokens or enough points)
router.get('/ai-eligibility', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const userDb = await prisma.user.findUnique({ where: { id: userId } });
        if (!userDb) return res.status(404).json({ error: ERROR_CODES.USER_NOT_FOUND });

        const policy = getPointPolicy();
        const prescriptionCost = policy.prescriptionCost !== undefined ? parseInt(policy.prescriptionCost) : 100;
        
        const canUseFree = userDb.aiUsageCount < userDb.aiPrescriptionLimit;
        const hasEnoughPoints = userDb.pointBalance >= prescriptionCost;

        if (!canUseFree && !hasEnoughPoints) {
             return res.status(403).json({ 
                 error: ERROR_CODES.INSUFFICIENT_BEANS, 
                 current: userDb.aiUsageCount, 
                 limit: userDb.aiPrescriptionLimit,
                 pointBalance: userDb.pointBalance,
                 cost: prescriptionCost
             });
        }
        
        res.status(200).json({ 
            eligible: true,
            cost: prescriptionCost,
            current: userDb.aiUsageCount,
            limit: userDb.aiPrescriptionLimit
        });
    } catch (error) {
        console.error("AI eligibility check error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Track AI usage for logged in user (when they finish curator flow)
router.post('/ai-usage', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const userDb = await prisma.user.findUnique({ where: { id: userId } });
        if (!userDb) return res.status(404).json({ error: ERROR_CODES.USER_NOT_FOUND });

        const policy = getPointPolicy();
        const prescriptionCost = policy.prescriptionCost !== undefined ? parseInt(policy.prescriptionCost) : 100;

        const canUseFree = userDb.aiUsageCount < userDb.aiPrescriptionLimit;

        if (canUseFree) {
            // 무료 횟수가 남은 경우 -> 단순히 aiUsageCount만 증가시킴 (커피콩 소진 없음)
            await prisma.user.update({
                where: { id: userId },
                data: { aiUsageCount: { increment: 1 } }
            });
            return res.status(200).json({ success: true, type: 'free', current: userDb.aiUsageCount + 1, limit: userDb.aiPrescriptionLimit });
        } else {
            // 무료 횟수 소진 완료 -> 커피콩 포인트 차감
            if (userDb.pointBalance < prescriptionCost) {
                return res.status(403).json({ error: ERROR_CODES.INSUFFICIENT_BEANS });
            }

            await prisma.$transaction(async (tx) => {
                const updated = await tx.user.updateMany({
                    where: { id: userId, pointBalance: { gte: prescriptionCost } },
                    data: { 
                        pointBalance: { decrement: prescriptionCost },
                        aiUsageCount: { increment: 1 }
                    }
                });
                if (updated.count === 0) throw new Error("INSUFFICIENT_BEANS");

                await tx.pointTransaction.create({
                    data: {
                        userId,
                        amount: -prescriptionCost,
                        type: 'USE',
                        description: 'AI 커피 맞춤 큐레이션'
                    }
                });
            });

            return res.status(200).json({ success: true, type: 'paid', current: userDb.aiUsageCount + 1, limit: userDb.aiPrescriptionLimit });
        }
    } catch (error: any) {
        console.error("AI usage tracking error:", error);
        if (error.message === "INSUFFICIENT_BEANS") {
            return res.status(400).json({ error: ERROR_CODES.INSUFFICIENT_BEANS });
        }
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch user's bookmarked stores
router.get('/bookmarks', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const bookmarks = await prisma.bookmark.findMany({
            where: { userId },
            include: {
                store: {
                    include: { media: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(bookmarks);
    } catch (error) {
        console.error("Fetch bookmarks error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Toggle (Add/Remove) a bookmark for a store
router.post('/bookmarks/:storeId', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { storeId } = req.params;

        // Verify the store exists
        const store = await prisma.store.findUnique({ where: { id: storeId } });
        if (!store) {
            return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        }

        // Check if bookmark already exists
        const existingBookmark = await prisma.bookmark.findUnique({
            where: {
                userId_storeId: {
                    userId,
                    storeId
                }
            }
        });

        if (existingBookmark) {
            // Un-bookmark (Delete)
            await prisma.bookmark.delete({
                where: { id: existingBookmark.id }
            });
            return res.status(200).json({ message: 'Store removed from bookmarks.', isBookmarked: false });
        } else {
            // Bookmark (Create)
            await prisma.bookmark.create({
                data: {
                    userId,
                    storeId
                }
            });
            return res.status(201).json({ message: 'Store bookmarked successfully!', isBookmarked: true });
        }

    } catch (error) {
        console.error("Toggle bookmark error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch current user profile
router.get('/me', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                follows: { select: { storeId: true } },
                following: { select: { followingId: true } }
            }
        });
        
        if (!user) {
            return res.status(404).json({ error: ERROR_CODES.USER_NOT_FOUND });
        }
        
        // Strip password before sending
        const { password, ...safeUser } = user;
        res.status(200).json(safeUser);
    } catch (error) {
        console.error("Fetch current user error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update User Nickname
router.put('/profile/nickname', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { nickname } = req.body;

        if (!nickname || nickname.trim().length === 0) {
            return res.status(400).json({ error: ERROR_CODES.NICKNAME_REQUIRED });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { nickname: nickname.trim() }
        });

        const { password, ...safeUser } = updatedUser;
        res.status(200).json({ message: 'Nickname updated successfully.', user: safeUser });
    } catch (error) {
        console.error("Update nickname error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update User Password
router.put('/profile/password', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: ERROR_CODES.USER_NOT_FOUND });

        if (!user.password) {
            return res.status(400).json({ error: ERROR_CODES.SOCIAL_LOGIN_CANT_CHANGE_PW });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: ERROR_CODES.PASSWORD_MISMATCH });
        }

        // Password complexity validation
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!regex.test(newPassword)) {
            return res.status(400).json({ error: ERROR_CODES.PASSWORD_INVALID });
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ error: ERROR_CODES.PASSWORD_SAME_AS_OLD });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
    } catch (error) {
        console.error("Update password error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update User Preferred Language
router.put('/profile/language', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { preferredLanguage } = req.body;

        if (!preferredLanguage) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { preferredLanguage }
        });

        const { password, ...safeUser } = updatedUser;
        res.status(200).json({ message: 'Language updated successfully.', user: safeUser });
    } catch (error) {
        console.error("Update language error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// DELETE: Delete current user account
router.delete('/me', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;

        // Soft delete & anonymize user details for legal logging requirements (5 years preservation under e-commerce law)
        await prisma.user.update({
            where: { id: userId },
            data: {
                status: 'DELETED',
                email: `deleted_${userId}@beanmind.com`,
                nickname: '탈퇴한 회원',
                password: null,
                phone: null,
                socialId: null,
                profileImageUrl: null,
                failedLoginAttempts: 0,
                lockedUntil: null,
                bio: null,
                fcmToken: null,
                prefAcidity: null,
                prefSweetness: null,
                prefBody: null,
                prefBitterness: null,
                interests: null
            }
        });

        res.status(200).json({ message: 'Account successfully deleted (anonymized).' });
    } catch (error) {
        console.error("Account deletion error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update user profile image
router.put('/profile-image', authenticateToken, uploadLimiter, async (req: any, res: any) => {
    try {
        console.log("=== Profile Image Upload Triggered ===");
        const userId = req.user.id;
        let finalProfileImageUrl = req.body.profileImageUrl;

        console.log("User ID:", userId);
        console.log("Payload exists:", !!finalProfileImageUrl);
        if (finalProfileImageUrl) console.log("Payload length:", finalProfileImageUrl.length);

        if (!userId) {
            console.error("Missing userId in request");
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        // Add size protection for Base64 payload (Reject if > ~3MB string length)
        // Since we implemented client-side compression (max 512px WebP/JPEG),
        // any payload larger than this is likely bypassing the client or an attack.
        const MAX_BASE64_LENGTH = 3 * 1024 * 1024; // 3MB
        if (finalProfileImageUrl && finalProfileImageUrl.length > MAX_BASE64_LENGTH) {
            console.error(`Profile image payload too large: ${finalProfileImageUrl.length} bytes for user ${userId}`);
            return res.status(413).json({ error: 'Payload Too Large. Please upload a smaller image.' });
        }

        // --- BASE64 DECODING & DISK STORAGE ---
        if (finalProfileImageUrl && finalProfileImageUrl.startsWith('data:image')) {
            try {
                const base64MimeType = finalProfileImageUrl.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';
                const extension = base64MimeType.split('/')[1] || 'jpg';
                const base64Data = finalProfileImageUrl.split(';base64,').pop();

                if (base64Data) {
                    const fileName = `profile_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
                    const relativeDir = path.join('users', userId, 'profile');
                    const profileUploadPath = path.join(process.cwd(), 'uploads', relativeDir);
                    
                    if (!fs.existsSync(profileUploadPath)) {
                        fs.mkdirSync(profileUploadPath, { recursive: true });
                    }

                    fs.writeFileSync(path.join(profileUploadPath, fileName), base64Data, { encoding: 'base64' });
                    finalProfileImageUrl = `/uploads/${relativeDir.split(path.sep).join('/')}/${fileName}`;
                    console.log("Profile image successfully saved to disk:", finalProfileImageUrl);
                }
            } catch (err) {
                console.error("Failed to decode and save Base64 profile image:", err);
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { profileImageUrl: finalProfileImageUrl }
        });

        console.log("User updated in DB");

        // We update all their stores' mainImageUrl and markerImageUrl to match the profile image.
        // It's safe to run unconditionally; if they don't own stores, 0 records are affected.
        const storeRes = await prisma.store.updateMany({
            where: { ownerId: userId },
            data: {
                mainImageUrl: finalProfileImageUrl,
                markerImageUrl: finalProfileImageUrl
            }
        });
        console.log("Stores updated linked to owner:", storeRes.count);

        console.log("Upload Success.");
        res.status(200).json({
            message: 'Profile image updated successfully.',
            profileImageUrl: updatedUser.profileImageUrl,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                nickname: updatedUser.nickname,
                role: updatedUser.role,
                profileImageUrl: updatedUser.profileImageUrl
            }
        });
    } catch (error) {
        console.error("Update profile image error EXCEPTION:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// ----------------------------
// APP STORE COMPLIANCE: REPORT AND BLOCK
// ----------------------------

// POST: Report a user, store, or review (UGC)
router.post('/report', authenticateToken, async (req: any, res: any) => {
    try {
        const reporterId = req.user.id;
        const { targetId, targetType, reason } = req.body;

        if (!targetId || !targetType || !reason) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        const report = await prisma.report.create({
            data: {
                reporterId,
                targetId,
                targetType,
                reason
            }
        });

        res.status(201).json({ message: 'Report submitted successfully.', report });
    } catch (error) {
        console.error("Create report error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Block another user
router.post('/block', authenticateToken, async (req: any, res: any) => {
    try {
        const blockerId = req.user.id;
        const { targetUserId } = req.body;

        if (!targetUserId) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        if (blockerId === targetUserId) {
            return res.status(400).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }

        // Check if block already exists
        const existingBlock = await prisma.block.findUnique({
            where: {
                blockerId_blockedId: { blockerId, blockedId: targetUserId }
            }
        });

        if (existingBlock) {
             return res.status(200).json({ message: 'User is already blocked.', isBlocked: true });
        }

        await prisma.block.create({
            data: {
                blockerId,
                blockedId: targetUserId
            }
        });

        res.status(201).json({ message: 'User blocked successfully.', isBlocked: true });
    } catch (error) {
        console.error("Block user error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// -----------------------------------------------------------------------------
// PUSH NOTIFICATIONS
// -----------------------------------------------------------------------------

// PUT: Update FCM Token
router.put('/me/fcm-token', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { fcmToken } = req.body;

        if (!fcmToken) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { fcmToken }
        });

        res.status(200).json({ message: 'FCM Token updated successfully.' });
    } catch (error) {
        console.error("Update FCM Token error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Test Push Notification (Admin/Dev)
router.post('/test-push', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { targetUserId, title, body, data } = req.body;

        // In a real scenario, restrict this to ADMIN only
        const targetId = targetUserId || userId;

        const targetUser = await prisma.user.findUnique({
            where: { id: targetId },
            select: { fcmToken: true, nickname: true }
        });

        if (!targetUser || !targetUser.fcmToken) {
            return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        }

        const success = await sendPushNotification(
            targetUser.fcmToken,
            title || '테스트 푸시 알림',
            body || `${targetUser.nickname}님, 푸시 알림 테스트입니다!`,
            data
        );

        if (success) {
            res.status(200).json({ message: 'Push notification sent successfully.' });
        } else {
            res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
        }
    } catch (error) {
        console.error("Test push error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update User Taste Preferences
router.put('/me/taste', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { prefAcidity, prefSweetness, prefBody, prefBitterness, prefAroma } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { 
                prefAcidity: prefAcidity !== undefined ? Number(prefAcidity) : undefined, 
                prefSweetness: prefSweetness !== undefined ? Number(prefSweetness) : undefined, 
                prefBody: prefBody !== undefined ? Number(prefBody) : undefined,
                prefBitterness: prefBitterness !== undefined ? Number(prefBitterness) : undefined,
                prefAroma: prefAroma !== undefined ? prefAroma : undefined
            }
        });

        // Strip password before returning
        const { password, ...safeUser } = updatedUser;
        res.status(200).json({ message: 'Taste preferences updated successfully.', user: safeUser });
    } catch (error) {
        console.error("Update taste preferences error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update User Home Screen Layout
router.put('/me/home-layout', authenticateToken, async (req: any, res: any) => {
    try {
        console.log("PUT /me/home-layout CALLED by user:", req.user?.id);
        const userId = req.user.id;
        const { layout } = req.body;

        if (!Array.isArray(layout)) {
            console.log("ERROR: layout is not an array:", layout);
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        console.log("Updating layout for user:", userId, "Layout length:", layout.length);
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { homeLayout: layout }
        });
        console.log("Layout successfully updated for user:", userId);

        // Strip password
        const { password, ...safeUser } = updatedUser;
        res.status(200).json({ message: 'Home layout updated successfully.', user: safeUser });
    } catch (error) {
        console.error("Update home layout error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch user's custom reward tiers
router.get('/reward-tiers', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                rewardTier1Name: true,
                rewardTier1Amount: true,
                rewardTier2Name: true,
                rewardTier2Amount: true,
                rewardTier3Name: true,
                rewardTier3Amount: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: ERROR_CODES.USER_NOT_FOUND });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("Fetch reward tiers error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update user's custom reward tiers
router.put('/reward-tiers', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const {
            rewardTier1Name, rewardTier1Amount,
            rewardTier2Name, rewardTier2Amount,
            rewardTier3Name, rewardTier3Amount
        } = req.body;

        // Basic validation
        if (
            !rewardTier1Name || typeof rewardTier1Amount !== 'number' || rewardTier1Amount <= 0 ||
            !rewardTier2Name || typeof rewardTier2Amount !== 'number' || rewardTier2Amount <= 0 ||
            !rewardTier3Name || typeof rewardTier3Amount !== 'number' || rewardTier3Amount <= 0
        ) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                rewardTier1Name, rewardTier1Amount,
                rewardTier2Name, rewardTier2Amount,
                rewardTier3Name, rewardTier3Amount
            },
            select: {
                rewardTier1Name: true,
                rewardTier1Amount: true,
                rewardTier2Name: true,
                rewardTier2Amount: true,
                rewardTier3Name: true,
                rewardTier3Amount: true
            }
        });

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Update reward tiers error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// -----------------------------------------------------------------------------
// ADVERTISER (HOST) DASHBOARD
// -----------------------------------------------------------------------------

// GET: Fetch Host's personal Ad campaigns and aggregate statistics
router.get('/my-ads', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        
        // Fetch any ad inquiries for this user (they might have applied but haven't been approved yet)
        const inquiries = await prisma.adInquiry.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                advertiser: true,
                status: true,
                adminMemo: true,
                createdAt: true,
                content: true
            }
        });

        const advertiser = await prisma.advertiser.findUnique({
            where: { userId }
        });

        if (!advertiser) {
            return res.status(200).json({ hasAds: false, inquiries, userId });
        }

        const campaigns = await prisma.campaign.findMany({
            where: { advertiserId: advertiser.id },
            include: {
                contract: true,
                creatives: {
                    select: { id: true, name: true, type: true, status: true, placement: true, cpcPrice: true, flavorTags: true, originTags: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const campaignsWithStats = await Promise.all(campaigns.map(async (camp) => {
            const campLogs = await prisma.adLog.groupBy({
                by: ['actionType'],
                where: { creative: { campaignId: camp.id } },
                _count: { _all: true }
            });
            return {
                ...camp,
                stats: {
                    impressions: campLogs.find(l => l.actionType === 'IMPRESSION')?._count._all || 0,
                    clicks: campLogs.find(l => l.actionType === 'CLICK')?._count._all || 0
                }
            };
        }));

        // Fast aggregate of all logs belonging to this advertiser's creatives
        const logs = await prisma.adLog.groupBy({
            by: ['actionType'],
            where: { creative: { campaign: { advertiserId: advertiser.id } } },
            _count: { _all: true }
        });

        const stats = {
            totalImpressions: logs.find(l => l.actionType === 'IMPRESSION')?._count._all || 0,
            totalClicks:     logs.find(l => l.actionType === 'CLICK')?._count._all || 0,
            totalConversions:  logs.find(l => l.actionType === 'CONVERSION')?._count._all || 0,
            ctr: 0
        };
        
        if (stats.totalImpressions > 0) {
            stats.ctr = Number(((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2));
        }

        res.status(200).json({ hasAds: true, advertiser, campaigns: campaignsWithStats, stats, inquiries, userId });
    } catch (error) {
        console.error("Fetch my ads error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// -----------------------------------------------------------------------------
// PILGRIMAGE PASSPORT (CHECK-INS)
// -----------------------------------------------------------------------------

// GET: Fetch user's checkins (Pilgrimage Passport)
router.get('/checkins', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const checkins = await prisma.storeCheckIn.findMany({
            where: { userId },
            include: {
                store: {
                    select: { id: true, name: true, mainImageUrl: true, markerImageUrl: true, address: true, shortDesc: true, lat: true, lng: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        const decryptedCheckins = checkins.map(c => {
            let safeAddress = c.store.address;
            try {
                if (safeAddress) safeAddress = decryptPII(safeAddress);
            } catch (e) {}
            return {
                ...c,
                store: {
                    ...c.store,
                    address: safeAddress
                }
            };
        });
        
        res.status(200).json(decryptedCheckins);
    } catch (error) {
        console.error("Fetch checkins error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update memo for a Pilgrimage Check-in
router.put('/checkins/:storeId/memo', authenticateToken, uploadLimiter, upload.array('images', 5), async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { storeId } = req.params;
        const { memo, keptImages } = req.body;
        
        let newImageUrls: string[] = [];
        if (req.files && Array.isArray(req.files)) {
            newImageUrls = req.files.map(f => '/uploads/users/' + f.filename);
        }

        // Parse kept existing URLs
        let existingImages: string[] = [];
        if (keptImages) {
            try {
                existingImages = JSON.parse(keptImages);
            } catch(e) {}
        }

        const finalImages = [...existingImages, ...newImageUrls];

        // Check if there is an existing checkin
        const checkin = await prisma.storeCheckIn.findUnique({
            where: { userId_storeId: { userId, storeId } }
        });

        if (!checkin) {
            return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        }

        // Store JSON string of the array if not empty, otherwise null
        const updatedImageUrl = finalImages.length > 0 ? JSON.stringify(finalImages) : null;

        const updatedCheckin = await prisma.storeCheckIn.update({
            where: { id: checkin.id },
            data: { 
                memo: memo !== undefined ? memo : checkin.memo,
                memoImageUrl: updatedImageUrl
            }
        });

        res.status(200).json(updatedCheckin);
    } catch (error) {
        console.error("Update checkin memo error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Verify and record a Pilgrimage Check-in
router.post('/checkin', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { storeId, lat: userLat, lng: userLng } = req.body;
        
        if (!storeId) return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });

        const store = await prisma.store.findUnique({ where: { id: storeId } });
        if (!store) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        
        // Ensure store has GPS coords
        if (!store.lat || !store.lng) {
            return res.status(400).json({ error: ERROR_CODES.STORE_NOT_MAPPED });
        }

        if (userLat === undefined || userLng === undefined) {
             return res.status(400).json({ error: ERROR_CODES.GPS_MISSING });
        }

        // Distance validation (Haversine formula)
        const R = 6371e3; // Earth radius in meters
        const rad = Math.PI / 180;
        const dLat = (store.lat - userLat) * rad;
        const dLon = (store.lng - userLng) * rad;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(userLat * rad) * Math.cos(store.lat * rad) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distanceMeters = R * c;

        // Allow up to 100 meters (but use 500m on backend to absorb mobile GPS inaccuracy and allow fake GPS emulator testing)
        if (distanceMeters > 500) {
            return res.status(403).json({ error: ERROR_CODES.STORE_TOO_FAR });
        }

        // Check if already checked in
        const existing = await prisma.storeCheckIn.findUnique({
             where: { userId_storeId: { userId, storeId } }
        });
        
        if (existing) {
             return res.status(400).json({ error: ERROR_CODES.ALREADY_CHECKED_IN });
        }

        const newCheckin = await prisma.storeCheckIn.create({
             data: {
                 userId,
                 storeId,
                 lat: userLat,
                 lng: userLng
             }
        });

        // Gamification Phase 2: Hidden Quests
        const userCheckins = await prisma.storeCheckIn.findMany({ 
            where: { userId },
            include: { store: true }
        });
        const currentUser = await prisma.user.findUnique({ where: { id: userId } });
        const existingBadges = (currentUser as any)?.earnedBadges ? JSON.parse((currentUser as any).earnedBadges) : [];
        const newlyEarnedBadges: string[] = [];

        // Quest 1: "산미 지수 >= 4" 5곳 (Acidity Master)
        const acidityCount = userCheckins.filter((c: any) => c.store.acidity >= 4).length;
        if (acidityCount >= 5 && !existingBadges.includes("산미 탐험가")) newlyEarnedBadges.push("산미 탐험가");

        // Quest 2: "제주" 포함 3곳 (Jeju Explorer)
        const jejuCount = userCheckins.filter((c: any) => (c.store.address || '').includes("제주")).length;
        if (jejuCount >= 3 && !existingBadges.includes("제주 성지 정복자")) newlyEarnedBadges.push("제주 성지 정복자");
        
        // Quest 3: "디카페인" 3곳 (Decaf Hero)
        const decafCount = userCheckins.filter((c: any) => c.store.hasDecaf).length;
        if (decafCount >= 3 && !existingBadges.includes("디카페인 마스터")) newlyEarnedBadges.push("디카페인 마스터");

        let savedEquippedBadge = (currentUser as any)?.equippedBadge;
        if (newlyEarnedBadges.length > 0) {
            const updatedBadges = [...existingBadges, ...newlyEarnedBadges];
            const updatePayload: any = { earnedBadges: JSON.stringify(updatedBadges) };
            if (!savedEquippedBadge) {
                updatePayload.equippedBadge = newlyEarnedBadges[0];
                savedEquippedBadge = newlyEarnedBadges[0];
            }
            await prisma.user.update({
                where: { id: userId },
                data: updatePayload
            });
        }

        // Standard milestone points computation (kept for point balancing)
        let rewardPoints = 0;
        if (userCheckins.length === 1) rewardPoints = 50;
        else if (userCheckins.length === 5) rewardPoints = 100;
        else if (userCheckins.length === 20) rewardPoints = 300;
        else if (userCheckins.length === 30) rewardPoints = 1000;

        if (rewardPoints > 0) {
            await prisma.$transaction(async (tx: any) => {
                await tx.user.update({
                    where: { id: userId },
                    data: { pointBalance: { increment: rewardPoints } }
                });
                await tx.pointTransaction.create({
                    data: {
                        userId,
                        amount: rewardPoints,
                        type: 'EARN',
                        description: `[성지순례 업적] ${userCheckins.length}회 누적 달성 보상`
                    }
                });
            });
        }
        
        res.status(201).json({ 
            message: '성지순례 인증 성공!', 
            checkin: newCheckin, 
            newBadges: newlyEarnedBadges,
            reward: rewardPoints > 0 ? { points: rewardPoints } : undefined 
        });
    } catch (error) {
        console.error("Checkin error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Equip a badge title
router.put('/me/badge', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const badgeName = req.body.badgeName || req.body.badge;
        
        const currentUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!currentUser) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        
        const existingBadges = (currentUser as any).earnedBadges ? JSON.parse((currentUser as any).earnedBadges) : [];
        if (badgeName && !existingBadges.includes(badgeName)) {
            return res.status(403).json({ error: ERROR_CODES.BADGE_NOT_OWNED });
        }
        
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { equippedBadge: badgeName || null } as any
        });
        
        res.status(200).json({ message: 'Badge equipped successfully', user: updatedUser });
    } catch (error) {
        console.error("Badge equip error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// --- CUSTOM COLLECTIONS ---

// GET: Fetch user's collections
router.get('/collections', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const collections = await (prisma as any).collection.findMany({
            where: { userId },
            include: {
                _count: { select: { items: true } },
                items: {
                    include: {
                        post: {
                            select: { id: true, image: true, cafeName: true, content: true } // Minimum data for thumbnail
                        },
                        store: {
                            select: { id: true, mainImageUrl: true, name: true, shortDesc: true } // Info for store thumbnail
                        }
                    },
                    take: 4 // Get first 4 items for collection preview
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        
        // N+1 Fetch correct places/posts count since take: 4 truncates the payload
        const enrichedCollections = await Promise.all(collections.map(async (c: any) => {
            const placesCount = await (prisma as any).collectionItem.count({
                where: { collectionId: c.id, storeId: { not: null } }
            });
            const postsCount = await (prisma as any).collectionItem.count({
                where: { collectionId: c.id, postId: { not: null } }
            });
            return { ...c, placesCount, postsCount };
        }));

        res.status(200).json(enrichedCollections);
    } catch (error) {
        console.error("Fetch collections error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch single collection and its posts
router.get('/collections/:collectionId', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { collectionId } = req.params;

        const collection = await (prisma as any).collection.findUnique({
            where: { id: collectionId },
            include: {
                items: {
                    include: {
                        post: {
                            include: {
                                author: {
                                    select: { nickname: true, profileImageUrl: true, role: true }
                                },
                                _count: { select: { likes: true, comments: true, bookmarks: true } }
                            }
                        },
                        store: true // Complete store details when viewing the collection full feed
                    },
                    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }]
                }
            }
        });

        if (!collection) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        if (collection.userId !== userId && !collection.isPublic) {
            return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED });
        }

        // Decrypt Store PII
        if (collection.items) {
            collection.items = collection.items.map((item: any) => {
                if (item.store) {
                    if (item.store.address && typeof item.store.address === 'string' && item.store.address.includes(':')) {
                        try { item.store.address = decryptPII(item.store.address); } catch(e) { console.error("Decryption failed for store address"); }
                    }
                    if (item.store.phone && typeof item.store.phone === 'string' && item.store.phone.includes(':')) {
                        try { item.store.phone = decryptPII(item.store.phone); } catch(e) { console.error("Decryption failed for store phone"); }
                    }
                }
                return item;
            });
        }

        res.status(200).json(collection);
    } catch (error) {
        console.error("Fetch collection details error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Create a new collection
router.post('/collections', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { name, description, isPublic, isPilgrimageCourse } = req.body;

        if (!name) return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });

        const collection = await (prisma as any).collection.create({
            data: {
                userId,
                name,
                description: description || null,
                isPublic: isPublic !== undefined ? isPublic : true,
                isPilgrimageCourse: isPilgrimageCourse !== undefined ? isPilgrimageCourse : false
            }
        });

        res.status(201).json(collection);
    } catch (error) {
        console.error("Create collection error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Reorder collection items
router.put('/collections/:collectionId/reorder', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { collectionId } = req.params;
        const { items } = req.body; // Expects an array: [{ id: 'item-uuid', orderIndex: 0 }, ...]

        const collection = await (prisma as any).collection.findUnique({ where: { id: collectionId } });
        if (!collection) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        if (collection.userId !== userId) return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED });

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        // Perform bulk update in a transaction
        await (prisma as any).$transaction(
            items.map((item: any) =>
                (prisma as any).collectionItem.update({
                    where: { id: item.id },
                    data: { orderIndex: item.orderIndex }
                })
            )
        );

        res.status(200).json({ message: 'Reordered successfully.' });
    } catch (error) {
        console.error("Reorder Error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update collection properties
router.put('/collections/:collectionId', authenticateToken, upload.single('coverImage'), async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { collectionId } = req.params;
        const { name, description, isPublic, isPilgrimageCourse } = req.body;

        const collection = await (prisma as any).collection.findUnique({ where: { id: collectionId } });
        if (!collection) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        if (collection.userId !== userId) return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED });

        let coverImageUrl = undefined;
        if (req.file) {
            coverImageUrl = `/uploads/users/${req.file.filename}`;
        }

        const updatedCollection = await (prisma as any).collection.update({
            where: { id: collectionId },
            data: {
                name: name !== undefined ? name : collection.name,
                description: description !== undefined ? description : collection.description,
                isPublic: isPublic !== undefined ? (isPublic === 'true' || isPublic === true) : collection.isPublic,
                isPilgrimageCourse: isPilgrimageCourse !== undefined ? (isPilgrimageCourse === 'true' || isPilgrimageCourse === true) : collection.isPilgrimageCourse,
                ...(coverImageUrl && { coverImageUrl })
            }
        });
        res.status(200).json(updatedCollection);
    } catch (error) {
        console.error("Update collection error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// DELETE: Delete entire collection
router.delete('/collections/:collectionId', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { collectionId } = req.params;

        const collection = await (prisma as any).collection.findUnique({ where: { id: collectionId } });
        if (!collection) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        if (collection.userId !== userId) return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED });

        // Prisma won't cascade automatically without schema specification, safe generic manual cascade:
        await (prisma as any).collectionItem.deleteMany({ where: { collectionId } });
        await (prisma as any).collection.delete({ where: { id: collectionId } });

        res.status(200).json({ message: 'Collection deleted successfully.' });
    } catch (error) {
        console.error("Delete collection error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Add post or store to collection
router.post('/collections/:collectionId/items', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { collectionId } = req.params;
        const { postId, storeId } = req.body;

        if (!postId && !storeId) return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });

        const collection = await (prisma as any).collection.findUnique({ where: { id: collectionId } });
        if (!collection) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        if (collection.userId !== userId) return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED });

        // Check if item already exists
        let whereCondition: any = { collectionId };
        if (postId) whereCondition.postId = postId;
        if (storeId) whereCondition.storeId = storeId;

        const existingItem = await (prisma as any).collectionItem.findFirst({
            where: whereCondition
        });

        if (existingItem) {
             return res.status(400).json({ error: ERROR_CODES.ALREADY_IN_COLLECTION });
        }

        const dataPayload: any = { collectionId };
        if (postId) dataPayload.postId = postId;
        if (storeId) dataPayload.storeId = storeId;

        const item = await (prisma as any).collectionItem.create({
            data: dataPayload
        });

        res.status(201).json(item);
    } catch (error) {
        console.error("Add collection item error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// DELETE: Remove item from collection
router.delete('/collections/:collectionId/items/:itemId', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { collectionId, itemId } = req.params;

        const collection = await (prisma as any).collection.findUnique({ where: { id: collectionId } });
        if (!collection) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        if (collection.userId !== userId) return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED });

        await (prisma as any).collectionItem.deleteMany({
            where: { 
                collectionId,
                OR: [
                    { postId: itemId },
                    { storeId: itemId },
                    { id: itemId } // In case the frontend passes the explicit item primary key ID
                ]
            }
        });

        res.status(200).json({ message: 'Item removed from collection.' });
    } catch (error) {
        console.error("Remove collection item error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Fork (Clone) a Pilgrimage Course
router.post('/collections/:collectionId/fork', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { collectionId } = req.params;

        const sourceCollection = await (prisma as any).collection.findUnique({ 
            where: { id: collectionId },
            include: { items: true }
        });

        if (!sourceCollection) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });
        if (!sourceCollection.isPublic && sourceCollection.userId !== userId) {
            return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }

        // Create the clone
        const newCollection = await (prisma as any).collection.create({
            data: {
                userId,
                name: `${sourceCollection.name} (Copy)`,
                description: sourceCollection.description,
                isPublic: false, // Default to private initially 
                isPilgrimageCourse: sourceCollection.isPilgrimageCourse,
                items: {
                    create: sourceCollection.items.map((item: any) => ({
                        postId: item.postId,
                        storeId: item.storeId
                    }))
                }
            },
            include: {
                items: true
            }
        });

        res.status(201).json({ message: 'Course successfully added to yours!', collection: newCollection });
    } catch (error) {
        console.error("Fork collection error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch user's unified activity history
router.get('/me/activity', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const typeFilter = req.query.type || 'all'; // all, post, comment, review, like
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '20');

        let activities: any[] = [];

        // 1. Fetch Posts
        if (typeFilter === 'all' || typeFilter === 'post') {
            const posts = await prisma.post.findMany({
                take: 100,
                where: { authorId: userId },
                select: { id: true, content: true, image: true, createdAt: true, earnedBeans: true, store: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' }
            });
            activities.push(...posts.map(p => ({
                id: p.id,
                type: 'post',
                createdAt: p.createdAt,
                content: p.content,
                imageUrl: p.image,
                targetId: p.id,
                extra: { earnedBeans: p.earnedBeans, storeName: p.store?.name }
            })));
        }

        // 2. Fetch Comments
        if (typeFilter === 'all' || typeFilter === 'comment') {
            const comments = await prisma.comment.findMany({
                take: 100,
                where: { authorId: userId },
                select: { id: true, content: true, createdAt: true, postId: true, post: { select: { content: true } } },
                orderBy: { createdAt: 'desc' }
            });
            activities.push(...comments.map(c => ({
                id: c.id,
                type: 'comment',
                createdAt: c.createdAt,
                content: c.content,
                targetId: c.postId,
                extra: { parentContent: c.post?.content }
            })));
        }

        // 3. Fetch Reviews
        if (typeFilter === 'all' || typeFilter === 'review') {
            const reviews = await prisma.storeReview.findMany({
                take: 100,
                where: { userId },
                select: { id: true, content: true, imageUrls: true, createdAt: true, overall: true, storeId: true, store: { select: { name: true, lat: true, lng: true } } },
                orderBy: { createdAt: 'desc' }
            });
            activities.push(...reviews.map(r => {
                let img = null;
                if (r.imageUrls) {
                    try {
                        const parsed = JSON.parse(r.imageUrls);
                        if (Array.isArray(parsed) && parsed.length > 0) img = parsed[0];
                    } catch (e) {
                         img = r.imageUrls;
                    }
                }
                return {
                    id: r.id,
                    type: 'review',
                    createdAt: r.createdAt,
                    content: r.content,
                    imageUrl: img,
                    targetId: r.storeId,
                    extra: { rating: r.overall, storeName: r.store?.name }
                };
            }));
        }

        // 4. Fetch Likes
        if (typeFilter === 'all' || typeFilter === 'like') {
            const likes = await prisma.like.findMany({
                take: 100,
                where: { userId },
                select: { id: true, createdAt: true, postId: true, post: { select: { content: true, image: true, author: { select: { nickname: true } } } } },
                orderBy: { createdAt: 'desc' }
            });
            activities.push(...likes.map(l => ({
                id: l.id,
                type: 'like',
                createdAt: l.createdAt,
                content: l.post?.content || '',
                imageUrl: l.post?.image,
                targetId: l.postId,
                extra: { authorName: l.post?.author?.nickname }
            })));
        }

        // 5. Fetch Follows (User started following someone OR a store)
        if (typeFilter === 'all' || typeFilter === 'follow') {
            // Fetch User Follows
            const userFollows = await (prisma as any).userFollow.findMany({
                take: 100,
                where: { followerId: userId },
                select: { id: true, createdAt: true, followingId: true, following: { select: { nickname: true, profileImageUrl: true } } },
                orderBy: { createdAt: 'desc' }
            });
            activities.push(...userFollows.map((f: any) => ({
                id: f.id,
                type: 'follow',
                createdAt: f.createdAt,
                content: `@${f.following?.nickname || '알 수 없는 사용자'}님을 팔로우하기 시작했습니다.`,
                imageUrl: f.following?.profileImageUrl,
                targetId: f.followingId,
                extra: { authorName: f.following?.nickname }
            })));

            // Fetch Store Follows
            const storeFollows = await (prisma as any).storeFollow.findMany({
                take: 100,
                where: { userId },
                select: { id: true, createdAt: true, storeId: true, store: { select: { name: true, mainImageUrl: true } } },
                orderBy: { createdAt: 'desc' }
            });
            activities.push(...storeFollows.map((f: any) => ({
                id: `store-${f.id}`,
                type: 'follow',
                createdAt: f.createdAt,
                content: `'${f.store?.name || '알 수 없는 매장'}' 단골로 등록했습니다.`,
                imageUrl: f.store?.mainImageUrl,
                targetId: f.storeId,
                extra: { storeName: f.store?.name }
            })));
        }

        // Sort globally by createdAt DESC
        activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        // Pagination
        const total = activities.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const paginatedActivities = activities.slice(startIndex, startIndex + limit);

        res.status(200).json({
            activities: paginatedActivities,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        });
    } catch (error) {
        console.error("Fetch activity history error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});
// GET: Check User Follow Status
router.get('/:id/follow-status', authenticateToken, async (req: any, res: any) => {
    try {
        const followerId = req.user.id;
        const followingId = req.params.id;

        if (followerId === followingId) {
            return res.status(200).json({ isFollowing: false });
        }

        const followRecord = await (prisma as any).userFollow.findUnique({
            where: {
                followerId_followingId: { followerId, followingId }
            }
        });

        res.status(200).json({ isFollowing: !!followRecord });
    } catch (error) {
        console.error("Fetch User Follow Status error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Toggle User Follow
router.post('/:id/follow', authenticateToken, async (req: any, res: any) => {
    try {
        const followerId = req.user.id;
        const followingId = req.params.id;

        if (followerId === followingId) {
            return res.status(400).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }

        const targetUser = await prisma.user.findUnique({ where: { id: followingId } });
        if (!targetUser) return res.status(404).json({ error: ERROR_CODES.STORE_NOT_FOUND });

        const existingFollow = await (prisma as any).userFollow.findUnique({
            where: {
                followerId_followingId: { followerId, followingId }
            }
        });

        if (existingFollow) {
             await (prisma as any).userFollow.delete({
                 where: { id: existingFollow.id }
             });
             return res.status(200).json({ message: 'User unfollowed successfully.', isFollowing: false });
        } else {
             await (prisma as any).userFollow.create({
                 data: { followerId, followingId }
             });
             return res.status(201).json({ message: 'User followed successfully.', isFollowing: true });
        }
    } catch (error) {
        console.error("Toggle User Follow error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// GET: Fetch Public Profile of a User (Allows Guests)
router.get('/profile/shared/:id', async (req: any, res: any) => {
    try {
        let authUserId = null;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token && token !== 'null') {
            try {
                const JWT_SECRET = process.env.JWT_SECRET as string;
                const decoded = jwt.verify(token, JWT_SECRET);
                authUserId = (decoded as any).id;
            } catch (e) {} // Fail silently if anonymous/expired token
        }

        const userId = req.params.id;
        const user = await (prisma as any).user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                nickname: true,
                profileImageUrl: true,
                bio: true,
                bioMediaUrls: true,
                isPublicProfile: true,
                earnedBadges: true,
                equippedBadge: true,
                role: true,
                prefAcidity: true,
                prefSweetness: true,
                prefBody: true,
                prefBitterness: true,
                _count: {
                    select: {
                        posts: true,
                        collections: true,
                        followers: true,
                        following: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: ERROR_CODES.USER_NOT_FOUND });
        }

        if (!user.isPublicProfile && authUserId !== user.id) {
            return res.status(403).json({ error: ERROR_CODES.UNAUTHORIZED_ACTION });
        }

        // Fetch user's public collections
        const publicCollections = await (prisma as any).collection.findMany({
            where: { userId, isPublic: true },
            include: {
                _count: { select: { items: true } },
                items: {
                    include: {
                        post: { select: { id: true, image: true, cafeName: true } },
                        store: { select: { id: true, mainImageUrl: true, name: true } }
                    },
                    take: 3
                }
            },
            take: 10,
            orderBy: { updatedAt: 'desc' }
        });

        let store = null;
        if (user.role === 'OWNER') {
            store = await (prisma as any).store.findFirst({ where: { ownerId: user.id } });
        }

        res.status(200).json({ user, collections: publicCollections, store });
    } catch (error) {
        console.error("Fetch public profile error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// PUT: Update Public Profile Settings (Bio, Visibility, Media)
router.put('/profile/shared', authenticateToken, uploadLimiter, upload.array('images', 10), async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        let { bio, isPublicProfile, hasMediaUpdate } = req.body;

        const dataPayload: any = {
            bio: bio !== undefined ? bio : undefined
        };

        if (isPublicProfile !== undefined) {
             dataPayload.isPublicProfile = isPublicProfile === 'true' || isPublicProfile === true;
        }

        // Only process media if frontend specified an update (so we don't accidentally clear it on simple JSON requests)
        if (hasMediaUpdate === 'true' || hasMediaUpdate === true) {
            let mediaUrls: string[] = [];
            
            // 1. Existing Media Kept
            if (req.body.existingImages) {
                let existing = req.body.existingImages;
                if (typeof existing === 'string') {
                    try { existing = JSON.parse(existing); } catch (e) { existing = [existing]; }
                }
                if (Array.isArray(existing)) {
                    mediaUrls = existing;
                }
            }

            // 2. New Files Uploaded (Multipart)
            if (req.files && Array.isArray(req.files)) {
                const uploadedUrls = req.files.map((file: any) => '/uploads/users/' + file.filename);
                mediaUrls = mediaUrls.concat(uploadedUrls);
            }

            // 3. Base64 Uploads (Fallback)
            if (req.body.image) {
                const imagesArray = Array.isArray(req.body.image) ? req.body.image : [req.body.image];
                for (const img of imagesArray) {
                    if (typeof img === 'string' && img.startsWith('data:image')) {
                        const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
                        const ext = img.substring(img.indexOf('/') + 1, img.indexOf(';'));
                        const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + '.' + ext;
                        const filepath = path.join(process.cwd(), 'uploads', 'users', filename);
                        fs.writeFileSync(filepath, base64Data, 'base64');
                        mediaUrls.push('/uploads/users/' + filename);
                    }
                }
            }
            
            dataPayload.bioMediaUrls = JSON.stringify(mediaUrls);
        }

        const updatedUser = await (prisma as any).user.update({
            where: { id: userId },
            data: dataPayload
        });

        // Strip password before returning
        const { password, ...safeUser } = updatedUser;
        res.status(200).json({ message: 'Profile settings updated.', user: safeUser });
    } catch (error) {
        console.error("Update public profile error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

export default router;
