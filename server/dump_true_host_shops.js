import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const aiOwnerId = "9994950d-bb05-489d-bca9-e9fea61933d8";
    
    // Find ALL stores not owned by the AI System account
    const stores = await prisma.store.findMany({
      where: {
        ownerId: { not: aiOwnerId }
      },
      orderBy: { createdAt: 'desc' }
    });

    const results = stores.map(s => ({
       id: s.id,
       name: s.name,
       lat: s.lat,
       lng: s.lng,
       createdAt: s.createdAt,
       shortDesc: s.shortDesc
    }));

    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
