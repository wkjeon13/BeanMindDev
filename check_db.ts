import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkData() {
  console.log('--- 데이터베이스 조회 시작 ---');
  
  const user = await prisma.user.findUnique({
    where: { email: 'wkjeon@gmail.com' },
    select: { id: true, countryCode: true, nickname: true }
  });
  
  if (!user) {
    console.log('에러: wkjeon@gmail.com 유저를 찾을 수 없습니다.');
    return;
  }
  console.log('1. 유저 정보:', user);

  const countryCode = user.countryCode && user.countryCode !== 'GLOBAL' ? user.countryCode : 'US';

  // 1분 커피 탐험 (Shorts)
  const shortsCount = await prisma.post.count({
    where: {
      countryCode,
      OR: [
        { isShorts: true },
        { image: { contains: '.mp4' } },
        { image: { contains: '.mov' } },
        { image: { contains: '.webm' } }
      ]
    }
  });
  console.log(`2. [1분 커피 탐험] ${countryCode} 지역의 Shorts 피드 수:`, shortsCount);

  // 요즘 뜨는 성지 (Trending Shops)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const trendingGroups = await prisma.post.groupBy({
    by: ['storeId'],
    where: {
      countryCode,
      createdAt: { gte: threeMonthsAgo },
      storeId: { not: null },
      postType: 'NORMAL'
    },
    _count: { storeId: true },
    orderBy: { _count: { storeId: 'desc' } },
    take: 5
  });
  console.log(`3. [요즘 뜨는 성지 - 1순위] ${countryCode} 지역 최근 3개월 태그된 카페 수:`, trendingGroups.length);

  const fallbackShopsCount = await prisma.store.count({
    where: { status: 'APPROVED' }
  });
  console.log(`4. [요즘 뜨는 성지 - 2순위 (대안)] ${countryCode} 지역 전체 승인된 카페 수:`, fallbackShopsCount);

  // 우리 동네 추천 크루
  const clubsCount = await prisma.club.count({
    where: { isDeleted: false, countryCode }
  });
  console.log(`5. [우리 동네 추천 크루] ${countryCode} 지역 생성된 활성 크루 수:`, clubsCount);
  
  const clubsInLoc = await prisma.club.count({
    where: { 
        isDeleted: false, 
        countryCode,
        locationName: { contains: '성남' }
    }
  });
  console.log(`6. [우리 동네 추천 크루] 거주지역('성남' 예시)을 포함하는 크루 수:`, clubsInLoc);

  console.log('--- 데이터베이스 조회 완료 ---');
}

checkData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
