import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const posts = await prisma.post.findMany({
        where: { postType: 'ANNOUNCEMENT' },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log("Found Announcements:", posts.length);
    if(posts.length > 0) {
        console.log(posts[0]);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
