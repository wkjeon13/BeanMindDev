import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const stores = await prisma.store.findMany({
      where: {
        createdAt: { gte: today }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    // Print without base64 to save space
    const cleanStores = stores.map(s => {
        const { markerImageUrl, mainImageUrl, ...rest } = s;
        return rest;
    });
    console.log(JSON.stringify(cleanStores, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
