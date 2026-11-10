import { GoogleGenAI } from '@google/genai';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma.js';

const STATE_FILE = path.join(process.cwd(), 'data', 'agentState.json');
const LOGS_FILE = path.join(process.cwd(), 'data', 'agentLogs.json');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'community');

// Predefined BGM Themes matching CoffeeTalk.tsx
const BGM_THEMES = [
    { title: '바흐 골드베르크 아리아 커피 피아노', videoId: 'tN9ecELJ5A0', theme: 'GRADIENT_ESPRESSO' },
    { title: '고요한 카페 재즈 피아노 연주', videoId: '5r3t0xK5Mhk', theme: 'WARM_LATTE' },
    { title: '베토벤 월광 고요한 밤 피아노', videoId: 'Dx5qFeM4yMc', theme: 'NIGHT_ROAST' },
    { title: 'Lofi Hip Hop Radio - Beats to Relax/Study to', videoId: '5qap5aO4i9A', theme: 'COFFEE_CREMA' },
    { title: '비오는 날 잔잔한 어쿠스틱', videoId: '811QZGDysx0', theme: 'DEEP_FOREST' },
    { title: '오후의 나른하고 편안한 보사노바', videoId: 'jfKfPfyJRdk', theme: 'WARM_LATTE' },
    { title: '에릭 사티 짐노페디 1번 힐링 건반', videoId: '57GfJ1A5e68', theme: 'GRADIENT_ESPRESSO' },
    { title: '힙합 시티팝 인스트루멘탈', videoId: 'mnd7nUqM5v0', theme: 'NIGHT_ROAST' }
];

// Fallback high-quality specialty coffee & dessert images
const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',
    'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80'
];

// Curated Specialty Coffee & Dessert Menus for Stores with incomplete profile data
const CURATED_COFFEES = [
    '에티오피아 예가체프 G1 워시드 핸드드립',
    '콜롬비아 엘 파라이소 리치 피치 더블무산소 드립',
    '과테말라 안티구아 라 폴리아 싱글오리진 핸드드립',
    '파나마 에스메랄다 게이샤 스페셜티 드립',
    '케냐 AA 키린야가 핸드드립',
    '시그니처 플랫화이트 & 크림라떼',
    '코스타리카 따라주 화이트 허니 드립',
    '인도네시아 만델링 G1 다크로스팅'
];

const CURATED_DESSERTS = [
    '클래식 골든 버터 휘낭시에',
    '수제 바스크 치즈케이크',
    '다크 초콜릿 피칸 르뱅 쿠키',
    '얼그레이 스콘 & 클로티드 크림',
    '바닐라 빈 럼 까눌레',
    '제주 말차 테린느',
    '클래식 티라미수'
];

export interface AgentLogEntry {
    id: string;
    timestamp: string;
    userEmail: string;
    userNickname: string;
    userRole: string;
    storeName: string;
    coffeeMenu: string;
    pairingDessert: string;
    stampsEarned: number;
    totalStamps: number;
    couponIssued: boolean;
    couponCode?: string;
    postType: 'NORMAL' | 'SHORTS';
    shortsCategory?: string;
    postId: string;
    contentPreview: string;
    imageUrl: string;
    bgmTitle: string;
    status: 'SUCCESS' | 'FAILED';
    error?: string;
}

export interface AgentState {
    isRunning: boolean;
    intervalHours: number;
    lastRun: string | null;
    nextRun: string | null;
    currentAccountIndex: number;
    stats: {
        totalFeeds: number;
        totalShorts: number;
        totalStamps: number;
        totalCoupons: number;
    };
}

class AutoFeedAgent {
    private cronTask: cron.ScheduledTask | null = null;
    private ai: GoogleGenAI;
    private state: AgentState;
    private logs: AgentLogEntry[] = [];
    private isExecuting: boolean = false;

    // 24 Accounts pool requested by user
    private readonly accounts: string[] = [
        ...Array.from({ length: 14 }, (_, i) => `user${i + 1}@test.com`),
        ...Array.from({ length: 10 }, (_, i) => `host${i + 1}@test.com`)
    ];

