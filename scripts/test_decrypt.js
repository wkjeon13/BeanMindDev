const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
require('dotenv').config({ path: 'server/.env' });

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fallback_secret_key_32_bytes_dev';

const decryptPII = (encryptedText) => {
    if (!encryptedText) return null;
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 2) return encryptedText;
        const [ivHex, encryptedHex] = parts;
        if (!ivHex || !encryptedHex) return encryptedText;

        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY).slice(0, 32), iv);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error('DECRYPT ERROR:', e);
        throw e;
    }
};

const prisma = new PrismaClient();

async function test() {
    const stores = await prisma.store.findMany({
        where: { ownerId: '01c4ed25-2a6c-4361-80e9-b6bda6928e46' }
    });
    console.log('Stores found for owner:', stores.length);

    for (const s of stores) {
        console.log(`\nTesting Store ID: ${s.id}`);
        try {
            const addr = decryptPII(s.address);
            console.log('Address Decrypted OK:', addr);
        } catch (e) {
            console.log('Address Decryption FAILED!');
        }

        if (s.phone) {
            try {
                const phone = decryptPII(s.phone);
                console.log('Phone Decrypted OK:', phone);
            } catch (e) {
                console.log('Phone Decryption FAILED!');
            }
        }
    }
}

test().finally(() => prisma.$disconnect());
