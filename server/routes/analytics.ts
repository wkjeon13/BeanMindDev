import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
import prisma from '../utils/prisma.js';

// Track anonymous visitor
router.post('/visit', async (req, res) => {
    try {
        const { visitorId } = req.body;
        
        if (!visitorId) {
            return res.status(400).json({ error: 'visitorId is required' });
        }

        await prisma.anonymousVisitor.upsert({
            where: { visitorId },
            update: {
                visitCount: { increment: 1 },
                lastVisit: new Date()
            },
            create: {
                visitorId,
                visitCount: 1,
                lastVisit: new Date()
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking visitor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Track AI usage for anonymous visitors
router.post('/ai-usage', async (req, res) => {
    try {
        const { visitorId } = req.body;
        
        if (!visitorId) {
            return res.status(400).json({ error: 'visitorId is required' });
        }

        await prisma.anonymousVisitor.upsert({
            where: { visitorId },
            update: {
                hasUsedAi: true,
                aiUsageCount: { increment: 1 },
                lastVisit: new Date()
            },
            create: {
                visitorId,
                visitCount: 1,
                hasUsedAi: true,
                aiUsageCount: 1,
                lastVisit: new Date()
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking AI usage:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
