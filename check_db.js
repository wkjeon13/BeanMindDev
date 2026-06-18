import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const nullTypeStores = await prisma.store.findMany({
        where: { primaryCoffeeType: null }
    });
    console.log("=== NULL TYPE STORES ===");
    console.log(nullTypeStores.map(s => ({ id: s.id, name: s.name })));
}
main().catch(console.error).finally(() => prisma.$disconnect());



