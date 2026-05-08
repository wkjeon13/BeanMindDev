import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_super_secret_dev_key';

async function main() {
    const prisma = new PrismaClient();
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log("No user found.");
        return;
    }
    
    console.log(`Testing with User ID: ${user.id}`);
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    
    const res = await fetch('http://localhost:3001/api/shops', {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = await res.json();
    console.log(`First shop name:`, data.length > 0 ? data[1].name : 'No shops found');
    console.log(`First shop matchRate:`, data.length > 0 ? data[1].matchRate : 'No shops found');
}

main().catch(console.error);
