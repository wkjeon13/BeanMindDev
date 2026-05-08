import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const aiOwnerId = "9994950d-bb05-489d-bca9-e9fea61933d8";
    
    // Find User
    const user = await prisma.user.findUnique({
      where: {
        id: aiOwnerId
      }
    });

    console.log("System AI Owner profile:");
    console.log(JSON.stringify(user, null, 2));

    const totalStores = await prisma.store.count({
        where: { ownerId: aiOwnerId }
    });
    console.log(`\nTotal stores owned by this UUID: ${totalStores}`);

    // Fetch the 10 most recent stores by this UUID explicitly checking if ANY lack the AI string
    const nonAIStores = await prisma.store.findMany({
        where: {
            ownerId: aiOwnerId,
            NOT: {
                shortDesc: { contains: 'AI 큐레이터' }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    console.log("\nRecent stores by this UUID WITHOUT AI description:");
    console.log(JSON.stringify(nonAIStores.map(s => ({ id: s.id, name: s.name, shortDesc: s.shortDesc, createdAt: s.createdAt })), null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
