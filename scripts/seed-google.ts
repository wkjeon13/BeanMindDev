import { PrismaClient } from '@prisma/client';
import { encryptPII } from '../server/utils/encryption.js';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY 또는 GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. .env 파일에 추가해주세요.');
    process.exit(1);
}

const SEARCH_KEYWORD = '싱글오리진 커피';
// 서울 지역 중심으로 검색
const REGIONS = ['강남구', '마포구', '성동구', '종로구', '용산구'];

async function fetchGooglePlaces(keyword: string, region: string) {
    const allPlaces: any[] = [];
    console.log(`\n🔍 [${region}]지역 '${keyword}' Google Places API (New) 검색 시작...`);

    try {
        const query = `${region} ${keyword}`;
        const url = `https://places.googleapis.com/v1/places:searchText`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_API_KEY as string,
                'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.websiteUri'
            },
            body: JSON.stringify({
                textQuery: query,
                languageCode: 'ko'
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error(`Google API 에러 (${data.error?.status}): ${data.error?.message}`);
            return allPlaces;
        }

        const places = data.places || [];

        if (places && places.length > 0) {
            allPlaces.push(...places);
            console.log(`   - ${places.length}개 매장 발견`);
        } else {
            console.log(`   - 검색 결과 없음`);
        }
        
    } catch (error) {
        console.error(`   - API 호출 실패:`, error);
    }

    return allPlaces;
}

async function seedGoogleData() {
    console.log('🚀 구글 Places API (New) 싱글오리진 커피전문점 데이터 수집을 시작합니다.\n');

    let totalInserted = 0;
    let totalSkipped = 0;

    // 1. 시스템 어드민 계정 찾기 (없으면 임시 생성)
    let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
        adminUser = await prisma.user.create({
            data: {
                email: 'admin_seed@beanmind.com',
                nickname: 'System Admin',
                role: 'ADMIN',
                status: 'ACTIVE',
            }
        });
    }

    for (const region of REGIONS) {
        const places = await fetchGooglePlaces(SEARCH_KEYWORD, region);

        for (const place of places) {
            try {
                const name = place.displayName?.text || '이름 없음';
                
                // 이미 등록된 매장인지 상호명으로 확인
                const existingStore = await prisma.store.findFirst({
                    where: { name }
                });

                if (existingStore) {
                    totalSkipped++;
                    continue; 
                }

                await prisma.store.create({
                    data: {
                        ownerId: adminUser.id,
                        name: name,
                        address: encryptPII(place.formattedAddress || '주소 없음'),
                        phone: place.nationalPhoneNumber ? encryptPII(place.nationalPhoneNumber) : null,
                        lat: place.location?.latitude || null,
                        lng: place.location?.longitude || null,
                        websiteUrl: place.websiteUri || null, 
                        primaryCoffeeType: 'SINGLE_ORIGIN',
                        status: 'APPROVED',
                        hours: '09:00 - 18:00',
                        longDesc: '',
                        signatureBean: '싱글오리진 커피를 전문으로 취급합니다.',
                        equipment: '',
                        signatureMenu: '',
                        dessertPairing: '',
                        hasDecaf: false,
                        hasOatMilk: false,
                        acidity: 3, 
                        sweetness: 3,
                        bitterness: 3,
                        body: 3,
                        shortDesc: '구글 지도에서 수집된 싱글오리진 전문점 정보입니다. 매장 주인이 등록을 완료하면 더 자세한 정보가 제공됩니다.',
                    }
                });
                totalInserted++;
            } catch (error) {
                console.error(`   ⚠️ 데이터 삽입 중 오류 발생 (매장명: ${place.displayName?.text}):`, error);
            }
        }
        
    }

    console.log('\n=============================================');
    console.log(`✅ 구글 스크래핑 및 DB 저장 완료!`);
    console.log(`   - 새로 추가된 매장: ${totalInserted}개`);
    console.log(`   - 이미 존재하여 건너뛴 매장: ${totalSkipped}개`);
    console.log('=============================================');
}

seedGoogleData()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
