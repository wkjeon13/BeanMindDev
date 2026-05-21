import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({
        include: { owner: { select: { role: true, email: true } } }
    });
    console.log(`Total stores: ${stores.length}`);
    stores.forEach(s => {
        console.log(`Store: ${s.name}, Owner Role: ${s.owner?.role}, Owner Email: ${s.owner?.email}`);
    });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
