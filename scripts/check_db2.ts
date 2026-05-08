import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const stores = await prisma.store.findMany({ select: { id: true, name: true, status: true, lat: true, lng: true } });
    console.log(stores);
}
main().catch(console.error).finally(() => prisma.$disconnect());
