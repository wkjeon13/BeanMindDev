const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  let placement = await prisma.placement.findFirst({ where: { locationKey: 'FEED_NATIVE' } });
  if (!placement) {
    placement = await prisma.placement.create({
      data: {
        name: 'CoffeeTalk Native Feed Ad',
        locationKey: 'FEED_NATIVE',
        width: 1200,
        height: 600,
        basePrice: 5000,
        isActive: true
      }
    });
    console.log('Created placement FEED_NATIVE');
  }

  let user = await prisma.user.findFirst();
  let advertiser = await prisma.advertiser.findFirst();
  if (!advertiser) {
    advertiser = await prisma.advertiser.create({
      data: {
        userId: user.id,
        companyName: 'Ad Test Co',
        contactEmail: 'adtest@example.com'
      }
    });
  }

  let contract = await prisma.contract.findFirst({ where: { advertiserId: advertiser.id } });
  if (!contract) {
      contract = await prisma.contract.create({
          data: {
              advertiserId: advertiser.id,
              status: 'ACTIVE',
              startDate: new Date(),
              endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
              totalBudget: 100000,
              type: 'CPM'
          }
      });
  }

  let campaign = await prisma.campaign.findFirst({ where: { advertiserId: advertiser.id } });
  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        advertiserId: advertiser.id,
        contractId: contract.id,
        name: 'Native Test Campaign',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        budget: 100000
      }
    });
  }

  let ad = await prisma.adCreative.findFirst({ where: { targetCountry: 'GLOBAL', placementId: placement.id } });
  if (!ad) {
    await prisma.adCreative.create({
      data: {
        campaignId: campaign.id,
        placementId: placement.id,
        title: 'Premium Coffee Beans Sale',
        type: 'IMAGE',
        size: 'MEDIUM',
        content: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=800&q=80',
        targetCountry: 'GLOBAL',
        status: 'ACTIVE',
        overlayText: '신규 가입 시 원두 50% 할인!\n지금 바로 확인하세요',
        overlayColor: '#FFFFFF',
        overlayPosition: 'BOTTOM_LEFT',
        overlayFontSize: 24,
        linkUrl: 'https://example.com'
      }
    });
    console.log('Created test native ad.');
  } else {
    console.log('Test native ad already exists.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
