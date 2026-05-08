import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const store = await prisma.store.findFirst({
        where: { name: { contains: '본점' } },
        include: { media: true }
    });
    console.log("Found Store:", store?.name);
    console.log("Website URL:", JSON.stringify(store?.websiteUrl));
    console.log("Media Count:", store?.media?.length);
    if (store?.media?.length) {
        console.log("First Media Type URL:", store.media[0].url);
    }
}

main().finally(() => prisma.$disconnect());
