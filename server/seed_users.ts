import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import prisma from './utils/prisma.js';

async function main() {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('1234', salt);

    console.log('Seeding users...');
    
    for (let i = 6; i <= 15; i++) {
        const email = `user${i}@test.com`;
        const nickname = `일반유저${i}`;
        
        try {
            await prisma.user.upsert({
                where: { email },
                update: {
                    password: hashedPassword,
                    role: 'USER',
                    isEmailVerified: true
                },
                create: {
                    email,
                    nickname,
                    password: hashedPassword,
                    role: 'USER',
                    isEmailVerified: true,
                    ageGroup: '20s',
                    gender: 'UNKNOWN'
                }
            });
            console.log(`Created/Updated: ${email}`);
        } catch (e) {
            console.error(`Failed to create ${email}:`, e);
        }
    }
    
    console.log('Seeding complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
