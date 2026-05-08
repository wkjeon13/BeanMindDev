const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({ select: { id: true, name: true, signatureBean: true, lat: true, lng: true } });
    stores.forEach(s => {
        if (s.name.includes('서울') || (s.signatureBean && s.signatureBean.includes('서울'))) {
            console.log("Matches '서울':", s.name, "| Bean:", s.signatureBean, "| Lat:", s.lat);
        }
    });
}
main().finally(() => prisma.$disconnect());
