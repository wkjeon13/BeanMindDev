const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({ select: { id: true, name: true, lat: true, lng: true } });
    console.log("Total Stores:", stores.length);
    stores.forEach(s => console.log(s.name, s.lat, s.lng));
}
main().finally(() => prisma.$disconnect());
