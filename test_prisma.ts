import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst();
        if (!user) throw new Error("No user found");
        
        const store = await prisma.store.findFirst();

        const post = await prisma.post.create({
            data: {
                authorId: user.id,
                countryCode: 'US',
                content: 'Test US Post',
                cafeName: 'Test Cafe',
                cafeLat: 34.0522,
                cafeLng: -118.2437,
                storeId: store?.id,
                postType: 'NORMAL',
            }
        });
        console.log("Success:", post.id);
    } catch (e: any) {
        console.error("Prisma Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
