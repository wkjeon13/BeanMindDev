import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

import prisma from '../utils/prisma.js';

async function migrateBase64ToDisk() {
    console.log("=== Starting Profil & Review Base64 to Disk Migration ===");

    // 1. Users Profile Images
    console.log("\n[Phase 1] Scanning User Profiles for Base64...");
    const users = await prisma.user.findMany({
        where: {
            profileImageUrl: {
                startsWith: 'data:image'
            }
        }
    });

    console.log(`Found ${users.length} users with Base64 profile images.`);

    for (const user of users) {
        try {
            if (!user.profileImageUrl) continue;
            
            const base64DataStr = user.profileImageUrl;
            const base64MimeType = base64DataStr.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';
            const extension = base64MimeType.split('/')[1] || 'jpg';
            const base64Data = base64DataStr.split(';base64,').pop();

            if (!base64Data) continue;

            const fileName = `profile_migrated_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
            const relativeDir = path.join('users', user.id, 'profile');
            const uploadPath = path.join(process.cwd(), 'uploads', relativeDir);
            
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }

            const writeTarget = path.join(uploadPath, fileName);
            fs.writeFileSync(writeTarget, base64Data, { encoding: 'base64' });
            
            const publicUrl = `/uploads/${relativeDir.split(path.sep).join('/')}/${fileName}`;

            // Update user
            await prisma.user.update({
                where: { id: user.id },
                data: { profileImageUrl: publicUrl }
            });
            
            // Also update any store they own
            await prisma.store.updateMany({
                where: { ownerId: user.id },
                data: { 
                    mainImageUrl: publicUrl,
                    markerImageUrl: publicUrl
                }
            });

            console.log(`  - Migrated User ${user.id} -> ${publicUrl}`);
        } catch (err: any) {
            console.error(`  - Failed to migrate User ${user.id}:`, err.message);
        }
    }


    // 2. Store Reviews
    console.log("\n[Phase 2] Scanning Store Reviews for Base64...");
    
    // We have to scan all since JSON.stringified array starts with "[" instead of "data:image"
    const reviews = await prisma.storeReview.findMany({
        where: {
             imageUrls: {
                 contains: 'data:image'
             }
        }
    });

    console.log(`Found ${reviews.length} reviews containing Base64 image arrays.`);

    for (const review of reviews) {
        try {
            if (!review.imageUrls) continue;

            let parsedUrls: string[] = [];
            try {
                parsedUrls = JSON.parse(review.imageUrls);
            } catch(e) {
                console.log(`  - Skipping Review ${review.id} (Invalid JSON)`);
                continue;
            }

            if (!Array.isArray(parsedUrls)) continue;

            let updated = false;
            const finalUrls = parsedUrls.map((url, idx) => {
                if (url && url.startsWith('data:image')) {
                    try {
                        const base64MimeType = url.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';
                        const extension = base64MimeType.split('/')[1] || 'jpg';
                        const base64Data = url.split(';base64,').pop();

                        if (base64Data) {
                            const fileName = `review_migrated_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}.${extension}`;
                            const relativeDir = path.join('users', review.userId, 'reviews');
                            const uploadPath = path.join(process.cwd(), 'uploads', relativeDir);
                            
                            if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

                            fs.writeFileSync(path.join(uploadPath, fileName), base64Data, { encoding: 'base64' });
                            updated = true;
                            return `/uploads/${relativeDir.split(path.sep).join('/')}/${fileName}`;
                        }
                    } catch (e) {
                        console.error(`Error decoding base64 in Review ${review.id}`);
                    }
                }
                return url;
            }).filter(Boolean);

            if (updated) {
                await prisma.storeReview.update({
                    where: { id: review.id },
                    data: { imageUrls: JSON.stringify(finalUrls) }
                });
                console.log(`  - Migrated Review ${review.id}`);
            }
        } catch (err: any) {
             console.error(`  - Failed to migrate Review ${review.id}:`, err.message);
        }
    }

    console.log("\n=== Migration Completed Successfully! ===");
}

migrateBase64ToDisk()
    .catch((e) => {
        console.error("Migration Fatal Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
