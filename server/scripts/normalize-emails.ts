import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting email normalization migration...');
    const users = await prisma.user.findMany();
    let updatedCount = 0;

    for (const user of users) {
        if (!user.email) continue;
        
        const normalized = user.email.trim().toLowerCase();
        
        // If the email in the DB has uppercase letters or spaces
        if (user.email !== normalized) {
            console.log(`Normalizing email for user ID ${user.id}: '${user.email}' -> '${normalized}'`);
            
            try {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { email: normalized }
                });
                updatedCount++;
            } catch (error: any) {
                // Ignore unique constraint errors if the lowercase email already exists
                console.error(`Failed to update ${user.email}:`, error?.message || error);
            }
        }
    }

    console.log(`Migration complete. Updated ${updatedCount} users.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
