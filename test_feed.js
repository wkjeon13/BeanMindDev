import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Get the first user (we'll assume this is the user logged in, or we just grab any user who follows the store)
    // The created post had storeId: '3edbc416-de1e-485d-9a42-6c1c4e660a59'
    const storeIdToCheck = '3edbc416-de1e-485d-9a42-6c1c4e660a59';

    // Find a user who follows this store
    const follows = await prisma.storeFollow.findMany({
        where: { storeId: storeIdToCheck }
    });
    
    if (follows.length === 0) {
        console.log("WAIT! Nobody follows this store! No wonder it's not showing up for any 'customer'!");
        return;
    }
    
    const testUserId = follows[0].userId;
    console.log("Testing with user:", testUserId);

    const followedStores = await prisma.storeFollow.findMany({
        where: { userId: testUserId },
        select: { storeId: true }
    });
    const followedStoreIds = followedStores.map(f => f.storeId);
    
    console.log("Followed store IDs for user:", followedStoreIds);
    
    const whereClause = {};
    whereClause.OR = [
        { 
            storeId: { in: followedStoreIds },
            postType: { not: 'NORMAL' }
        },
        // We omit followed authors for simplicity
        { authorId: { in: [] } }
    ];

    const posts = await prisma.post.findMany({
        where: whereClause
    });
    
    console.log("Posts returned for user's Feed:", posts.length);
    if(posts.length > 0) {
         console.log("Post Types available:", posts.map(p => p.postType));
    }
}
main().catch(console.error).finally(()=>prisma.$disconnect());
