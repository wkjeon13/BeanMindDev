import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUsers() {
    console.log("Starting to create test users...");
    const basePassword = '12345678';

    // We need to hash the password just like the auth route does
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(basePassword, salt);

    for (let i = 1; i <= 5; i++) {
        const email = `user${i}@test.com`;
        const nickname = `테스트유저${i}`;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            console.log(`User ${email} already exists. Updating password to 12345678...`);
            await prisma.user.update({
                where: { email },
                data: {
                    password: hashedPassword,
                    isEmailVerified: true,
                    role: 'USER'
                }
            });
        } else {
            console.log(`Creating user ${email}...`);
            await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    nickname,
                    isEmailVerified: true, // Auto-verify for test accounts
                    role: 'USER',
                    loginType: 'EMAIL',
                    status: 'ACTIVE'
                }
            });
        }
    }

    console.log("Successfully created/updated 5 test users (user1@test.com ~ user5@test.com) with password: 12345678");
}

createTestUsers()
    .catch((e) => {
        console.error("Error creating test users:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
