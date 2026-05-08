import { PrismaClient } from '@prisma/client';
import { encryptPII } from '../server/utils/encryption.js';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;

if (!KAKAO_API_KEY) {
    console.error('❌ KAKAO_REST_API_KEY 환경 변수가 설정되지 않았습니다. .env 파일에 추가해주세요.');
    process.exit(1);
}

const SEARCH_KEYWORD = '싱글오리진 커피';
// 서울 지역 중심으로 검색 (강남, 마포, 성동, 종로, 용산)
const REGIONS = ['강남구', '마포구', '성동구', '종로구', '용산구'];
const MAX_PAGES = 3; // 카카오 API 검색 결과는 최대 45개 (15개씩 3페이지)

async function fetchKakaoPlaces(keyword: string, region: string) {
    const allPlaces: any[] = [];
    console.log(`\n🔍 [${region}]지역 '${keyword}' 검색 시작...`);

    for (let page = 1; page <= MAX_PAGES; page++) {
        try {
            const query = encodeURIComponent(`${region} ${keyword}`);
            const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${query}&page=${page}&size=15&category_group_code=CE7`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `KakaoAK ${KAKAO_API_KEY}`
                }
            });

            if (!response.ok) {
                console.error(`카카오 API 에러 [페이지 ${page}]: ${response.statusText}`);
                break;
            }

            const data = await response.json();
            const places = data.documents;

            if (places && places.length > 0) {
                allPlaces.push(...places);
                console.log(`   - 페이지 ${page}: ${places.length}개 매장 발견`);
            }

            // no more data
            if (data.meta.is_end) break;
            
        } catch (error) {
            console.error(`   - API 호출 실패:`, error);
            break;
        }
    }

    return allPlaces;
}

async function seedKakaoData() {
    console.log('🚀 카카오 API 싱글오리진 커피전문점 데이터 수집을 시작합니다.\n');

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
        const places = await fetchKakaoPlaces(SEARCH_KEYWORD, region);

        for (const place of places) {
            try {
                // 이미 등록된 매장인지 상호명과 위경도로 확인 (대략적인 확인)
                const existingStore = await prisma.store.findFirst({
                    where: { 
                        name: place.place_name,
                    }
                });

                if (existingStore) {
                    totalSkipped++;
                    continue; // Skip if already exists
                }

                await prisma.store.create({
                    data: {
                        ownerId: adminUser.id,
                        name: place.place_name,
                        address: encryptPII(place.road_address_name || place.address_name),
                        phone: place.phone ? encryptPII(place.phone) : null,
                        lat: parseFloat(place.y),
                        lng: parseFloat(place.x),
                        websiteUrl: place.place_url, // 카카오 상세 페이지 URL
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
                        acidity: 3, // 기본 임의값
                        sweetness: 3,
                        bitterness: 3,
                        body: 3,
                        shortDesc: '카카오 지도에서 수집된 싱글오리진 전문점 정보입니다. 매장 주인이 등록을 완료하면 더 자세한 정보가 제공됩니다.',
                    }
                });
                totalInserted++;
            } catch (error) {
                console.error(`   ⚠️ 데이터 삽입 중 오류 발생 (매장명: ${place.place_name}):`, error);
            }
        }
        
    }

    console.log('\n=============================================');
    console.log(`✅ 스크래핑 및 DB 저장 완료!`);
    console.log(`   - 새로 추가된 매장: ${totalInserted}개`);
    console.log(`   - 이미 존재하여 건너뛴 매장: ${totalSkipped}개`);
    console.log('=============================================');
}

seedKakaoData()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
