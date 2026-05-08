import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const creatives = await prisma.adCreative.findMany({
        select: { id: true, name: true, overlayText: true, overlayFontSize: true, overlayColor: true, overlayPosition: true },
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    console.log("Creatives top 5:", creatives);
}

check()
    .then(() => process.exit(0))
    .catch(console.error);
