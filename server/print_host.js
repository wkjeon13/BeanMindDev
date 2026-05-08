import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const stores = await prisma.store.findMany({
      where: {
        name: { contains: '로스터리' } // Any shop containing Roastery
      }
    });

    stores.forEach(s => console.log(`ID: ${s.id} | Name: ${s.name} | Status: ${s.status} | CreatedAt: ${s.createdAt}`));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
