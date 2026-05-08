import { PrismaClient } from '@prisma/client';
import { decryptPII } from '../server/utils/encryption';

const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany();
    let count = 0;
    console.log('Checking ' + stores.length + ' stores for Pangyo/Bundang addresses...');
    
    stores.forEach(store => {
        if (store.address) {
            try {
                const addr = decryptPII(store.address);
                if (addr.includes('판교') || addr.includes('분당') || addr.includes('백현') || addr.includes('삼평')) {
                    console.log(`- ${store.name}: ${addr} (lat: ${store.lat}, lng: ${store.lng})`);
                    count++;
                }
            } catch (e) {}
        }
    });
    console.log('Total Pangyo/Bundang stores:', count);
}

main().finally(() => prisma.$disconnect());
