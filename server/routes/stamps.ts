import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma.js';
import { ERROR_CODES } from '../utils/errorCodes.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET as string;

// 지능형 품목 설정 복구 파서 (Promotion 카드 타이틀로부터 정적 품목 복원 지원)
const getItemsConfig = (cfg: any) => {
    if (!cfg) return null;
    let parsed = cfg.itemsConfig;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch (e) {
            parsed = null;
        }
    }
    
    if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
    }
    
    if (cfg.cardType === 'PROMOTION' && cfg.cardTitle) {
        const tokens = cfg.cardTitle.split(/[+,]/);
        const items: { key: string; label: string; target: number }[] = [];
        let index = 0;
        for (const token of tokens) {
            const trimmed = token.trim();
            if (!trimmed) continue;
            
            const match = trimmed.match(/^([^0-9]+?)\s*(\d+)\s*(?:잔|개|병|팩|개입)?$/);
            if (match) {
                const label = match[1].trim();
                const target = parseInt(match[2], 10);
                if (label && !isNaN(target)) {
                    items.push({
                        key: `item_${index}`,
                        label: label,
                        target: target
                    });
                    index++;
                }
            }
        }
        if (items.length > 0) {
            return items;
        }
    }
    
    return null;
};

// 인증 미들웨어
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: ERROR_CODES.MISSING_AUTH_HEADER || "MISSING_AUTH_HEADER" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: ERROR_CODES.INVALID_TOKEN || "INVALID_TOKEN" });
        req.user = user;
        next();
    });
};

