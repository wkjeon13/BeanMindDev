import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function syncProfileImageToStores() {
    console.log("Looking for stores to sync with their owner's profile image...");
    const stores = await prisma.store.findMany();

    let updatedCount = 0;
    for (const store of stores) {
        if (store.ownerId) {
            const owner = await prisma.user.findUnique({
                where: { id: store.ownerId }
            });

            if (owner && owner.profileImageUrl) {
                if (store.mainImageUrl !== owner.profileImageUrl || store.markerImageUrl !== owner.profileImageUrl) {
                    console.log(`Syncing store ${store.name} with owner ${owner.nickname}'s profile image...`);
                    await prisma.store.update({
                        where: { id: store.id },
                        data: {
                            mainImageUrl: owner.profileImageUrl,
                            markerImageUrl: owner.profileImageUrl
                        }
                    });
                    updatedCount++;
                }
            }
        }
    }

    console.log(`Successfully synced ${updatedCount} stores.`);
}

syncProfileImageToStores()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
