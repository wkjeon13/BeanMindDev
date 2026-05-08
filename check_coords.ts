import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({
        take: 10,
        select: { id: true, name: true, lat: true, lng: true }
    });
    console.log(stores);
}
main().finally(() => prisma.$disconnect());
