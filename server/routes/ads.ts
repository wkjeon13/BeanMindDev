import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const POLICY_FILE = path.join(process.cwd(), 'data', 'policy.json');

const getPointPolicy = () => {
    try {
        if (!fs.existsSync(POLICY_FILE)) return { adFrequencyCapHours: 24 };
        const data = fs.readFileSync(POLICY_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return { adFrequencyCapHours: 24 };
    }
};

const router = express.Router();
import prisma from '../utils/prisma.js';
const JWT_SECRET = process.env.JWT_SECRET as string;

// Optional Auth middleware - Ads can be served to anonymous users too
const optionalAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
            if (!err) {
                req.user = user;
            }
            next();
        });
    } else {
        next();
    }
};

// GET /api/ads/serve
// Queries active campaigns matching user's country and language
router.get('/serve', optionalAuth, async (req: any, res) => {
    try {
        const { tab, lang = 'en', placementKey: targetPlacement } = req.query;
        let userCountry = 'GLOBAL';

        if (req.user) {
            const dbUser = await prisma.user.findUnique({ 
                where: { id: req.user.id },
                select: { countryCode: true }
            });
            if (dbUser?.countryCode) {
                userCountry = dbUser.countryCode;
            }
        } else {
            // Estimate country for guest users based on language preference
            const languageMap: Record<string, string> = {
                'ko': 'KR',
                'en': 'US',
                'ja': 'JP',
                'zh': 'CN',
                'es': 'ES',
                'fr': 'FR'
            };
            if (typeof lang === 'string') {
                const baseLang = lang.split('-')[0].toLowerCase();
                if (languageMap[baseLang]) {
                    userCountry = languageMap[baseLang];
                }
            }
        }

        const now = new Date();

        // 1. Find active campaigns targeting this country or GLOBAL
        const activeCampaigns = await prisma.campaign.findMany({
            where: {
                status: 'ACTIVE',
                startDate: { lte: now },
                endDate: { gte: now },
                contract: {
                    status: 'ACTIVE',
                    startDate: { lte: now },
                    endDate: { gte: now }
                },
                OR: [
                    { targetCountry: 'GLOBAL' },
                    { targetCountry: userCountry }
                ]
            },
            include: {
                creatives: {
                    where: {
                        status: 'ACTIVE',
                    },
                    include: {
                        placement: true
                    }
                },
                contract: true
            }
        });

        // 2. Filter campaigns by budget exhaustion and creatives by targetLanguage
        let matchedCreatives: any[] = [];
        
        activeCampaigns.forEach(campaign => {
            // Check budget exhaustion
            const contract = campaign.contract;
            if (contract && contract.pricingModel !== 'FIXED' && contract.totalBudget > 0 && contract.spentBudget >= contract.totalBudget) {
                return; // Skip this campaign because budget is exhausted
            }

            // Apply language filtering
            const isValidLang = !campaign.targetLanguage || campaign.targetLanguage === lang || campaign.targetLanguage === 'ALL';
            
            if (isValidLang) {
                // Map tab to ad type based on placement
                campaign.creatives.forEach((c: any) => {
                    const placementKey = c.placement?.locationKey || '';
                    let isTabMatch = false;
                    
                    if (targetPlacement) {
                        // Strict placement matching if requested with fallback for GLOBAL
                        if (placementKey === targetPlacement) {
                            isTabMatch = true;
                        } else if (targetPlacement === 'GLOBAL' && placementKey === 'FEED_CLUB_PREMIUM') {
                            isTabMatch = true;
                        }
                    } else {
                        if (tab === 'FEED' && (placementKey.includes('FEED') || !placementKey)) isTabMatch = true;
                        if (tab === 'SHORTS' && (placementKey.includes('SHORTS') || c.type === 'VIDEO')) isTabMatch = true;
                        if (tab === 'MAP' && placementKey.includes('MAP')) isTabMatch = true;
                        if (tab === 'MAGAZINE' && placementKey.includes('MAGAZINE')) isTabMatch = true;

                        // Support legacy generic fallback if no specific placement is set
                        if (!placementKey && tab === 'FEED') isTabMatch = true;
                    }

                    if (isTabMatch) {
                        matchedCreatives.push({
                            ...c,
                            campaignName: campaign.name,
                            advertiserId: campaign.advertiserId
                        });
                    }
                });
            }
        });

        // 3. Fallback to AdMob if no direct ads are found
        if (matchedCreatives.length === 0) {
            return res.json({ fallback: 'ADMOB' });
        }

        // 4. Select a random ad from the matched ones (simple rotation)
        const selectedAd = matchedCreatives[Math.floor(Math.random() * matchedCreatives.length)];
        
        const policy = getPointPolicy();

        res.json({
            type: 'DIRECT',
            ad: selectedAd,
            ads: matchedCreatives.sort(() => Math.random() - 0.5),
            frequencyCapHours: policy.adFrequencyCapHours !== undefined ? policy.adFrequencyCapHours : 24
        });

    } catch (error) {
        console.error('Error serving ad:', error);
        // Fail gracefully to AdMob
        res.json({ fallback: 'ADMOB' });
    }
});

// POST /api/ads/track
// Track impressions and clicks
router.post('/track', optionalAuth, async (req: any, res) => {
    try {
        const { creativeId, actionType } = req.body; // IMPRESSION or CLICK
        
        if (!creativeId || !actionType) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const creative = await (prisma as any).adCreative.findUnique({
            where: { id: creativeId },
            include: { campaign: { include: { contract: { include: { advertiser: true } } } } }
        });

        if (!creative) {
            return res.status(404).json({ error: 'Creative not found' });
        }

        // Always create AdLog
        await prisma.adLog.create({
            data: {
                creativeId,
                actionType,
                userId: req.user ? req.user.id : null,
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            }
        });

        // Deduct CPC Price from Contract Budget on Click
        if (actionType === 'CLICK' && creative.campaign?.contract) {
            const deductionAmount = creative.cpcPrice || 0;
            if (deductionAmount > 0) {
                const contract = creative.campaign.contract;

                // Overspend Protection: Do not charge if budget is already exhausted or contract is not active
                if (contract.status !== 'ACTIVE' || contract.spentBudget >= contract.totalBudget) {
                    return res.json({ success: true, message: 'Budget exhausted. Click logged without charging.' });
                }

                const newSpentBudget = contract.spentBudget + deductionAmount;
                const willExhaust = newSpentBudget >= contract.totalBudget;

                const txs = [];

                txs.push(
                    prisma.contract.update({
                        where: { id: contract.id },
                        data: {
                            spentBudget: { increment: deductionAmount },
                            status: willExhaust ? 'COMPLETED' : contract.status
                        }
                    })
                );

                if (willExhaust) {
                    txs.push(
                        prisma.campaign.updateMany({
                            where: { contractId: contract.id },
                            data: { status: 'COMPLETED' }
                        })
                    );
                }

                await prisma.$transaction(txs);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking ad:', error);
        res.status(500).json({ error: 'Failed to track ad' });
    }
});

export default router;
