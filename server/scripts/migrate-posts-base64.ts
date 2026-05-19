import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

import prisma from '../utils/prisma.js';

async function migratePostBase64ToDisk() {
    console.log("=== Starting Community Post Image Base64 to Disk Migration ===");

    const posts = await prisma.post.findMany({
        where: {
            image: {
                contains: 'data:image'
            }
        }
    });

    console.log(`Found ${posts.length} posts with Base64 images.`);

    for (const post of posts) {
        try {
            if (!post.image) continue;

            let imageUrls: string[] = [];
            try {
                const parsed = JSON.parse(post.image);
                if (Array.isArray(parsed)) {
                    imageUrls = parsed;
                } else {
                    imageUrls = [post.image];
                }
            } catch(e) {
                imageUrls = [post.image];
            }

            const newUrls: string[] = [];
            let isModified = false;

            for (const imgStr of imageUrls) {
                if (imgStr.startsWith('data:image')) {
                    const base64MimeType = imgStr.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';
                    const extension = base64MimeType.split('/')[1] || 'jpg';
                    const base64Data = imgStr.split(';base64,').pop();

                    if (!base64Data) {
                        newUrls.push(imgStr);
                        continue;
                    }

                    const fileName = `post_migrated_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
                    const relativeDir = path.join('community', post.authorId || 'anonymous');
                    const uploadPath = path.join(process.cwd(), 'uploads', relativeDir);
                    
                    if (!fs.existsSync(uploadPath)) {
                        fs.mkdirSync(uploadPath, { recursive: true });
                    }

                    const writeTarget = path.join(uploadPath, fileName);
                    fs.writeFileSync(writeTarget, base64Data, { encoding: 'base64' });
                    
                    const publicUrl = `/uploads/${relativeDir.split(path.sep).join('/')}/${fileName}`;
                    newUrls.push(publicUrl);
                    isModified = true;
                    console.log(`  - Migrated Image for Post ${post.id} -> ${publicUrl}`);
                } else {
                    newUrls.push(imgStr);
                }
            }

            if (isModified) {
                const finalImageString = newUrls.length === 1 ? newUrls[0] : JSON.stringify(newUrls);
                await prisma.post.update({
                    where: { id: post.id },
                    data: { image: finalImageString }
                });
                console.log(`  - Updated Post ${post.id}`);
            }

        } catch (err: any) {
            console.error(`  - Failed to migrate Post ${post.id}:`, err.message);
        }
    }

    console.log("\n=== Post Migration Completed Successfully! ===");
}

migratePostBase64ToDisk()
    .catch((e) => {
        console.error("Migration Fatal Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
