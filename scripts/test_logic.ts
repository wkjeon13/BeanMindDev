import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testLogic() {
    try {
        const userId = '012bd6fb-8be9-4bb0-ad5c-432862124b1e'; // From my previous run
        const typeFilter = 'all'; // all, post, comment, review, like
        const page = 1;
        const limit = 20;

        let activities: any[] = [];

        // 1. Fetch Posts
        if (typeFilter === 'all' || typeFilter === 'post') {
            const posts = await prisma.post.findMany({
                where: { authorId: userId },
                select: { id: true, content: true, image: true, createdAt: true, earnedBeans: true, store: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' }, take: 5
            });
            activities.push(...posts.map((p: any) => ({
                id: p.id, type: 'post', createdAt: p.createdAt, content: p.content, imageUrl: p.image, targetId: p.id,
                extra: { earnedBeans: p.earnedBeans, storeName: p.store?.name }
            })));
        }

        // 2. Fetch Comments
        if (typeFilter === 'all' || typeFilter === 'comment') {
            const comments = await prisma.comment.findMany({
                where: { authorId: userId },
                select: { id: true, content: true, createdAt: true, postId: true, post: { select: { content: true } } },
                orderBy: { createdAt: 'desc' }, take: 5
            });
            activities.push(...comments.map((c: any) => ({
                id: c.id, type: 'comment', createdAt: c.createdAt, content: c.content, targetId: c.postId,
                extra: { parentContent: c.post?.content }
            })));
        }

        // 3. Fetch Reviews
        if (typeFilter === 'all' || typeFilter === 'review') {
            const reviews = await prisma.storeReview.findMany({
                where: { userId },
                select: { id: true, content: true, imageUrls: true, createdAt: true, overall: true, storeId: true, store: { select: { name: true } } },
                orderBy: { createdAt: 'desc' }, take: 5
            });
            activities.push(...reviews.map((r: any) => {
                let img = null;
                if (r.imageUrls) {
                    try {
                        const parsed = JSON.parse(r.imageUrls);
                        if (Array.isArray(parsed) && parsed.length > 0) img = parsed[0];
                    } catch (e) { img = r.imageUrls; }
                }
                return {
                    id: r.id, type: 'review', createdAt: r.createdAt, content: r.content, imageUrl: img, targetId: r.storeId,
                    extra: { rating: r.overall, storeName: r.store?.name }
                };
            }));
        }

        // 4. Fetch Likes
        if (typeFilter === 'all' || typeFilter === 'like') {
            const likes = await prisma.like.findMany({
                where: { userId },
                select: { id: true, createdAt: true, postId: true, post: { select: { content: true, image: true, author: { select: { nickname: true } } } } },
                orderBy: { createdAt: 'desc' }, take: 5
            });
            activities.push(...likes.map((l: any) => ({
                id: l.id, type: 'like', createdAt: l.createdAt, content: l.post?.content || '', imageUrl: l.post?.image, targetId: l.postId,
                extra: { authorName: l.post?.author?.nickname }
            })));
        }

        console.log("Pre-sort count:", activities.length);
        console.log("Sample type before sort:", typeof activities[0]?.createdAt); // Should be object (Date)

        // Sort globally by createdAt DESC
        activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        // Pagination
        const total = activities.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const paginatedActivities = activities.slice(startIndex, startIndex + limit);

        console.log("Pagination:", { total, totalPages, length: paginatedActivities.length });
        if (paginatedActivities.length > 0) {
             console.log("Sample success! ID:", paginatedActivities[0].id);
             console.log("Returned JSON text length:", JSON.stringify({ activities: paginatedActivities }).length);
        }
    } catch (e) {
        console.error("Test Logic Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

testLogic();
