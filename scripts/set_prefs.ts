import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

async function main() {
    await prisma.user.updateMany({
        data: {
            prefAcidity: 3.5,
            prefSweetness: 4.0,
            prefBitterness: 2.0,
            prefBody: 3.0
        }
    });
    console.log('Updated user preferences');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
