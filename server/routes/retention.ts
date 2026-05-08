import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const prisma = new PrismaClient();
const router = express.Router();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token || token === 'null') return res.status(401).json({ error: 'Access denied.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user;
        next();
    });
};

const normalizeDate = (d) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
};

const getStreakInfo = async (userId) => {
    const checkIns = await prisma.dailyCheckIn.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });

    if (checkIns.length === 0) return { streak: 0, todayPlayed: false };

    const uniqueDates = [...new Set(checkIns.map(c => normalizeDate(c.createdAt)))];
    
    const today = normalizeDate(new Date());
    let streak = 0;
    let todayPlayed = false;

    if (uniqueDates[0] === today) {
        todayPlayed = true;
        streak = 1;
        
        let expectedDate = today - 86400000;
        for (let i = 1; i < uniqueDates.length; i++) {
            if (uniqueDates[i] === expectedDate) {
                streak++;
                expectedDate -= 86400000;
            } else {
                break;
            }
        }
    } else if (uniqueDates[0] === today - 86400000) {
        todayPlayed = false;
        streak = 1;

        let expectedDate = today - 86400000 * 2;
        for (let i = 1; i < uniqueDates.length; i++) {
            if (uniqueDates[i] === expectedDate) {
                streak++;
                expectedDate -= 86400000;
            } else {
                break;
            }
        }
    } else {
        // More than 1 day missed, streak is 0
        streak = 0;
        todayPlayed = false;
    }

    // Reset streak if it reached 7 previously (7 days cycle)
    streak = streak % 7;
    
    return { streak, todayPlayed };
};

router.get('/daily-status', authenticateToken, async (req, res) => {
    try {
        const info = await getStreakInfo(req.user.id);
        res.json(info);
    } catch (error) {
        console.error('Streak check error:', error);
        res.status(500).json({ error: 'Failed to fetch status.' });
    }
});

router.post('/daily-checkin', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const info = await getStreakInfo(userId);

        if (info.todayPlayed) {
            return res.status(400).json({ error: 'Already checked in today.', beansWon: 0, streak: info.streak });
        }

        const newStreak = info.streak + 1;
        let beansWon = 0;
        
        if (newStreak === 7) {
            beansWon = 500; // Jackpot!
        } else {
            // Normal: 10 ~ 100
            beansWon = Math.floor(Math.random() * 91) + 10;
        }

        await prisma.$transaction([
            prisma.dailyCheckIn.create({
                data: { userId, beansWon }
            }),
            prisma.user.update({
                where: { id: userId },
                data: { pointBalance: { increment: beansWon } }
            }),
            prisma.pointTransaction.create({
                data: {
                    userId,
                    amount: beansWon,
                    type: 'EARN',
                    description: newStreak === 7 ? '7-Day Check-in Jackpot' : 'Daily Check-in'
                }
            })
        ]);

        res.json({ beansWon, message: newStreak === 7 ? '7일 연속 출석 달성! 잭팟!' : 'Check-in successful!', streak: newStreak });
    } catch (error) {
        console.error('Daily check-in error:', error);
        res.status(500).json({ error: 'Failed to check in.' });
    }
});

router.get('/flash-drops', async (req, res) => {
    try {
        const now = new Date();
        const activeDrops = await prisma.flashDrop.findMany({
            where: {
                status: 'ACTIVE',
                endTime: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
            },
            orderBy: { startTime: 'asc' }
        });

        if (activeDrops.length === 0) {
            return res.json([{
                id: 'mock-1',
                title: '파나마 게이샤 원두 한정 50% 특가',
                description: '세계 최고의 커피, 파나마 게이샤를 반값에 만날 수 있는 단 2시간의 기회!',
                imageUrl: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=800&q=80',
                linkUrl: '#',
                startTime: new Date(now.getTime() + 5 * 60 * 1000),
                endTime: new Date(now.getTime() + 125 * 60 * 1000),
                maxQuantity: 50,
                claimedCount: 0,
                status: 'ACTIVE'
            }]);
        }
        res.json(activeDrops);
    } catch (error) {
        console.error('Fetch flash drops error:', error);
        res.status(500).json({ error: 'Failed to fetch flash drops.' });
    }
});

export default router;
