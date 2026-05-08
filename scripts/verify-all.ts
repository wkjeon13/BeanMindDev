import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

async function verifyAllUsers() {
    try {
        console.log("Verifying all users...");
        const result = await prisma.user.updateMany({
            where: { isEmailVerified: false },
            data: { isEmailVerified: true },
        });
        console.log(`Successfully verified ${result.count} users.`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

verifyAllUsers();