// 1. 매장별 스탬프 발급 정책 생성 및 변경 (일반 및 프로모션 다중 Config 등록 지원)
// POST /api/stamps/configs
router.post('/configs', authenticateToken, async (req: any, res: any) => {
    try {
        const { storeId, cardType, cardTitle, maxStamps, targetMenu, rewardDesc, validDays, itemsConfig } = req.body;

        if (!storeId || !cardTitle || !rewardDesc) {
            return res.status(400).json({ error: "INVALID_INPUT", message: "필수 입력 항목이 누락되었습니다." });
        }

        // 기존에 동일 매장 & 카드타입에 대해 활성화된 정책이 있는지 체크
        const existingConfig = await prisma.storeStampConfig.findFirst({
            where: { storeId, cardType, isActive: true }
        });

        // 기존 활성 정책 비활성화 (새 정책으로 교체하는 개념)
        if (existingConfig) {
            await prisma.storeStampConfig.update({
                where: { id: existingConfig.id },
                data: { isActive: false }
            });
        }

        const newConfig = await prisma.storeStampConfig.create({
            data: {
                storeId,
                cardType: cardType || "REGULAR",
                cardTitle,
                maxStamps: maxStamps ? parseInt(maxStamps, 10) : 10,
                targetMenu: targetMenu || null,
                rewardDesc,
                validDays: validDays ? parseInt(validDays, 10) : 90,
                isActive: true,
                itemsConfig: itemsConfig ? JSON.stringify(itemsConfig) : null
            } as any
        });

        res.status(200).json(newConfig);
    } catch (error) {
        console.error("Create stamp config error:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "정책 생성 중 오류가 발생했습니다." });
    }
});

router.get('/configs/:storeId', async (req: any, res: any) => {
    try {
        const { storeId } = req.params;
        const configs = await prisma.storeStampConfig.findMany({
            where: { storeId, isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        
        const parsedConfigs = configs.map((c: any) => ({
            ...c,
            itemsConfig: c.itemsConfig ? JSON.parse(c.itemsConfig) : null
        }));
        
        res.status(200).json(parsedConfigs);
    } catch (error) {
        console.error("Fetch stamp configs error:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "정책 조회 중 오류가 발생했습니다." });
    }
});

// 3. 다중 스탬프 카드 적립 (이월 적립 및 자동 쿠폰 발행 지원)
// POST /api/stamps/earn
router.post('/earn', authenticateToken, async (req: any, res: any) => {
    try {
        const { userId, storeId, configId, amount, items } = req.body;
        const earnAmount = parseInt(amount, 10);

        if (!userId || !storeId || !configId || isNaN(earnAmount) || earnAmount <= 0) {
            return res.status(400).json({ error: "INVALID_INPUT", message: "올바르지 않은 입력값입니다." });
        }

        // 해당 정책(StoreStampConfig) 조회
        const config = await prisma.storeStampConfig.findUnique({
            where: { id: configId }
        });

        if (!config || !config.isActive) {
            return res.status(404).json({ error: "CONFIG_NOT_FOUND", message: "활성화된 스탬프 정책을 찾을 수 없습니다." });
        }

        const maxStamps = config.maxStamps;
        const resolvedItemsConfig = getItemsConfig(config);
        const isPromotion = config.cardType === "PROMOTION" && resolvedItemsConfig !== null;

        const result = await prisma.$transaction(async (tx) => {
            // 유저의 기존 스탬프 카드 조회
            let stampCard = await tx.userStampCard.findUnique({
                where: {
                    userId_configId: { userId, configId }
                }
            });

            if (!stampCard) {
                // 신규 생성
                stampCard = await tx.userStampCard.create({
                    data: {
                        userId,
                        storeId,
                        configId,
                        currentStamps: 0,
                        completedCount: 0,
                        itemsProgress: null
                    } as any
                });
            }

            let newStamps = stampCard.currentStamps;
            let newCompletedCount = stampCard.completedCount;
            const createdCoupons = [];
            let updatedItemsProgress = stampCard.itemsProgress;

            if (isPromotion && resolvedItemsConfig) {
                // [복합 프로모션 도장판 적립 로직]
                const configItems = resolvedItemsConfig;
                let progress = stampCard.itemsProgress ? JSON.parse(stampCard.itemsProgress) : {};
                const inputItems = items || {};

                // 품목별 가산
                configItems.forEach((item: any) => {
                    const key = item.key;
                    const earnQty = parseInt(inputItems[key] || 0, 10);
                    progress[key] = (progress[key] || 0) + earnQty;
                });

                // 루프를 돌며 품목별 목표 완성 충족 시 쿠폰 발급 및 차감
                while (true) {
                    let canComplete = true;
                    configItems.forEach((item: any) => {
                        const key = item.key;
                        const target = item.target;
                        if ((progress[key] || 0) < target) {
                            canComplete = false;
                        }
                    });

                    if (!canComplete) break;

                    // 품목별 수량 소모
                    configItems.forEach((item: any) => {
                        const key = item.key;
                        progress[key] -= item.target;
                    });

                    newCompletedCount += 1;

                    // 무료 쿠폰 생성
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + config.validDays);

                    const coupon = await tx.stampCoupon.create({
                        data: {
                            userId,
                            storeId,
                            configId,
                            couponCode: `STAMP-${uuidv4().substring(0, 8).toUpperCase()}`,
                            status: "UNUSED",
                            expiresAt
                        }
                    });
                    createdCoupons.push(coupon);
                }

                // 현재 보유 스탬프 총량 재계산
                let totalCurrent = 0;
                configItems.forEach((item: any) => {
                    totalCurrent += (progress[item.key] || 0);
                });

                newStamps = totalCurrent;
                updatedItemsProgress = JSON.stringify(progress);
            } else {
                // [기존 일반 단일 품목 적립 로직]
                newStamps = stampCard.currentStamps + earnAmount;
                while (newStamps >= maxStamps) {
                    newStamps -= maxStamps;
                    newCompletedCount += 1;

                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + config.validDays);

                    const coupon = await tx.stampCoupon.create({
                        data: {
                            userId,
                            storeId,
                            configId,
                            couponCode: `STAMP-${uuidv4().substring(0, 8).toUpperCase()}`,
                            status: "UNUSED",
                            expiresAt
                        }
                    });
                    createdCoupons.push(coupon);
                }
            }

            // 스탬프 카드 업데이트
            const updatedCard = await tx.userStampCard.update({
                where: { id: stampCard.id },
                data: {
                    currentStamps: newStamps,
                    completedCount: newCompletedCount,
                    itemsProgress: updatedItemsProgress
                } as any
            });

            // 스탬프 트랜잭션 기록
            const transaction = await tx.stampTransaction.create({
                data: {
                    userId,
                    storeId,
                    configId,
                    amount: earnAmount,
                    txnType: "EARN",
                    itemsEarned: items ? JSON.stringify(items) : null
                } as any
            });

            return { card: updatedCard, coupons: createdCoupons, transaction };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Earn stamp error:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "스탬프 적립 중 오류가 발생했습니다." });
    }
});

// 4. 마지막 트랜잭션 롤백/취소
// POST /api/stamps/rollback
router.post('/rollback', authenticateToken, async (req: any, res: any) => {
    try {
        const { userId, storeId, configId } = req.body;

        if (!userId || !storeId || !configId) {
            return res.status(400).json({ error: "INVALID_INPUT", message: "필수 항목이 누락되었습니다." });
        }

        // 해당 유저, 매장, 정책의 가장 마지막 EARN 트랜잭션 조회
        const lastTxn = await prisma.stampTransaction.findFirst({
            where: { userId, storeId, configId, txnType: "EARN" },
            orderBy: { createdAt: "desc" }
        });

        if (!lastTxn) {
            return res.status(404).json({ error: "TRANSACTION_NOT_FOUND", message: "롤백할 적립 내역을 찾을 수 없습니다." });
        }

        // 이미 롤백 되었는지 여부 체크를 위해 동일 내역 취소 트랜잭션 확인 (단순 최종건 기준)
        const lastCancelTxn = await prisma.stampTransaction.findFirst({
            where: { userId, storeId, configId, txnType: "CANCEL_ROLLBACK" },
            orderBy: { createdAt: "desc" }
        });

        if (lastCancelTxn && lastCancelTxn.createdAt > lastTxn.createdAt) {
            return res.status(400).json({ error: "ALREADY_ROLLED_BACK", message: "가장 최근의 적립 내역이 이미 취소되었습니다." });
        }

        const rollbackAmount = lastTxn.amount;

        // 해당 스탬프 설정 조회
        const config = await prisma.storeStampConfig.findUnique({
            where: { id: configId }
        });

        if (!config) {
            return res.status(404).json({ error: "CONFIG_NOT_FOUND", message: "정책을 찾을 수 없습니다." });
        }

        const maxStamps = config.maxStamps;

        const result = await prisma.$transaction(async (tx) => {
            const stampCard = await tx.userStampCard.findUnique({
                where: { userId_configId: { userId, configId } }
            });

            if (!stampCard) {
                throw new Error("스탬프 카드가 존재하지 않습니다.");
            }

            let currentStamps = stampCard.currentStamps;
            let completedCount = stampCard.completedCount;
            let updatedItemsProgress = stampCard.itemsProgress;

            // 수학적 롤백 (이월 복원)
            currentStamps -= rollbackAmount;

            let couponsToRevokeCount = 0;
            while (currentStamps < 0) {
                if (completedCount <= 0) {
                    currentStamps = 0; // 마이너스 방지 폴백
                    break;
                }
                completedCount -= 1;
                currentStamps += maxStamps;
                couponsToRevokeCount += 1;
            }

            // 복합 프로모션 도장판인 경우 itemsProgress도 정밀 롤백 복원
            const rollbackItemsConfig = getItemsConfig(config);
            const isPromotion = config.cardType === "PROMOTION" && rollbackItemsConfig !== null;
            if (isPromotion && rollbackItemsConfig) {
                const configItems = rollbackItemsConfig;
                let progress = stampCard.itemsProgress ? JSON.parse(stampCard.itemsProgress) : {};
                const earnedItems = lastTxn.itemsEarned ? JSON.parse(lastTxn.itemsEarned) : {};

                // 적립 시점에 가산되었던 개별 품목 수량 차감
                configItems.forEach((item: any) => {
                    const key = item.key;
                    const earnQty = parseInt(earnedItems[key] || 0, 10);
                    progress[key] = (progress[key] || 0) - earnQty;
                });

                // 쿠폰 완성 복구로 인해 수량이 원복(가산)되어야 하는 경우 처리
                if (couponsToRevokeCount > 0) {
                    configItems.forEach((item: any) => {
                        const key = item.key;
                        progress[key] += (item.target * couponsToRevokeCount);
                    });
                }

                // 음수 방지 가드
                configItems.forEach((item: any) => {
                    const key = item.key;
                    if (progress[key] < 0) progress[key] = 0;
                });

                updatedItemsProgress = JSON.stringify(progress);
            }

            // 롤백으로 인해 완성 횟수가 줄어들었다면, 발행했던 미사용 쿠폰도 취소 처리
            let revokedCouponsCount = 0;
            if (couponsToRevokeCount > 0) {
                const couponsToRevoke = await tx.stampCoupon.findMany({
                    where: { userId, storeId, status: "UNUSED" },
                    orderBy: { expiresAt: "desc" },
                    take: couponsToRevokeCount
                });

                for (const coupon of couponsToRevoke) {
                    await tx.stampCoupon.update({
                        where: { id: coupon.id },
                        data: { status: "EXPIRED" } // EXPIRED로 만료 처리하여 취소
                    });
                    revokedCouponsCount++;
                }
            }

            // 스탬프 카드 롤백 반영
            const updatedCard = await tx.userStampCard.update({
                where: { id: stampCard.id },
                data: {
                    currentStamps,
                    completedCount,
                    itemsProgress: updatedItemsProgress
                } as any
            });

            // 취소 트랜잭션 로그 생성
            const cancelTransaction = await tx.stampTransaction.create({
                data: {
                    userId,
                    storeId,
                    configId,
                    amount: -rollbackAmount,
                    txnType: "CANCEL_ROLLBACK"
                }
            });

            return { card: updatedCard, revokedCouponsCount, transaction: cancelTransaction };
        });

        res.status(200).json({
            message: "적립 취소(롤백)가 성공적으로 완료되었습니다.",
            ...result
        });
    } catch (error: any) {
        console.error("Rollback stamp error:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: error.message || "롤백 처리 중 오류가 발생했습니다." });
    }
});

// 5. 로그인된 이용자의 사용 가능한 무료 쿠폰 목록 조회
// GET /api/stamps/coupons/my
router.get('/coupons/my', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        // 💡 프리즈마 클라이언트 EPERM 파일 잠금 우회를 위해 raw SQL로 쿼리하여 물리 DB 상의 configId 값을 안전히 보장받아 로드합니다.
        const coupons: any[] = await prisma.$queryRawUnsafe(`
            SELECT * FROM StampCoupon 
            WHERE userId = ? AND status = 'UNUSED' AND expiresAt >= ?
            ORDER BY expiresAt ASC
        `, userId, new Date());

        // 매장 정보 및 정책 리워드 혜택 명칭 함께 붙여서 전송
        const couponsWithStore = await Promise.all(coupons.map(async (coupon) => {
            const store = await prisma.store.findUnique({
                where: { id: coupon.storeId },
                select: { name: true, mainImageUrl: true }
            });
            let rewardDesc = "무료 음료 교환 혜택";
            let cardTitle = "스탬프 도장판";
            let config = null;

            if (coupon.configId) {
                config = await prisma.storeStampConfig.findUnique({
                    where: { id: coupon.configId },
                    select: { rewardDesc: true, cardTitle: true }
                });
            }

            // [Fallback] 만약 configId가 없거나 매칭되는 config가 없으면, 해당 매장의 현재 활성화된 정책을 기반으로 리워드를 산출합니다.
            if (!config) {
                config = await prisma.storeStampConfig.findFirst({
                    where: { storeId: coupon.storeId, isActive: true },
                    select: { rewardDesc: true, cardTitle: true }
                });
            }

            if (config) {
                rewardDesc = config.rewardDesc || rewardDesc;
                cardTitle = config.cardTitle || cardTitle;
            }

            return {
                ...coupon,
                storeName: store?.name || "알 수 없는 매장",
                storeLogo: store?.mainImageUrl || null,
                rewardDesc,
                cardTitle
            };
        }));

        res.status(200).json(couponsWithStore);
    } catch (error) {
        console.error("Fetch my coupons error:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "쿠폰함 조회 중 오류가 발생했습니다." });
    }
});

// 6. 쿠폰 사용 처리
// POST /api/stamps/coupons/:id/use
router.post('/coupons/:id/use', authenticateToken, async (req: any, res: any) => {
    try {
        const { id } = req.params;

        const coupon = await prisma.stampCoupon.findUnique({
            where: { id }
        });

        if (!coupon) {
            return res.status(404).json({ error: "COUPON_NOT_FOUND", message: "쿠폰을 찾을 수 없습니다." });
        }

        if (coupon.status !== "UNUSED") {
            return res.status(400).json({ error: "ALREADY_USED_OR_EXPIRED", message: "이미 사용되었거나 만료된 쿠폰입니다." });
        }

        if (new Date() > coupon.expiresAt) {
            await prisma.stampCoupon.update({
                where: { id },
                data: { status: "EXPIRED" }
            });
            return res.status(400).json({ error: "EXPIRED_COUPON", message: "유효 기간이 만료된 쿠폰입니다." });
        }

        const updatedCoupon = await prisma.stampCoupon.update({
            where: { id },
            data: {
                status: "USED",
                usedAt: new Date()
            }
        });

        res.status(200).json({
            message: "쿠폰 사용 처리가 완료되었습니다.",
            coupon: updatedCoupon
        });
    } catch (error) {
        console.error("Use coupon error:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "쿠폰 사용 중 오류가 발생했습니다." });
    }
});

// 7. 로그인된 이용자의 전체 스탬프 카드 현황 조회
// GET /api/stamps/cards/my
router.get('/cards/my', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;

        const stampCards = await prisma.userStampCard.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
        });

        const cardsWithDetails = await Promise.all(stampCards.map(async (card) => {
            const config = await prisma.storeStampConfig.findUnique({
                where: { id: card.configId }
            });
            const store = await prisma.store.findUnique({
                where: { id: card.storeId },
                select: { name: true, mainImageUrl: true }
            });

            return {
                ...card,
                cardTitle: config?.cardTitle || "스탬프 쿠폰",
                cardType: config?.cardType || "REGULAR",
                maxStamps: config?.maxStamps || 10,
                rewardDesc: config?.rewardDesc || "아메리카노 무료 쿠폰",
                validDays: config?.validDays || 90,
                storeName: store?.name || "알 수 없는 매장",
                storeLogo: store?.mainImageUrl || null,
                itemsConfig: config?.itemsConfig ? JSON.parse(config.itemsConfig) : null,
                itemsProgress: card.itemsProgress ? JSON.parse(card.itemsProgress) : null
            };
        }));

        res.status(200).json(cardsWithDetails);
    } catch (error) {
        console.error("Fetch my stamp cards error:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "스탬프 조회 중 오류가 발생했습니다." });
    }
});

// 8. 점주용 API. 스캔한 이용자 ID로 해당 매장에서의 적립 카드 조회
// GET /api/stamps/user/:userId/cards
router.get('/user/:userId/cards', authenticateToken, async (req: any, res: any) => {
    try {
        const { userId } = req.params;
        const { storeId } = req.query; // 점주가 담당하는 매장 ID

        if (!userId || !storeId) {
            return res.status(400).json({ error: "INVALID_INPUT", message: "필수 항목(userId, storeId)이 누락되었습니다." });
        }

        // 해당 매장의 스탬프 설정 조회
        const configs = await prisma.storeStampConfig.findMany({
            where: { storeId: storeId as string, isActive: true }
        });

        const cardsWithConfig = await Promise.all(configs.map(async (config) => {
            let card = await prisma.userStampCard.findUnique({
                where: {
                    userId_configId: { userId, configId: config.id }
                }
            });

            const parsedConfig = {
                ...config,
                itemsConfig: config.itemsConfig ? JSON.parse(config.itemsConfig) : null
            };

            const parsedCard = card ? {
                ...card,
                itemsProgress: card.itemsProgress ? JSON.parse(card.itemsProgress) : null
            } : {
                id: "",
                userId,
                storeId: storeId as string,
                configId: config.id,
                currentStamps: 0,
                completedCount: 0,
                itemsProgress: null,
                updatedAt: new Date()
            };

            return {
                config: parsedConfig,
                card: parsedCard
            };
        }));

        // 유저 정보 가져오기
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, nickname: true, email: true }
        });

        // 💡 만약 스캔된 식별자가 유저 ID가 아니면, 쿠폰 ID인지 한 번 더 검사해주는 영리한 폴백!
        if (!user) {
            const coupon = await prisma.stampCoupon.findUnique({
                where: { id: userId }
            });
            
            if (coupon) {
                // 이 쿠폰을 소유한 유저 정보 획득
                const couponUser = await prisma.user.findUnique({
                    where: { id: coupon.userId },
                    select: { id: true, nickname: true, email: true }
                });
                
                // 해당 쿠폰의 스탬프 혜택 명칭 등을 함께 붙여서 반환
                let rewardDesc = "무료 혜택 무료 쿠폰";
                if (coupon.configId) {
                    const config = await prisma.storeStampConfig.findUnique({
                        where: { id: coupon.configId },
                        select: { rewardDesc: true }
                    });
                    if (config?.rewardDesc) {
                        rewardDesc = config.rewardDesc;
                    }
                }
                
                return res.status(200).json({
                    isCoupon: true,
                    coupon: {
                        ...coupon,
                        userNickname: couponUser?.nickname || "단골 고객",
                        userEmail: couponUser?.email || "unknown@test.com",
                        rewardDesc
                    }
                });
            }
        }

        // 💡 미가입 유저 차단 가드: 스캔된 ID가 실제 가입 회원이 아닐 경우 오적립을 원천 차단하고 에러 반환!
        if (!user) {
            return res.status(404).json({ 
                error: "USER_NOT_FOUND", 
                message: "존재하지 않거나 올바르지 않은 유저 QR 코드 식별자입니다." 
            });
        }

        res.status(200).json({
            user: user,
            cards: cardsWithConfig
        });
    } catch (error) {
        console.error("Fetch user stamp cards by host error:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "고객 정보 조회 중 오류가 발생했습니다." });
    }
});

