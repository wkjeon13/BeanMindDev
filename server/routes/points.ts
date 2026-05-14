import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { ERROR_CODES } from '../utils/errorCodes';

const router = express.Router();
import prisma from '../utils/prisma.js';
const JWT_SECRET = process.env.JWT_SECRET as string;

const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: ERROR_CODES.MISSING_AUTH_HEADER });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: ERROR_CODES.INVALID_TOKEN });
        req.user = user;
        next();
    });
};

// GET: Fetch user's current point balance and transaction history
router.get('/', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { pointBalance: true }
        });

        if (!user) return res.status(404).json({ error: ERROR_CODES.USER_NOT_FOUND });

        const history = await prisma.pointTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        res.status(200).json({
            balance: user.pointBalance,
            history
        });
    } catch (error) {
        console.error("Fetch points error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Earn points (e.g. from reviewing)
router.post('/earn', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { amount, description } = req.body;

        if (!amount || amount <= 0 || !description) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        // Use Prisma transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id: userId },
                data: { pointBalance: { increment: amount } },
                select: { pointBalance: true }
            });

            const transaction = await tx.pointTransaction.create({
                data: {
                    userId,
                    amount,
                    type: "EARN",
                    description
                }
            });

            return { balance: user.pointBalance, transaction };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Earn points error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Spend points (e.g. for premium curation)
router.post('/spend', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { amount, description } = req.body;

        if (!amount || amount <= 0 || !description) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        const result = await prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.updateMany({
                where: { id: userId, pointBalance: { gte: amount } },
                data: { pointBalance: { decrement: amount } }
            });

            if (updatedUser.count === 0) {
                throw new Error("Insufficient points.");
            }

            const finalUser = await tx.user.findUnique({ where: { id: userId }, select: { pointBalance: true } });

            const transaction = await tx.pointTransaction.create({
                data: {
                    userId,
                    amount: -amount,
                    type: "SPEND",
                    description
                }
            });

            return { balance: finalUser?.pointBalance || 0, transaction };
        });

        res.status(200).json(result);
    } catch (error: any) {
        console.error("Spend points error:", error);
        if (error.message === "Insufficient points.") {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});
// POST: Charge points (For testing)
router.post('/charge', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        let amount = parseInt(req.body.amount, 10);
        
        if (isNaN(amount) || amount <= 0) {
            amount = 1000; // Default fallback if bad payload
        }

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id: userId },
                data: { pointBalance: { increment: amount } },
                select: { pointBalance: true }
            });

            await tx.pointTransaction.create({
                data: {
                    userId,
                    amount,
                    type: "CHARGE",
                    description: `커피콩 ${amount.toLocaleString()}알 충전 완료`
                }
            });

            return { balance: user.pointBalance };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Charge points error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Verify and record IAP charge
