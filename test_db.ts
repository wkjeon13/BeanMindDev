import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({
        include: { media: true }
    });
    console.log("Total stores:", stores.length);
    for (const s of stores) {
        if (s.media.length > 1) {
            console.log(`Store ${s.name} (${s.id}) Media:`, s.media.map(m => m.url));
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
