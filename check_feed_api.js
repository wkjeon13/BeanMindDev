import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const posts = await prisma.post.findMany({
         where: { postType: 'ANNOUNCEMENT' },
         take: 1,
         orderBy: { createdAt: 'desc' }
    });
    console.log(posts);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
