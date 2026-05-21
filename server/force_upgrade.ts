import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function forceUpgradeRoles() {
    try {
        console.log("Checking store owners...");
        const stores = await prisma.store.findMany({
            select: { ownerId: true }
        });
        
        const ownerIds = stores.map(s => s.ownerId).filter(id => id !== null) as string[];
        const uniqueOwnerIds = Array.from(new Set(ownerIds));
        
        const result = await prisma.user.updateMany({
            where: {
                id: { in: uniqueOwnerIds },
                role: 'USER'
            },
            data: { role: 'OWNER' }
        });
        
        console.log(`Successfully forced upgrade for ${result.count} users from USER to OWNER.`);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
forceUpgradeRoles();
