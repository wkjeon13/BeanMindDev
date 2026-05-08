import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log("Creating 5 test host accounts...");

    for (let i = 1; i <= 5; i++) {
        const email = `host${i}@test.com`;
        const nickname = `테스트사장님${i}`;
        const password = await bcrypt.hash('12345678', 10);

        try {
            const user = await prisma.user.upsert({
                where: { email },
                update: {
                    password, // Reset password if already exists
                },
                create: {
                    email,
                    nickname,
                    password,
                    isEmailVerified: true, // Auto-verify them for testing
                    role: 'USER',
                }
            });
            console.log(`✅ Success: ${user.email} (Nickname: ${user.nickname})`);
        } catch (e) {
            console.error(`❌ Failed for ${email}:`, e);
        }
    }
    console.log("Done.");
}

main()
    .catch(e => {
        console.error("Script execution failed:");
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
