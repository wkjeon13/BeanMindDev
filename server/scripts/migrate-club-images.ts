import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

import prisma from '../utils/prisma.js';

async function main() {
    console.log('Starting Migration: Club Cover Images...');
    const clubs = await prisma.club.findMany();
    
    let migratedCount = 0;

    for (const club of clubs) {
        if (!club.coverImageUrl) continue;
        
        let imagesToProcess: string[] = [];
        let isJsonArray = false;
        
        if (club.coverImageUrl.startsWith('[')) {
            try {
                imagesToProcess = JSON.parse(club.coverImageUrl);
                isJsonArray = true;
            } catch (e) {
                console.log(`Failed to parse JSON for club ${club.id}`);
            }
        } else if (club.coverImageUrl.startsWith('data:image')) {
            imagesToProcess = [club.coverImageUrl];
        } else {
            // Probably already migrated (e.g. /uploads/...)
            continue;
        }

        const newPaths: string[] = [];
        let needsUpdate = false;

        for (let i = 0; i < imagesToProcess.length; i++) {
            const imgData = imagesToProcess[i];
            
            if (imgData.startsWith('data:image')) {
                needsUpdate = true;
                const base64MimeType = imgData.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';
                const extension = base64MimeType.split('/')[1] || 'jpg';
                const base64Data = imgData.split(';base64,').pop();

                if (base64Data) {
                    const fileName = `club_${Date.now()}_${Math.floor(Math.random() * 1000)}_${i}.${extension}`;
                    // Use club ownerId or a default
                    const relativeDir = path.join('clubs', club.ownerId || 'system');
                    const uploadPath = path.join(process.cwd(), 'uploads', relativeDir);
                    
                    if (!fs.existsSync(uploadPath)) {
                        fs.mkdirSync(uploadPath, { recursive: true });
                    }

                    fs.writeFileSync(path.join(uploadPath, fileName), base64Data, { encoding: 'base64' });
                    const finalUrl = `/uploads/${relativeDir.split(path.sep).join('/')}/${fileName}`;
                    newPaths.push(finalUrl);
                    console.log(`Saved file: ${finalUrl}`);
                }
            } else {
                newPaths.push(imgData);
            }
        }

        if (needsUpdate) {
            const newCoverImageUrl = isJsonArray || newPaths.length > 1 ? JSON.stringify(newPaths) : newPaths[0];
            await prisma.club.update({
                where: { id: club.id },
                data: { coverImageUrl: newCoverImageUrl }
            });
            console.log(`Updated club: ${club.name} (${club.id})`);
            migratedCount++;
        }
    }

    console.log(`Migration Complete. Migrated ${migratedCount} clubs.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
