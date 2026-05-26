import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const posts = await prisma.post.findMany({
        where: { attachedCourseId: { not: null } },
        include: { attachedCourse: true }
    });
    console.log(posts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
