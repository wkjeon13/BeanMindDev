import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const stores = await prisma.store.findMany({
            include: { owner: true }
        });

        let updatedCount = 0;
        for (const store of stores) {
            const ownerCountry = store.owner?.countryCode;
            if (ownerCountry && ownerCountry !== 'GLOBAL' && store.countryCode !== ownerCountry) {
                await prisma.store.update({
                    where: { id: store.id },
                    data: { countryCode: ownerCountry }
                });
                updatedCount++;
                console.log(`Updated store ${store.name} to countryCode ${ownerCountry}`);
            }
        }
        console.log(`Successfully migrated ${updatedCount} stores.`);
    } catch (e) {
        console.error("Migration error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
