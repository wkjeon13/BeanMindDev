import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const posts = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { content: true, image: true, createdAt: true }
    });
    console.log(JSON.stringify(posts, null, 2));
}
run();
