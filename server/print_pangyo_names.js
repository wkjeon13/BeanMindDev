import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const stores = await prisma.store.findMany({
      where: {
        OR: [
            { name: { contains: '로스터리' } },
            { name: { contains: '판교' } }
        ]
      }
    });

    stores.forEach(s => console.log(s.name + " (" + s.createdAt.toISOString() + ")"));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
