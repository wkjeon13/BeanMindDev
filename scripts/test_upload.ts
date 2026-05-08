import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const prisma = new PrismaClient();

async function test() {
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log("No users in db");
        return;
    }
    console.log("Found user:", user.id);
    const token = jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role
    }, process.env.JWT_SECRET || 'fallback_jwt_super_secret_dev_key');

    const res = await fetch('http://localhost:3000/api/users/profile-image', {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profileImageUrl: "data:image/png;base64,iVBORw0KGgo" })
    });

    console.log("Status:", res.status);
    console.log("Response:", await res.text());
}

test().finally(() => prisma.$disconnect());
