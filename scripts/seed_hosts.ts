import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding host users 11 to 15...');
  const passwordHash = await bcrypt.hash('1234', 10);

  for (let i = 11; i <= 15; i++) {
    const email = `host${i}@test.com`;
    const nickname = `HostUser${i}`;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          nickname,
          role: 'HOST',
          isEmailVerified: true,
          status: 'ACTIVE',
        },
      });
      console.log(`Created user: ${nickname} (${email})`);
    } else {
      console.log(`User already exists: ${nickname} (${email})`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Seeding complete.');
  });
