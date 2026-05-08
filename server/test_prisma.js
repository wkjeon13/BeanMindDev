import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2
    });
    console.log(JSON.stringify(stores, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