    constructor() {
        this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        this.ensureDirectories();
        this.state = this.loadState();
        this.logs = this.loadLogs();

        // Restore scheduler if previously running
        if (this.state.isRunning) {
            this.startScheduler();
        }
    }

    private ensureDirectories() {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    private loadState(): AgentState {
        try {
            if (fs.existsSync(STATE_FILE)) {
                return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
            }
        } catch (e) {
            console.error('[AutoFeedAgent] Failed to load state:', e);
        }
        return {
            isRunning: false,
            intervalHours: 1,
            lastRun: null,
            nextRun: null,
            currentAccountIndex: 0,
            stats: {
                totalFeeds: 0,
                totalShorts: 0,
                totalStamps: 0,
                totalCoupons: 0
            }
        };
    }

    private saveState() {
        try {
            fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
        } catch (e) {
            console.error('[AutoFeedAgent] Failed to save state:', e);
        }
    }

    private loadLogs(): AgentLogEntry[] {
        try {
            if (fs.existsSync(LOGS_FILE)) {
                return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
            }
        } catch (e) {
            console.error('[AutoFeedAgent] Failed to load logs:', e);
        }
        return [];
    }

    private saveLogs() {
        try {
            // Keep last 100 entries
            const trimmed = this.logs.slice(0, 100);
            fs.writeFileSync(LOGS_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
        } catch (e) {
            console.error('[AutoFeedAgent] Failed to save logs:', e);
        }
    }

    public getStatus() {
        return {
            ...this.state,
            isExecuting: this.isExecuting,
            recentLogs: this.logs.slice(0, 20)
        };
    }

    public getLogs(limit: number = 50) {
        return this.logs.slice(0, limit);
    }

    public startScheduler() {
        if (this.cronTask) {
            this.cronTask.stop();
        }

        // Run at minute 0 of every hour ('0 * * * *')
        this.cronTask = cron.schedule('0 * * * *', async () => {
            console.log('[AutoFeedAgent] Hourly scheduled trigger activated');
            await this.executeCycle();
        });

        this.state.isRunning = true;
        const next = new Date();
        next.setHours(next.getHours() + 1, 0, 0, 0);
        this.state.nextRun = next.toISOString();
        this.saveState();
        console.log('[AutoFeedAgent] Scheduler started. Next run:', this.state.nextRun);
    }

    public stopScheduler() {
        if (this.cronTask) {
            this.cronTask.stop();
            this.cronTask = null;
        }
        this.state.isRunning = false;
        this.state.nextRun = null;
        this.saveState();
        console.log('[AutoFeedAgent] Scheduler stopped');
    }

    public async toggle(): Promise<boolean> {
        if (this.state.isRunning) {
            this.stopScheduler();
            return false;
        } else {
            this.startScheduler();
            return true;
        }
    }

    public async triggerNow(): Promise<AgentLogEntry> {
        console.log('[AutoFeedAgent] Manual trigger requested');
        return await this.executeCycle();
    }

    /**
     * Executes one full automated cycle:
     * 1. Rotate account (login session)
     * 2. Pick random Store & Menu/Pairing
     * 3. Simulate QR scan & stamp accumulation
     * 4. AI Content Generation (Gemini)
     * 5. AI Image Generation (Imagen 3)
     * 6. Feed publication
     * 7. Session termination (logout)
     */
    public async executeCycle(): Promise<AgentLogEntry> {
        if (this.isExecuting) {
            throw new Error('Agent is already running an active cycle. Please wait.');
        }

        this.isExecuting = true;
        const entryId = uuidv4();
        const now = new Date();

        try {
            // 1. Account Rotation
            const email = this.accounts[this.state.currentAccountIndex % this.accounts.length];
            this.state.currentAccountIndex = (this.state.currentAccountIndex + 1) % this.accounts.length;

            const user = await prisma.user.findUnique({
                where: { email },
                select: { id: true, email: true, nickname: true, role: true }
            });

            if (!user) {
                throw new Error(`Target test user ${email} not found in database.`);
            }

            // Simulate Session Login Access Log
            await prisma.userAccessLog.create({
                data: {
                    userId: user.id,
                    email: user.email,
                    ipAddress: '127.0.0.1',
                    userAgent: 'BeanMind-AutoAgent/1.0 (Automated Persona)',
                    deviceOS: 'Agent',
                    pagePath: '/login',
                    actionType: 'LOGIN'
                }
            }).catch(() => {});

            // 2. Select Random Active Coffee Specialty Store from DB
            const storesCount = await prisma.store.count();
            if (storesCount === 0) {
                throw new Error('No stores available in database.');
            }

            const randomSkip = Math.floor(Math.random() * storesCount);
            const store = await prisma.store.findFirst({
                skip: randomSkip,
                select: {
                    id: true,
                    name: true,
                    address: true,
                    signatureMenu: true,
                    dessertPairing: true,
                    signatureBean: true,
                    equipment: true,
                    lat: true,
                    lng: true,
                    ownerId: true
                }
            });

            if (!store) {
                throw new Error('Failed to retrieve random store from database.');
            }

            // Sanitize store signature menu and pairing dessert
            let coffeeMenu = store.signatureMenu?.trim() || '';
            if (!coffeeMenu || coffeeMenu.includes('미정') || coffeeMenu.includes('없음') || coffeeMenu.length < 3) {
                coffeeMenu = CURATED_COFFEES[Math.floor(Math.random() * CURATED_COFFEES.length)];
            }

            let pairingDessert = store.dessertPairing?.trim() || '';
            if (!pairingDessert || pairingDessert.includes('미정') || pairingDessert.includes('없음') || pairingDessert.length < 3) {
                pairingDessert = CURATED_DESSERTS[Math.floor(Math.random() * CURATED_DESSERTS.length)];
            }

            // 3. QR Code Scan & Stamp / Coupon Simulation
            // Ensure Stamp Config exists for this store
            let stampConfig = await prisma.storeStampConfig.findFirst({
                where: { storeId: store.id, isActive: true }
            });

            if (!stampConfig) {
                stampConfig = await prisma.storeStampConfig.create({
                    data: {
                        storeId: store.id,
                        cardType: 'REGULAR',
                        cardTitle: `${store.name} 단골 적립 카드`,
                        maxStamps: 10,
                        targetMenu: '전체 제조 음료 및 페어링 디저트',
                        rewardDesc: `${coffeeMenu} 1잔 무료 쿠폰`,
                        validDays: 90,
                        isActive: true
                    }
                });
            }

            // Earn stamps for Coffee + Pairing purchase (2 stamps)
            const earnAmount = 2;
            let couponIssued = false;
            let issuedCouponCode: string | undefined;

            const stampResult = await prisma.$transaction(async (tx) => {
                let card = await tx.userStampCard.findUnique({
                    where: { userId_configId: { userId: user.id, configId: stampConfig!.id } }
                });

                if (!card) {
                    card = await tx.userStampCard.create({
                        data: {
                            userId: user.id,
                            storeId: store.id,
                            configId: stampConfig!.id,
                            currentStamps: 0,
                            completedCount: 0
                        }
                    });
                }

                let newStamps = card.currentStamps + earnAmount;
                let newCompleted = card.completedCount;
                const maxStamps = stampConfig!.maxStamps;

                if (newStamps >= maxStamps) {
                    newStamps -= maxStamps;
                    newCompleted += 1;
                    couponIssued = true;
                    issuedCouponCode = `STAMP-${uuidv4().substring(0, 8).toUpperCase()}`;

                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + stampConfig!.validDays);

                    await tx.stampCoupon.create({
                        data: {
                            userId: user.id,
                            storeId: store.id,
                            configId: stampConfig!.id,
                            couponCode: issuedCouponCode,
                            status: 'UNUSED',
                            expiresAt
                        }
                    });
                }

                const updatedCard = await tx.userStampCard.update({
                    where: { id: card.id },
                    data: {
                        currentStamps: newStamps,
                        completedCount: newCompleted
                    }
                });

                await tx.stampTransaction.create({
                    data: {
                        userId: user.id,
                        storeId: store.id,
                        configId: stampConfig!.id,
                        amount: earnAmount,
                        txnType: 'EARN',
                        itemsEarned: JSON.stringify({
                            coffee: coffeeMenu,
                            pairing: pairingDessert
                        })
                    }
                });

                return updatedCard;
            });

            // 4. AI Content Generation via Gemini 2.5 Flash
            // 50% chance between Normal Feed vs Shorts/ASMR
            const isShorts = Math.random() >= 0.5;
            const postType: 'NORMAL' | 'SHORTS' = isShorts ? 'SHORTS' : 'NORMAL';
            const shortsCategory = isShorts ? (Math.random() > 0.5 ? 'ASMR' : 'BREWING') : undefined;

            const bgmItem = BGM_THEMES[Math.floor(Math.random() * BGM_THEMES.length)];

            const prompt = `
당신은 스페셜티 커피를 깊이 사랑하는 대한민국 커피 애호가/바리스타 커뮤니티 유저 '${user.nickname}'입니다.
오늘 당신은 실제 커피 전문점 '${store.name}'(${store.address})에 방문하여 다음 메뉴를 즐겼습니다:
- 커피 메뉴: ${coffeeMenu}
- 페어링 디저트: ${pairingDessert}
- 매장 사장님이 QR 코드를 스캔하여 단골 스탬프 2개를 적립해 주었습니다. ${couponIssued ? '(축하: 10개 도장을 모두 채워 무료 음료 쿠폰이 발급되었습니다!)' : ''}

작성할 피드 유형: ${isShorts ? '커피 숏폼 / 감성 ASMR' : '일반 커피톡 방문 및 테이스팅 후기'}
${isShorts ? '- 소리와 시각적 감각(원두 그라인딩 소리, 물줄기 떨어지는 소리, 크레마 텍스처, 디저트의 달콤한 향)을 생생하게 묘사하는 ASMR 감성 텍스트' : '- 커피의 맛과 향, 페어링 디저트의 조화로움, 매장 분위기, 스탬프 적립의 즐거움을 전하는 매력적인 후기'}

다음 JSON 형식으로만 응답하세요 (마크다운 백틱 없이 순수 JSON만 반환):
{
  "content": "작성할 게시물 한국어 본문 (자연스럽고 매력적인 3~5문장, 이모지 포함)",
  "taggedBean": "${store.signatureBean || '에티오피아 예가체프 G1 워시드'}",
  "equipmentTag": "${store.equipment || '하리오 V60 드리퍼'}",
  "acidity": ${Math.floor(Math.random() * 3) + 2},
  "sweetness": ${Math.floor(Math.random() * 3) + 3},
  "body": ${Math.floor(Math.random() * 3) + 3},
  "bitterness": ${Math.floor(Math.random() * 3) + 1},
  "aroma": ${Math.floor(Math.random() * 2) + 4},
  "imagePrompt": "영어 프롬프트: ${coffeeMenu} and ${pairingDessert} on a warm cafe wooden table at ${store.name}, cinematic lighting, photorealistic 8k shallow depth of field"
}
`;

            let generatedContent = '';
            let imagePrompt = `Award-winning coffee photography of ${coffeeMenu} and ${pairingDessert} in a cozy specialty cafe, warm ambient light, high quality 8k`;
            let acidity = 4;
            let sweetness = 4;
            let body = 3;
            let bitterness = 2;
            let aroma = 5;
            let taggedBean = store.signatureBean || '에티오피아 게이샤 워시드';
            let equipmentTag = store.equipment || '하리오 V60';

            try {
                const aiResponse = await this.ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt
                });

                const rawText = aiResponse.text?.trim() || '';
                const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanJson);

                generatedContent = parsed.content || `${store.name}에서 즐긴 ${coffeeMenu}와 ${pairingDessert}! 너무 만족스러운 시간이었습니다.`;
                if (parsed.imagePrompt) imagePrompt = parsed.imagePrompt;
                if (parsed.acidity) acidity = parsed.acidity;
                if (parsed.sweetness) sweetness = parsed.sweetness;
                if (parsed.body) body = parsed.body;
                if (parsed.bitterness) bitterness = parsed.bitterness;
                if (parsed.aroma) aroma = parsed.aroma;
                if (parsed.taggedBean) taggedBean = parsed.taggedBean;
                if (parsed.equipmentTag) equipmentTag = parsed.equipmentTag;
            } catch (aiErr) {
                console.warn('[AutoFeedAgent] Gemini content generation fallback:', aiErr);
                const fallbackTemplates = isShorts ? [
                    `오늘 ${store.name}에서 경험한 ${coffeeMenu} & ${pairingDessert} ASMR 모먼트 ☕️✨\n원두를 그라인딩할 때 퍼지는 화사한 꽃향기와 정갈한 물줄기 소리, 그리고 겉바속촉 ${pairingDessert} 한 입의 달콤함까지... 오감이 차분해지는 힐링 타임이었습니다.\n매장 사장님이 QR로 스탬프도 2개 적립해 주셔서 더 기분 좋은 여운이 남네요! 🎶`,
                    `차분한 음악과 함께 흐르는 ${store.name}의 커피 브루잉 사운드 🎧\n주문한 ${coffeeMenu}의 깊은 크레마와 달콤한 ${pairingDessert}의 페어링이 완벽했습니다. 한 방울 한 방울 정성스럽게 추출되는 커피 소리에 마음까지 편안해집니다. 사장님 QR 스탬프 2개 적립 완료! ☕💛`,
                    `감성 가득한 ${store.name}의 ${coffeeMenu} 테이스팅 ASMR 🌿\n풍부한 산미와 달콤한 피니시, 바삭하고 촉촉한 ${pairingDessert}의 조화! 친절한 Host QR 스탬프 적립 덕분에 오늘도 단골 게이지 충전 완료입니다.`
                ] : [
                    `오늘 ${store.name}에 들러서 시그니처인 ${coffeeMenu}와 ${pairingDessert} 페어링을 맛보고 왔어요! ☕️✨\n첫 모금에서 느껴지는 화사한 향미와 깔끔한 애프터테이스트, 그리고 디저트의 달콤함이 완벽한 조화를 이룹니다. 매장 분위기도 너무 아늑하고 사장님이 QR 코드로 스탬프 2개도 꼼꼼히 적립해 주셔서 기분 좋은 하루였습니다! 강력 추천해요. 👍`,
                    `스페셜티 커피 러버라면 꼭 들러봐야 할 ${store.name} 방문기 🌿\n추천받은 ${coffeeMenu}를 핸드드립으로 마셨는데 밸런스가 정말 훌륭하네요. 곁들인 ${pairingDessert}와의 마리아주도 환상적입니다. Host QR 스탬프 2개 적립하고 나니 어느덧 쿠폰 달성이 눈앞이네요! ☕`,
                    `동네 숨은 보석 같은 커피 전문점, ${store.name} 다녀왔습니다 ✨\n정성스레 내어주신 ${coffeeMenu}와 갓 구운 ${pairingDessert}의 향에 반했습니다. 사장님이 친절하게 QR 코드로 적립도 도와주셔서 단골 확정! 다음엔 다른 원두도 맛보러 와야겠어요.`
                ];
                generatedContent = fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)];
            }

            // Append BGM and Background Theme tags
            generatedContent += `\n<!--BM_BGM:${JSON.stringify({ title: bgmItem.title, videoId: bgmItem.videoId })}-->`;
            generatedContent += `\n<!--BM_BG:${bgmItem.theme}-->`;

            // 5. AI Image Generation via Google Imagen 3
            let imageUrl: string = '';
            try {
                const imageRes = await this.ai.models.generateImages({
                    model: 'imagen-3.0-generate-002',
                    prompt: imagePrompt,
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/jpeg',
                        aspectRatio: isShorts ? '9:16' : '1:1'
                    }
                });

                const imageBytes = imageRes.generatedImages?.[0]?.image?.imageBytes;
                if (imageBytes) {
                    const filename = `ai-agent-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
                    const filePath = path.join(UPLOAD_DIR, filename);
                    fs.writeFileSync(filePath, Buffer.from(imageBytes, 'base64'));
                    imageUrl = `/uploads/community/${filename}`;
                    console.log('[AutoFeedAgent] Imagen 3 generated successfully:', imageUrl);
                }
            } catch (imgErr: any) {
                console.warn('[AutoFeedAgent] Imagen 3 rate limit or error, using curated coffee fallback:', imgErr.message || imgErr);
                imageUrl = FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
            }

            if (!imageUrl) {
                imageUrl = FALLBACK_IMAGES[0];
            }

            // 6. Create Post in Database
            const post = await prisma.post.create({
                data: {
                    authorId: user.id,
                    countryCode: 'KR',
                    content: generatedContent,
                    image: JSON.stringify([imageUrl]),
                    cafeName: store.name,
                    cafeLocation: store.address,
                    cafeLat: store.lat,
                    cafeLng: store.lng,
                    acidity,
                    sweetness,
                    body,
                    bitterness,
                    aroma,
                    taggedBean,
                    equipmentTag,
                    storeId: store.id,
                    postType: 'NORMAL',
                    isShorts,
                    shortsCategory
                }
            });

            // 7. Session Logout Access Log
            await prisma.userAccessLog.create({
                data: {
                    userId: user.id,
                    email: user.email,
                    ipAddress: '127.0.0.1',
                    userAgent: 'BeanMind-AutoAgent/1.0 (Automated Persona)',
                    deviceOS: 'Agent',
                    pagePath: '/logout',
                    actionType: 'LOGOUT'
                }
            }).catch(() => {});

            // 8. Update State and Logs
            this.state.lastRun = now.toISOString();
            if (this.state.isRunning) {
                const next = new Date();
                next.setHours(next.getHours() + 1, 0, 0, 0);
                this.state.nextRun = next.toISOString();
            }

            this.state.stats.totalFeeds += 1;
            if (isShorts) this.state.stats.totalShorts += 1;
            this.state.stats.totalStamps += earnAmount;
            if (couponIssued) this.state.stats.totalCoupons += 1;
            this.saveState();

            const logEntry: AgentLogEntry = {
                id: entryId,
                timestamp: now.toISOString(),
                userEmail: user.email,
                userNickname: user.nickname,
                userRole: user.role,
                storeName: store.name,
                coffeeMenu,
                pairingDessert,
                stampsEarned: earnAmount,
                totalStamps: stampResult.currentStamps,
                couponIssued,
                couponCode: issuedCouponCode,
                postType,
                shortsCategory,
                postId: post.id,
                contentPreview: generatedContent.replace(/<!--[\s\S]*?-->/g, '').trim().substring(0, 80) + '...',
                imageUrl,
                bgmTitle: bgmItem.title,
                status: 'SUCCESS'
            };

            this.logs.unshift(logEntry);
            this.saveLogs();

            console.log(`[AutoFeedAgent] Cycle completed successfully. User: ${user.nickname}, Store: ${store.name}, Post: ${post.id}`);
            return logEntry;

        } catch (error: any) {
            console.error('[AutoFeedAgent] Cycle error:', error);
            const failEntry: AgentLogEntry = {
                id: entryId,
                timestamp: now.toISOString(),
                userEmail: 'system@agent.local',
                userNickname: 'AutoAgent',
                userRole: 'SYSTEM',
                storeName: '-',
                coffeeMenu: '-',
                pairingDessert: '-',
                stampsEarned: 0,
                totalStamps: 0,
                couponIssued: false,
                postType: 'NORMAL',
                postId: '',
                contentPreview: '실행 중 오류 발생',
                imageUrl: '',
                bgmTitle: '-',
                status: 'FAILED',
                error: error.message || 'Unknown error'
            };
            this.logs.unshift(failEntry);
            this.saveLogs();
            throw error;
        } finally {
            this.isExecuting = false;
        }
    }
}

export const autoFeedAgent = new AutoFeedAgent();
