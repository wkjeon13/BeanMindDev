import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.post.update({
        where: { id: 'ad340961-f81a-4129-870e-6012e16b5ef0' },
        data: { attachedCourseId: 'a5e3f304-0bda-4004-8b58-350a154bef7b' }
    });
    console.log('Done');
}

main().catch(console.error).finally(() => prisma.$disconnect());
