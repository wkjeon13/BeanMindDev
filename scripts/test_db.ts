import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const posts = await prisma.post.findMany({
        take: 5,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: { store: true }
    });
    
    console.log(JSON.stringify(posts, null, 2));
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