// 9. 점주용 통계 API. 매장의 총 적립 건수, 오늘 적립 수, 총 발행 쿠폰, 총 사용 쿠폰 조회
// GET /api/stamps/owner/stats/:storeId
router.get('/owner/stats/:storeId', authenticateToken, async (req: any, res: any) => {
    try {
        const { storeId } = req.params;

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // 총 적립 트랜잭션 건수 (EARN)
        const totalEarnCount = await prisma.stampTransaction.count({
            where: { storeId, txnType: "EARN" }
        });

        // 오늘 적립 트랜잭션 건수 (EARN)
        const todayEarnCount = await prisma.stampTransaction.count({
            where: {
                storeId,
                txnType: "EARN",
                createdAt: { gte: startOfToday }
            }
        });

        // 총 발행 무료 쿠폰
        const totalIssuedCoupons = await prisma.stampCoupon.count({
            where: { storeId }
        });

        // 사용 완료된 쿠폰
        const totalUsedCoupons = await prisma.stampCoupon.count({
            where: { storeId, status: "USED" }
        });

        // 최근 적립 내역 10건 가져오기
        const recentTxns = await prisma.stampTransaction.findMany({
            where: { storeId },
            orderBy: { createdAt: "desc" },
            take: 10
        });

        const txnsWithUser = await Promise.all(recentTxns.map(async (txn) => {
            const user = await prisma.user.findUnique({
                where: { id: txn.userId },
                select: { nickname: true }
            });
            const config = await prisma.storeStampConfig.findUnique({
                where: { id: txn.configId },
                select: { cardTitle: true, cardType: true }
            });
            return {
                ...txn,
                userNickname: user?.nickname || "단골 고객",
                cardTitle: config?.cardTitle || "일반 쿠폰",
                cardType: config?.cardType || "REGULAR"
            };
        }));

        res.status(200).json({
            stats: {
                totalEarnCount,
                todayEarnCount,
                totalIssuedCoupons,
                totalUsedCoupons
            },
            recentTransactions: txnsWithUser
        });
    } catch (error) {
        console.error("Fetch host stats error:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "통계 데이터 조회 중 오류가 발생했습니다." });
    }
});

// 10. 매장 정보 업데이트 (매장 주소, 설명, 전화번호 등)
// PUT /api/stamps/owner/store-profile
router.put('/owner/store-profile', authenticateToken, async (req: any, res: any) => {
    try {
        const { storeId, name, address, phone, description } = req.body;

        if (!storeId) {
            return res.status(400).json({ error: "INVALID_INPUT", message: "매장 ID는 필수 입력 사항입니다." });
        }

        // Store 모델 업데이트
        const updatedStore = await prisma.store.update({
            where: { id: storeId },
            data: {
                name: name || undefined,
                address: address || undefined,
                phone: phone || undefined,
                longDesc: description || undefined
            }
        });

        res.status(200).json({
            message: "매장 정보가 성공적으로 업데이트되었습니다.",
            store: updatedStore
        });
    } catch (error) {
        console.error("Update store profile error:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "매장 정보 업데이트 중 오류가 발생했습니다." });
    }
});

// 11. 점주용 매장 전체 무료 쿠폰 발급/사용 리스트 조회 API
// GET /api/stamps/owner/coupons/:storeId
router.get('/owner/coupons/:storeId', authenticateToken, async (req: any, res: any) => {
    try {
        const { storeId } = req.params;

        // 해당 매장의 모든 쿠폰 조회 (최신 발행순 - 만료일이 가장 늦게 도래하는 역순 정렬)
        const coupons = await prisma.stampCoupon.findMany({
            where: { storeId },
            orderBy: { expiresAt: "desc" }
        });

        // 유저 정보 및 쿠폰 리워드명 매핑
        const couponsWithUser = await Promise.all(coupons.map(async (coupon) => {
            const user = await prisma.user.findUnique({
                where: { id: coupon.userId },
                select: { nickname: true, email: true }
            });
            let rewardDesc = "무료 혜택 무료 쿠폰";
            if (coupon.configId) {
                const config = await prisma.storeStampConfig.findUnique({
                    where: { id: coupon.configId },
                    select: { rewardDesc: true }
                });
                if (config?.rewardDesc) {
                    rewardDesc = config.rewardDesc;
                }
            }
            return {
                ...coupon,
                userNickname: user?.nickname || "단골 고객",
                userEmail: user?.email || "unknown@test.com",
                rewardDesc
            };
        }));

        res.status(200).json(couponsWithUser);
    } catch (error) {
        console.error("Fetch host coupons error:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "쿠폰 데이터 조회 중 오류가 발생했습니다." });
    }
});

// 12. 점주용 매장 전체 적립/롤백 거래 상세 이력 조회 API
// GET /api/stamps/owner/transactions/:storeId
router.get('/owner/transactions/:storeId', authenticateToken, async (req: any, res: any) => {
    try {
        const { storeId } = req.params;

        // 해당 매장의 모든 스탬프 거래 이력 조회 (최신 발생순)
        const transactions = await prisma.stampTransaction.findMany({
            where: { storeId },
            orderBy: { createdAt: "desc" }
        });

        // 유저 정보 및 정책 카드 타이틀 매핑
        const txnsWithDetails = await Promise.all(transactions.map(async (txn) => {
            const user = await prisma.user.findUnique({
                where: { id: txn.userId },
                select: { nickname: true, email: true }
            });
            const config = await prisma.storeStampConfig.findUnique({
                where: { id: txn.configId },
                select: { cardTitle: true, cardType: true }
            });
            return {
                ...txn,
                userNickname: user?.nickname || "단골 고객",
                userEmail: user?.email || "unknown@test.com",
                cardTitle: config?.cardTitle || "일반 쿠폰",
                cardType: config?.cardType || "REGULAR"
            };
        }));

        res.status(200).json(txnsWithDetails);
    } catch (error) {
        console.error("Fetch host transactions error:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "거래 이력 데이터 조회 중 오류가 발생했습니다." });
    }
});

// 13. 일반 이용자용 사용 완료/만료된 쿠폰 사용 내역 목록 조회
// GET /api/stamps/coupons/history
router.get('/coupons/history', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        
        // 사용 완료(USED) 또는 만료(EXPIRED)된 쿠폰 조회 (최근 사용/만료 순으로 정렬)
        const coupons = await prisma.stampCoupon.findMany({
            where: {
                userId,
                status: { in: ["USED", "EXPIRED"] }
            },
            orderBy: { usedAt: "desc" }
        });

        // 매장 정보 및 정책 리워드 혜택 명칭 매핑
        const couponsWithDetails = await Promise.all(coupons.map(async (coupon) => {
            const store = await prisma.store.findUnique({
                where: { id: coupon.storeId },
                select: { name: true, mainImageUrl: true }
            });
            let rewardDesc = "무료 음료 교환 혜택";
            let cardTitle = "스탬프 도장판";
            let config = null;

            if (coupon.configId) {
                config = await prisma.storeStampConfig.findUnique({
                    where: { id: coupon.configId },
                    select: { rewardDesc: true, cardTitle: true }
                });
            }

            if (!config) {
                config = await prisma.storeStampConfig.findFirst({
                    where: { storeId: coupon.storeId, isActive: true },
                    select: { rewardDesc: true, cardTitle: true }
                });
            }

            if (config) {
                rewardDesc = config.rewardDesc || rewardDesc;
                cardTitle = config.cardTitle || cardTitle;
            }

            return {
                ...coupon,
                storeName: store?.name || "알 수 없는 매장",
                storeLogo: store?.mainImageUrl || null,
                rewardDesc,
                cardTitle
            };
        }));

        res.status(200).json(couponsWithDetails);
    } catch (error) {
        console.error("Fetch coupon history error:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "쿠폰 사용 내역 조회 중 오류가 발생했습니다." });
    }
});

export default router;
