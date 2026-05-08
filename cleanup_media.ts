import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({
        include: { media: true }
    });
    
    let deletedCount = 0;
    
    for (const s of stores) {
        if (s.media.length > 1) {
            const seenUrls = new Set();
            for (const media of s.media) {
                if (seenUrls.has(media.url)) {
                    // Duplicate found, delete it
                    await prisma.media.delete({ where: { id: media.id } });
                    deletedCount++;
                } else {
                    seenUrls.add(media.url);
                }
            }
        }
    }
    
    console.log(`Cleaned up ${deletedCount} duplicate media entries from the database.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
