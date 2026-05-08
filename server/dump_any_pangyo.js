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

    // Simplify output, just name, shortDesc, lat, lng, id, and whether it has a custom shortDesc
    const results = stores.map(s => ({
       id: s.id,
       name: s.name,
       lat: s.lat,
       lng: s.lng,
       createdAt: s.createdAt,
       isAI: s.shortDesc?.includes('AI 큐레이터')
    }));

    console.log("Found: " + results.length);
    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
