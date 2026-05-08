import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

import prisma from '../utils/prisma.js';

async function migrateClubBase64ToDisk() {
    console.log("=== Starting Club Cover Image Base64 to Disk Migration ===");

    const clubs = await prisma.club.findMany({
        where: {
            coverImageUrl: {
                startsWith: 'data:image'
            }
        }
    });

    console.log(`Found ${clubs.length} clubs with Base64 cover images.`);

    for (const club of clubs) {
        try {
            if (!club.coverImageUrl) continue;
            
            const base64DataStr = club.coverImageUrl;
            const base64MimeType = base64DataStr.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';
            const extension = base64MimeType.split('/')[1] || 'jpg';
            const base64Data = base64DataStr.split(';base64,').pop();

            if (!base64Data) continue;

            const fileName = `club_migrated_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
            const relativeDir = path.join('clubs', club.ownerId);
            const uploadPath = path.join(process.cwd(), 'uploads', relativeDir);
            
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }

            const writeTarget = path.join(uploadPath, fileName);
            fs.writeFileSync(writeTarget, base64Data, { encoding: 'base64' });
            
            // For web, path separator is forward slash
            const publicUrl = `/uploads/${relativeDir.split(path.sep).join('/')}/${fileName}`;

            // Update club record
            await prisma.club.update({
                where: { id: club.id },
                data: { coverImageUrl: publicUrl }
            });

            console.log(`  - Migrated Club ${club.id} -> ${publicUrl}`);
        } catch (err: any) {
            console.error(`  - Failed to migrate Club ${club.id}:`, err.message);
        }
    }

    console.log("\n=== Club Migration Completed Successfully! ===");
}

migrateClubBase64ToDisk()
    .catch((e) => {
        console.error("Migration Fatal Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
