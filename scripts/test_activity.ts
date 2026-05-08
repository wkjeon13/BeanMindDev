import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testActivity() {
    try {
        const userId = '0929dfc2-55bb-432d-9eb5-83e954559eb5'; // I need a valid user ID. Let's just pick one with data
        let user = await prisma.user.findFirst({
            where: { posts: { some: {} } }
        });
        if (!user) {
            user = await prisma.user.findFirst();
        }
        if (!user) return console.log("No users found");
        console.log("Testing for user:", user.id);

        console.log("1. Posts");
        const posts = await prisma.post.findMany({
            where: { authorId: user.id },
            select: { id: true, content: true, image: true, createdAt: true, earnedBeans: true, store: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        });
        console.log("Posts count:", posts.length);

        console.log("2. Comments");
        const comments = await prisma.comment.findMany({
            where: { authorId: user.id },
            select: { id: true, content: true, createdAt: true, postId: true, post: { select: { content: true } } },
            orderBy: { createdAt: 'desc' }
        });
        console.log("Comments count:", comments.length);

        console.log("3. Reviews");
        const reviews = await prisma.storeReview.findMany({
            where: { userId: user.id },
            select: { id: true, content: true, imageUrls: true, createdAt: true, overall: true, storeId: true, store: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });
        console.log("Reviews count:", reviews.length);

        console.log("4. Likes");
        const likes = await prisma.like.findMany({
            where: { userId: user.id },
            select: { id: true, createdAt: true, postId: true, post: { select: { content: true, image: true, author: { select: { nickname: true } } } } },
            orderBy: { createdAt: 'desc' }
        });
        console.log("Likes count:", likes.length);

        console.log("All success!");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
testActivity();
