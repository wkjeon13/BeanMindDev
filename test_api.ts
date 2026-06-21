import fetch from 'node-fetch';
import { PrismaClient } from './node_modules/.prisma/client-stamp-v2/index.js';

const prisma = new PrismaClient();

async function main() {
    try {
        const store = await prisma.store.findFirst({
            where: {
                media: {
                    some: {}
                }
            }
        });
        if (!store) {
            console.log("No store with media found in DB.");
            return;
        }
        
        console.log(`Found store ID: ${store.id}, Name: ${store.name}`);
        
        console.log("Sending GET request to Spring Boot (3000)...");
        const res = await fetch(`http://localhost:3000/api/shops/${store.id}`);
        const data = await res.json();
        console.log("Response status:", res.status);
        console.log("Media URLs in response:", data.data?.media);

        console.log("Sending GET request to Node.js (3001)...");
        const resNode = await fetch(`http://localhost:3001/api/shops/${store.id}`);
        const dataNode = await resNode.json();
        console.log("Node response status:", resNode.status);
        console.log("Node media URLs:", dataNode.data?.media || dataNode.media);

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();

