import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { id: "012bd6fb-8be9-4bb0-ad5c-432862124b1e" }
    });
    console.log("User Role:", user.role);
}
main().catch(console.error).finally(() => prisma.$disconnect());
