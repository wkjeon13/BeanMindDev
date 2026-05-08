import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.count();
    const stores = await prisma.store.count();
    console.log(`Users: ${users}, Stores: ${stores}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
