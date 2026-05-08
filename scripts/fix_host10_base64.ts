import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function fixHost10Marker() {
    console.log("Looking for host10@test.com...");
    const user = await prisma.user.findUnique({
        where: { email: 'host10@test.com' },
        include: { stores: true }
    });

    if (!user || user.stores.length === 0) {
        console.log("User or store not found.");
        return;
    }

    const store = user.stores[0];
    const base64String = store.markerImageUrl;

    if (base64String && base64String.startsWith('data:image')) {
        console.log("Found base64 marker image. Converting to file...");
        
        // Extract base64 data
        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            console.log("Invalid base64 string format.");
            return;
        }

        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `host10_marker_${Date.now()}.png`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'users', user.id, 'shops', store.id);
        
        // Ensure directory exists
        fs.mkdirSync(uploadDir, { recursive: true });
        
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);
        
        const fileUrl = `/uploads/users/${user.id}/shops/${store.id}/${filename}`;
        
        console.log(`Saved file to ${filePath}`);
        console.log(`Updating store with new URL: ${fileUrl}`);

        await prisma.store.update({
            where: { id: store.id },
            data: {
                markerImageUrl: fileUrl,
                mainImageUrl: store.mainImageUrl?.startsWith('data:image') ? fileUrl : store.mainImageUrl
            }
        });

        if (user.profileImageUrl?.startsWith('data:image')) {
             await prisma.user.update({
                 where: { id: user.id },
                 data: { profileImageUrl: fileUrl }
             });
        }
        
        console.log("Successfully fixed host10 marker and profile images!");
    } else {
        console.log("Marker image is not a base64 string or is missing.");
    }
}

fixHost10Marker()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
