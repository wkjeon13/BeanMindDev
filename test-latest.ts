import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const posts = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log(posts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
