import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({
        select: { ownerId: true }
    });

    const ownerIds = stores.map(s => s.ownerId).filter(Boolean);
    const uniqueOwnerIds = Array.from(new Set(ownerIds));

    const result = await prisma.user.updateMany({
        where: {
            id: { in: uniqueOwnerIds as string[] },
            role: 'USER'
        },
        data: {
            role: 'OWNER'
        }
    });

    console.log(`Updated ${result.count} users to OWNER role.`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
