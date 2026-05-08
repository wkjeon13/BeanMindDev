import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const stores = await prisma.store.findMany({
      where: {
        name: '로스터리 판교'
      }
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
