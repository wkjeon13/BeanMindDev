import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const q = '판교역';
    const stores = await prisma.store.findMany({
      where: {
        OR: [
            { name: { contains: q } },
            { signatureBean: { contains: q } }
        ]
      }
    });
    console.log("Hits:", stores.length);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
