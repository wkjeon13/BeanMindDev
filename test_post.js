import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkLatestPost() {
    const post = await prisma.post.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { nickname: true } } }
    });
    console.log("Latest Post Type:", post?.postType);
    console.log("Latest Post Content:", post?.content);
    console.log("Latest Post Author:", post?.author?.nickname);
}

checkLatestPost().catch(console.error).finally(()=>prisma.$disconnect());
