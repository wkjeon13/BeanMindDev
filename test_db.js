import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({ 
    where: { image: { not: null } }, 
    select: { id: true, image: true },
    orderBy: { createdAt: 'desc' }
  });
  
  posts.forEach(p => {
    console.log(`[${p.id}] ${p.image}`);
  });
  await prisma.$disconnect();
}

main().catch(console.error);
