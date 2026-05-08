import express from 'express';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { curationQueue } from '../workers/aiCuratorQueue.js';
import { ERROR_CODES } from '../utils/errorCodes.js';

const router = express.Router();
import prisma from '../utils/prisma.js';
const JWT_SECRET = process.env.JWT_SECRET as string;

// Middleware to conditionally authenticate if token is present
const curationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 10, // Max 10 generations per hour per IP
    message: { error: 'Too many AI generation requests from this IP, please try again after an hour.' }
});
const extractToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
            if (!err) req.user = user;
            next();
        });
    } else {
        next();
    }
};

// Check Eligibility Endpoint (So front-end can quickly preempt if no credits)
router.post('/verify-cost', extractToken, async (req: any, res: any) => {
    try {
        if (!req.user) return res.status(200).json({ eligible: true, type: 'anonymous' });
        
        const userId = req.user.id;
        const userDb = await prisma.user.findUnique({ where: { id: userId } });
        if (!userDb) return res.status(404).json({ errorCode: ERROR_CODES.USER_NOT_FOUND });

        const canUseFree = userDb.aiUsageCount < userDb.aiPrescriptionLimit;
        const hasEnoughPoints = userDb.pointBalance >= 100; // Hardcoded prescription cost

        if (!canUseFree && !hasEnoughPoints) {
             return res.status(403).json({ 
                 errorCode: ERROR_CODES.INSUFFICIENT_BEANS, 
                 current: userDb.aiUsageCount, 
                 limit: userDb.aiPrescriptionLimit,
                 pointBalance: userDb.pointBalance,
                 cost: 100
             });
        }
        res.status(200).json({ eligible: true, type: 'authenticated' });
    } catch (error) {
        console.error("AI verify cost error:", error);
        res.status(500).json({ errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});


// Add a brand new AI generation task to the Queue
router.post('/generate', curationLimiter, extractToken, async (req: any, res: any) => {
    try {
        // Enqueue the job with data provided by the client
        const payload = req.body;
        
        let deductPoints = false;
        let deductFree = false;

        if (req.user) {
            payload.userId = req.user.id;
            
            const userDb = await prisma.user.findUnique({ where: { id: req.user.id } });
            if (!userDb) return res.status(404).json({ errorCode: ERROR_CODES.USER_NOT_FOUND });

            const canUseFree = userDb.aiUsageCount < userDb.aiPrescriptionLimit;
            const hasEnoughPoints = userDb.pointBalance >= 100;

            if (!canUseFree && !hasEnoughPoints) {
                return res.status(403).json({ errorCode: ERROR_CODES.INSUFFICIENT_BEANS });
            }

            if (canUseFree) {
                deductFree = true;
            } else {
                deductPoints = true;
            }

            // Deduct points or free limit within a transaction BEFORE hitting the expensive API queue
            await prisma.$transaction(async (tx) => {
                if (deductFree) {
                    const updated = await tx.user.updateMany({
                        where: { id: req.user.id, aiUsageCount: { lt: userDb.aiPrescriptionLimit } },
                        data: { aiUsageCount: { increment: 1 } }
                    });
                    if (updated.count === 0) throw new Error("Insufficient free uses.");
                } else if (deductPoints) {
                    const updated = await tx.user.updateMany({
                        where: { id: req.user.id, pointBalance: { gte: 100 } },
                        data: { pointBalance: { decrement: 100 } }
                    });
                    if (updated.count === 0) throw new Error("Insufficient points.");
                    
                    await tx.pointTransaction.create({
                        data: {
                            userId: req.user.id,
                            amount: -100,
                            type: 'SPEND',
                            description: 'AI 커피 맞춤 큐레이션 (Premium)'
                        }
                    });
                }
            });
        }

        // BullMQ Job Option
        const job = await curationQueue.add('generate-prescription', payload, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
        });

        res.status(202).json({ 
            message: 'Job enqueued successfully', 
            jobId: job.id 
        });

    } catch (error) {
        console.error("Queue add error:", error);
        res.status(500).json({ errorCode: ERROR_CODES.AI_GENERATION_FAILED });
    }
});


// Poll for Job Status
router.get('/status/:jobId', async (req: any, res: any) => {
    try {
        const { jobId } = req.params;
        const job = await curationQueue.getJob(jobId);

        if (!job) {
            return res.status(404).json({ errorCode: ERROR_CODES.PRESCRIPTION_NOT_FOUND });
        }

        const state = await job.getState();
        const progress = job.progress;

        if (state === 'completed') {
            return res.status(200).json({ 
                status: 'completed', 
                progress: 100,
                result: job.returnvalue 
            });
        }

        if (state === 'failed') {
            return res.status(500).json({ 
                status: 'failed', 
                error: job.failedReason 
            });
        }

        // Pending, Active, Waiting, etc.
        res.status(200).json({
            status: state,
            progress: progress || 0,
        });

    } catch (error) {
        console.error("Job status fetch error:", error);
        res.status(500).json({ errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

export default router;