router.post('/verify-iap', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        let { amount, transactionId } = req.body;
        
        amount = parseInt(amount, 10);
        if (isNaN(amount) || amount <= 0) amount = 1000;
        if (!transactionId) transactionId = `mock-txn-${Date.now()}`;

        // In a real production scenario, you would:
        // 1. Call RevenueCat API (GET /v1/subscribers/{userId})
        // 2. Verify that transactionId exists and was not already processed
        
        const result = await prisma.$transaction(async (tx) => {
            // Check for duplicate transaction
            const existingTx = await tx.paymentTransaction.findUnique({
                where: { storeTransactionId: transactionId }
            });
            if (existingTx) {
                throw new Error("Duplicate transaction");
            }

            // Log the payment
            await tx.paymentTransaction.create({
                data: {
                    userId,
                    storeTransactionId: transactionId,
                    amount,
                    platform: 'REVENUECAT_CAPACITOR',
                    productId: `com.beanmind.beans.${amount}`
                }
            });

            // Grant beans
            const user = await tx.user.update({
                where: { id: userId },
                data: { pointBalance: { increment: amount } },
                select: { pointBalance: true }
            });

            await tx.pointTransaction.create({
                data: {
                    userId,
                    amount,
                    type: "IAP_CHARGE",
                    description: `스토어 인앱결제 (${amount.toLocaleString()}콩)`
                }
            });

            return { balance: user.pointBalance };
        });

        res.status(200).json(result);
    } catch (error: any) {
        if (error.message === "Duplicate transaction") {
            return res.status(400).json({ error: "Duplicate transaction" });
        }
        console.error("Verify IAP error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// POST: Reward points to another user
router.post('/reward', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { targetUserId, amount, description, targetType, targetEntityId } = req.body;

        if (!targetUserId || !amount || amount <= 0 || !description) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_DATA_FORMAT });
        }

        if (userId === targetUserId) {
            return res.status(400).json({ error: ERROR_CODES.CANNOT_REWARD_YOURSELF });
        }

        // Pre-fetch PointPolicy for dynamic P2P fee percent calculation
        // Bypassed: PointPolicy schema doesn't exist yet, avoiding 500 fatal crash
        let policy: any = null;
        if (!policy) {
            policy = { p2pFeePercent: 0 } as any; // Default zero fee
        }

        // Robust P2P Fee math logic
        const feePercent = policy.p2pFeePercent || 0;
        const feeAmount = Math.floor(amount * (feePercent / 100));
        const netAmount = Math.max(0, amount - feeAmount);

        const result = await prisma.$transaction(async (tx) => {
            // Deduct FULL amount from sender atomically
            const updatedSender = await tx.user.updateMany({
                where: { id: userId, pointBalance: { gte: amount } },
                data: { pointBalance: { decrement: amount } }
            });

            if (updatedSender.count === 0) {
                throw new Error("Insufficient points.");
            }
            
            const finalSender = await tx.user.findUnique({ where: { id: userId }, select: { pointBalance: true, nickname: true } });
            
            const receiver = await tx.user.findUnique({ where: { id: targetUserId }, select: { nickname: true } });
            if (!receiver) {
                throw new Error("Receiver not found.");
            }

            const senderName = finalSender?.nickname || '익명유저';
            const receiverName = receiver.nickname || '익명유저';

            await tx.pointTransaction.create({
                data: {
                    userId,
                    amount: -amount,
                    type: "REWARD_SENT",
                    description: feeAmount > 0 
                        ? `보상 🎁: ${receiverName}님에게 (${description}) [수수료 ${feeAmount}콩 포함]`
                        : `보상 🎁: ${receiverName}님에게 (${description})`
                }
            });

            // Add NET amount (minus fees) to receiver
            if (netAmount > 0) {
                await tx.user.update({
                    where: { id: targetUserId },
                    data: { pointBalance: { increment: netAmount } }
                });

                await tx.pointTransaction.create({
                    data: {
                        userId: targetUserId,
                        amount: netAmount,
                        type: "REWARD_RECEIVED",
                        description: feeAmount > 0
                            ? `보상 🎁: ${senderName}님으로부터 (${description}) [수수료 ${feePercent}% 공제]`
                            : `보상 🎁: ${senderName}님으로부터 (${description})`
                    }
                });
            }

            // Sync earnedBeans on the target content entity (Comments, Reviews, Posts) based on Full Amount or Net Amount.
            // Decided business logic: display Net Amount for earnings clarity.
            if (targetType === 'COMMENT' && targetEntityId) {
                await tx.comment.update({
                    where: { id: targetEntityId },
                    data: { earnedBeans: { increment: netAmount } }
                });
            } else if (targetType === 'REVIEW' && targetEntityId) {
                await tx.storeReview.update({
                    where: { id: targetEntityId },
                    data: { earnedBeans: { increment: netAmount } }
                });
            } else if (targetType === 'POST' && targetEntityId) {
                await tx.post.update({
                    where: { id: targetEntityId },
                    data: { earnedBeans: { increment: netAmount } }
                });
            }

            return { balance: finalSender?.pointBalance || 0 };
        });

        res.status(200).json(result);
    } catch (error: any) {
        console.error("Reward points error:", error);
        if (error.message === "Insufficient points.") {
            return res.status(400).json({ error: ERROR_CODES.INSUFFICIENT_BEANS });
        }
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

export default router;
