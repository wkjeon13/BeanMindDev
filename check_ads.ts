import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAds() {
    const ads = await prisma.adCreative.findMany({
        where: { type: 'VIDEO' }
    });
    console.log(JSON.stringify(ads, null, 2));
}

checkAds()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
