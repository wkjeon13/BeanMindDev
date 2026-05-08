import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'host10@test.com' },
        include: { stores: true }
    });
    console.dir(user, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
