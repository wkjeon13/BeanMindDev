const jwt = require('jsonwebtoken');
const http = require('http');

// JWT secret from server/routes/users.ts
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_super_secret_dev_key';

// Mints a token for an admin user or first user
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testHttp() {
    let user = await prisma.user.findFirst({
        where: { posts: { some: {} } }
    });
    if (!user) user = await prisma.user.findFirst();
    if (!user) {
        console.log("No users in db");
        process.exit();
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    console.log("Testing user:", user.email, user.id);

    // Call http://localhost:3002/api/users/me/activity (or 3001 depending on the port)
    // usually dev API is on 3001 or 3002 locally
    const options = {
        hostname: 'localhost',
        port: 3002, // The user's error showed 3002
        path: '/api/users/me/activity?type=all&page=1&limit=20',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    const req = http.request(options, (res) => {
        console.log('STATUS:', res.statusCode);
        console.log('HEADERS:', res.headers);
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log('BODY:', data.substring(0, 500) + (data.length > 500 ? '...' : ''));
            prisma.$disconnect();
        });
    });

    req.on('error', (e) => {
        console.error('Request error (try port 3001 if ECONNREFUSED):', e.message);
        // Fallback to 3001
        if(e.message.includes('ECONNREFUSED')) {
            const req2 = http.request({...options, port: 3001}, (res) => {
                console.log('Fallback STATUS:', res.statusCode);
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => { console.log('Fallback BODY:', data.substring(0, 500)); prisma.$disconnect(); });
            });
            req2.on('error', e2 => {
                 console.error("Fallback error:", e2.message);
                 prisma.$disconnect();
            });
            req2.end();
        } else {
            prisma.$disconnect();
        }
    });

    req.end();
}

testHttp();
