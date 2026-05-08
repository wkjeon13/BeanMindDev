import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixStuckMarkerImages() {
    console.log("Looking for stores with corrupted marker images...");
    const stores = await prisma.store.findMany();
    for (const store of stores) {
        if (store.mainImageUrl === null && store.markerImageUrl !== null) {
            console.log(`Found desynced store ${store.id}. Syncing markerImageUrl to null...`);
            await prisma.store.update({
                where: { id: store.id },
                data: { markerImageUrl: null }
            });
        }
    }
    console.log("Cleanup complete.");
}

fixStuckMarkerImages().finally(() => prisma.$disconnect());
