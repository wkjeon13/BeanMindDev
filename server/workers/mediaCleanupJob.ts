import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import prisma from '../utils/prisma.js';

// Configuration
const DRY_RUN = process.env.DRY_RUN === 'true'; // Guardrail 4: Dry-Run mode
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4']); // Guardrail 2: Extension Whitelist
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // Guardrail 3: 24 hours

export const runMediaCleanup = async () => {
    console.log(`[Media Cleanup Job] Starting at ${new Date().toISOString()}`);
    console.log(`[Media Cleanup Job] DRY_RUN Mode: ${DRY_RUN}`);

    try {
        if (!fs.existsSync(UPLOADS_DIR)) {
            console.log(`[Media Cleanup Job] Uploads directory not found: ${UPLOADS_DIR}. Skipping.`);
            return;
        }

        // Guardrail 5: Build DB Reference Whitelist
        const usedMediaUrls = new Set<string>();

        // 1. Users (Profile Images, Bio Media)
        const users = await prisma.user.findMany({ select: { profileImageUrl: true, bioMediaUrls: true } });
        for (const user of users) {
            if (user.profileImageUrl) usedMediaUrls.add(user.profileImageUrl);
            if (user.bioMediaUrls) {
                try {
                    const parsed = JSON.parse(user.bioMediaUrls);
                    if (Array.isArray(parsed)) parsed.forEach(u => usedMediaUrls.add(u));
                } catch (e) {}
            }
        }

        // 2. Stores (Images)
        const stores = await prisma.media.findMany({ select: { url: true } });
        for (const media of stores) {
            if (media.url) usedMediaUrls.add(media.url);
        }

        // 3. Posts (Community Images)
        const posts = await prisma.post.findMany({ select: { images: true } });
        for (const post of posts) {
            if (post.images) {
                try {
                    const parsed = JSON.parse(post.images);
                    if (Array.isArray(parsed)) parsed.forEach(u => usedMediaUrls.add(u));
                } catch (e) {}
            }
        }

        // 4. CheckIns (Memo Images)
        const checkins = await prisma.storeCheckIn.findMany({ select: { memoImageUrl: true } });
        for (const checkin of checkins) {
            if (checkin.memoImageUrl) usedMediaUrls.add(checkin.memoImageUrl);
        }

        console.log(`[Media Cleanup Job] Found ${usedMediaUrls.size} unique media URLs in the database.`);

        // Recursive file finding helper
        let deletedCount = 0;
        let skippedCount = 0;

        const scanAndClean = (dirPath: string) => {
            const files = fs.readdirSync(dirPath);
            
            for (const file of files) {
                const fullPath = path.join(dirPath, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    scanAndClean(fullPath); // Recurse
                } else {
                    // Guardrail 1: Path Jail - Ensure absolute path starts exactly with UPLOADS_DIR
                    if (!fullPath.startsWith(UPLOADS_DIR)) {
                        console.warn(`[Media Cleanup Job] Path Jail Violation detected: ${fullPath}. Skipping.`);
                        continue;
                    }

                    // Guardrail 2: Extension Whitelist
                    const ext = path.extname(fullPath).toLowerCase();
                    if (!ALLOWED_EXTENSIONS.has(ext)) {
                        continue;
                    }

                    // Guardrail 3: 24h Grace Period
                    const fileAgeMs = Date.now() - stat.birthtimeMs;
                    if (fileAgeMs < GRACE_PERIOD_MS) {
                        skippedCount++;
                        continue;
                    }

                    // Guardrail 5: DB Check (Convert absolute path to URL format used in DB)
                    // URL format is typically `/uploads/users/123/profile.jpg`
                    const relativePath = fullPath.substring(UPLOADS_DIR.length).replace(/\\/g, '/');
                    const urlFormat = `/uploads${relativePath}`;

                    if (!usedMediaUrls.has(urlFormat)) {
                        // Orphan detected!
                        if (DRY_RUN) {
                            console.log(`[DRY RUN] Would delete orphaned file: ${fullPath}`);
                        } else {
                            fs.unlinkSync(fullPath);
                            console.log(`[DELETED] Orphaned file removed: ${fullPath}`);
                        }
                        deletedCount++;
                    }
                }
            }
        };

        scanAndClean(UPLOADS_DIR);

        console.log(`[Media Cleanup Job] Completed. Deleted: ${deletedCount}, Skipped (Grace Period): ${skippedCount}`);
    } catch (error) {
        console.error(`[Media Cleanup Job] Error encountered:`, error);
    }
};

// Start the CRON job (Runs every day at 3:00 AM)
export const initMediaCleanupJob = () => {
    console.log(`[Media Cleanup Job] CRON Scheduled for 03:00 AM daily.`);
    cron.schedule('0 3 * * *', () => {
        runMediaCleanup();
    });
};
