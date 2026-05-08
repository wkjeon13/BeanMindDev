import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const stores = await prisma.store.findMany({
      where: {
        NOT: {
            shortDesc: { contains: 'AI 큐레이터가 발굴한' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log(JSON.stringify(stores, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
