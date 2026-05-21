import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        select: { id: true, role: true, email: true },
        orderBy: { createdAt: 'desc' }
    });
    console.log(user);

    const users = await prisma.user.findMany({ select: { role: true, id: true } });
    console.log(users);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
