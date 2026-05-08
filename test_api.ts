import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_super_secret_dev_key';

async function main() {
    try {
        const user = await prisma.user.findFirst();
        if (!user) throw new Error("No user found");
        
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);

        const formData = new URLSearchParams();
        formData.append('content', 'Testing US post creation via API');
        formData.append('countryCode', 'US');
        formData.append('isShorts', 'false');
        formData.append('postType', 'NORMAL');

        console.log("Sending request...");
        const res = await fetch('http://localhost:3001/api/community/posts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Body: ${text}`);

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
