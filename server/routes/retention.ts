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
        const setting = await prisma.systemSetting.findUnique({ where: { key: 'HOME_ROULETTE' } });
        let config: any = { isActive: true, cupCount: 3 };
        if (setting && setting.value) {
            try { config = JSON.parse(setting.value); } catch(e){}
        }
        
        if (!config.isActive) {
            return res.json({ disabled: true });
        }

        const checkInCount = await prisma.dailyCheckIn.count({
            where: { userId: req.user.id }
        });

        if (checkInCount >= 7) {
            return res.json({ disabled: true });
        }

        const info = await getStreakInfo(req.user.id);
        res.json({ ...info, disabled: false, cupCount: config.cupCount || 3 });
    } catch (error) {
        console.error('Streak check error:', error);
        res.status(500).json({ error: 'Failed to fetch status.' });
    }
});

router.post('/daily-checkin', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const cupIndex = req.body.cupIndex || 0;

        const checkInCount = await prisma.dailyCheckIn.count({
            where: { userId }
        });

        if (checkInCount >= 7) {
            return res.status(400).json({ error: 'You have already completed the 7-day attendance challenge.', beansWon: 0, streak: 0 });
        }

        const info = await getStreakInfo(userId);

        if (info.todayPlayed) {
            return res.status(400).json({ error: 'Already checked in today.', beansWon: 0, streak: info.streak });
        }

        const newStreak = info.streak + 1;
        let beansWon = 0;
        
        // 1. Check SystemSetting for rewards
        const setting = await prisma.systemSetting.findUnique({ where: { key: 'HOME_ROULETTE' } });
        let minR = 10;
        let maxR = 100;
        let cupCount = 3;
        if (setting && setting.value) {
            try {
                const config = JSON.parse(setting.value);
                if (config.isActive) {
                    if (typeof config.minReward === 'number') minR = config.minReward;
                    if (typeof config.maxReward === 'number') maxR = config.maxReward;
                    if (typeof config.cupCount === 'number') cupCount = Math.max(1, Math.min(5, config.cupCount));
                }
            } catch (e) {}
        }
        
        if (newStreak === 7) {
            beansWon = 500; // Jackpot!
        } else {
            const min = Math.min(minR, maxR);
            const max = Math.max(minR, maxR);
            beansWon = Math.floor(Math.random() * (max - min + 1)) + min;
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

        const fakes = [];
        for (let i=0; i < cupCount - 1; i++) {
            fakes.push(Math.floor(Math.random() * (maxR - minR + 1)) + minR);
        }

        res.json({ beansWon, message: newStreak === 7 ? '7일 연속 출석 달성! 잭팟!' : 'Check-in successful!', streak: newStreak, fakes });
    } catch (error) {
        console.error('Daily check-in error:', error);
        res.status(500).json({ error: 'Failed to check in.' });
    }
});

router.get('/flash-drops', async (req, res) => {
    try {
        const countryCode = (req.query.countryCode as string) || 'KR';
        const now = new Date();
        const activeDrops = await prisma.flashDrop.findMany({
            where: {
                status: 'ACTIVE',
                endTime: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
                OR: [
                    { region: 'GLOBAL' },
                    { region: countryCode }
                ]
            },
            orderBy: { startTime: 'asc' }
        });
        res.json(activeDrops);
    } catch (error) {
        console.error('Fetch flash drops error:', error);
        res.status(500).json({ error: 'Failed to fetch flash drops.' });
    }
});

export default router;
