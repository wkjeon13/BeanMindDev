import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUSPosts() {
    try {
        const posts = await prisma.post.findMany({
            where: { countryCode: 'US' },
            include: { store: { select: { name: true, lat: true, lng: true } } },
            take: 10
        });
        
        console.log(`Found ${posts.length} US posts.`);
        posts.forEach(p => {
            console.log(`Post ID: ${p.id}, Content: ${p.content.substring(0,20)}..., Store: ${p.store?.name} (lng: ${p.store?.lng})`);
        });
    } catch (e) {
        console.error("Fetch error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
checkUSPosts();
