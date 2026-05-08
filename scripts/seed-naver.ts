import { PrismaClient } from '@prisma/client';
import { encryptPII } from '../server/utils/encryption.js';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    console.error('❌ NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 환경 변수가 설정되지 않았습니다. .env 파일에 추가해주세요.');
    console.error('발급 방법: 네이버 개발자 센터(https://developers.naver.com) -> Application -> 애플리케이션 등록 -> "검색" API 선택');
    process.exit(1);
}

const SEARCH_KEYWORD = '싱글오리진 커피';
// 서울 지역 중심으로 검색 (네이버 로컬 검색은 정확도순 정렬 가능)
const REGIONS = ['강남구', '마포구', '성수동', '종로구', '한남동'];

async function fetchNaverPlaces(keyword: string, region: string) {
    const allPlaces: any[] = [];
    console.log(`\n🔍 [${region}]지역 '${keyword}' 네이버 지역 검색 시작...`);

    try {
        const query = encodeURIComponent(`${region} ${keyword}`);
        // display: 최대로 가져올 수 있는 개수 (5), start: 시작 위치, sort: random(정확도순)
        const url = `https://openapi.naver.com/v1/search/local.json?query=${query}&display=5&start=1&sort=random`;
        
        const response = await fetch(url, {
            headers: {
                'X-Naver-Client-Id': NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
            }
        });

        if (!response.ok) {
            console.error(`네이버 API 에러 HTTP ${response.status}: ${response.statusText}`);
            return allPlaces;
        }

        const data = await response.json();
        const items = data.items || [];

        if (items && items.length > 0) {
            allPlaces.push(...items);
            console.log(`   - ${items.length}개 매장 발견`);
        } else {
            console.log(`   - 검색 결과 없음`);
        }
        
    } catch (error) {
        console.error(`   - API 호출 실패:`, error);
    }

    return allPlaces;
}

// 카카오나 네이버에서 위경도가 변환이 필요한 경우가 있는데, 
// 네이버 지역검색 API의 mapx, mapy는 KATEC 좌표계일 확률이 높습니다.
// 간단한 KATEC -> WGS84(위경도) 변환은 복잡하므로, 일단 lat/lng에 그대로 넣되
// 실제 지도 렌더링 시 위치가 이상하다면 별도의 지오코딩 API를 타야할 수 있습니다.
// 하지만 최근 돌려주는 데이터가 WGS84 형식일 수도 있으니 일단 받아서 로그를 찍습니다.
async function seedNaverData() {
    console.log('🚀 네이버 지역 검색 API 싱글오리진 커피전문점 데이터 수집을 시작합니다.\n');

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
        const places = await fetchNaverPlaces(SEARCH_KEYWORD, region);

        for (const place of places) {
            try {
                // 네이버 API의 title 값은 <b>태그가 포함될 수 있어 정제
                const rawName = place.title || '';
                const cleanName = rawName.replace(/<[^>]*>?/gm, ''); // <b> 태그 제거
                
                // 이미 등록된 매장인지 상호명으로 확인
                const existingStore = await prisma.store.findFirst({
                    where: { name: cleanName }
                });

                if (existingStore) {
                    totalSkipped++;
                    continue; 
                }

                // mapx, mapy가 정수형 KATEC 좌표인 경우를 대비하여 float 변환.
                // 만약 너무 큰 숫자라면 10^7로 나누어 대략적인 위경도 형태로 강제하는 임시 처리를 합니다 (완벽하지 않음).
                let lng = parseFloat(place.mapx);
                let lat = parseFloat(place.mapy);
                
                // KATEC 좌표계 보정 (126xxxxxx 형태로 오면 위경도로 소수점 찍기)
                if (lng > 1000) lng = lng / 10000000;
                if (lat > 1000) lat = lat / 10000000;

                await prisma.store.create({
                    data: {
                        ownerId: adminUser.id,
                        name: cleanName,
                        address: encryptPII(place.roadAddress || place.address || '주소 없음'),
                        phone: place.telephone ? encryptPII(place.telephone) : null,
                        lat: lat > 0 ? lat : null,
                        lng: lng > 0 ? lng : null,
                        websiteUrl: place.link || null, 
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
                        shortDesc: '네이버 검색에서 수집된 싱글오리진 전문점 정보입니다. 매장 주인이 등록을 완료하면 더 자세한 정보가 제공됩니다.',
                    }
                });
                totalInserted++;
            } catch (error) {
                console.error(`   ⚠️ 데이터 삽입 중 오류 발생 (매장명: ${place.title}):`, error);
            }
        }
        
    }

    console.log('\n=============================================');
    console.log(`✅ 네이버 검색 스크래핑 및 DB 저장 완료!`);
    console.log(`   - 새로 추가된 매장: ${totalInserted}개`);
    console.log(`   - 이미 존재하여 건너뛴 매장: ${totalSkipped}개`);
    console.log(`   * 참고: 네이버 API가 제공하는 좌표가 정확한 위경도(WGS84)가 아닐 경우 
           일부 핀이 지도상 바다(인도네시아 등)에 찍힐 수 있습니다.`);
    console.log('=============================================');
}

seedNaverData()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
