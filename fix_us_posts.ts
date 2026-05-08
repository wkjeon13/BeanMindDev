import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const posts = await prisma.post.findMany({
            where: { countryCode: 'US' },
            include: { store: { select: { lng: true } } }
        });
        
        let updatedCount = 0;
        for (const post of posts) {
            // If the post is tagged with a store that is clearly in KR (longitude > 120)
            if (post.store && post.store.lng && post.store.lng > 120) {
                await prisma.post.update({
                    where: { id: post.id },
                    data: { countryCode: 'KR' } // Move it to the KR feed
                });
                updatedCount++;
            }
        }
        console.log(`Successfully moved ${updatedCount} mislabeled posts from US to KR feed.`);
    } catch (e) {
        console.error("Migration error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
