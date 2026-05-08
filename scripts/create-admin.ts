import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

async function promoteToAdmin() {
    // Get the email from command line arguments
    const email = process.argv[2];

    if (!email) {
        console.error("Please provide the email of the user to promote.\nExample: npx tsx scripts/create-admin.ts user@example.com");
        process.exit(1);
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN' }
        });

        console.log(`Success! User ${email} has been promoted to ADMIN.`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

promoteToAdmin();
