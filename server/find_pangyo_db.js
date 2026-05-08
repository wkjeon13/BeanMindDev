import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const stores = await prisma.store.findMany({
      where: { name: { contains: '판교역' } }
    });
    console.log(JSON.stringify(stores, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
