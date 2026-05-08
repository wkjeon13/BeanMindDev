import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();

    // 1. Target standard and premium ads by their Creative IDs from our JSON dump
    const geishaCreativeId = "ece9b2aa-a04a-45e9-bada-f6012f8d4e01";
    const colombiaCreativeId = "b4354da8-8224-4d91-b2c4-495c2be1c0ea";

    const geishaCreative = await prisma.adCreative.findUnique({
        where: { id: geishaCreativeId },
        include: { campaign: true }
    });

    const colombiaCreative = await prisma.adCreative.findUnique({
        where: { id: colombiaCreativeId },
        include: { campaign: { include: { contract: true } } }
    });

    // 2. Clear targeting restrictions on Geisha ad so it shows ANY day/time
    if (geishaCreative && geishaCreative.campaign) {
        await prisma.campaign.update({
            where: { id: geishaCreative.campaign.id },
            data: { targetDays: null, targetHours: null }
        });
        console.log("Geisha campaign targeting cleared.");
    }

    // 3. Extend Colombia ad expiration date since it expired yesterday
    if (colombiaCreative && colombiaCreative.campaign) {
        await prisma.campaign.update({
            where: { id: colombiaCreative.campaign.id },
            data: { endDate: new Date('2026-12-31T00:00:00.000Z') }
        });
        if (colombiaCreative.campaign.contract) {
             await prisma.contract.update({
                 where: { id: colombiaCreative.campaign.contract.id },
                 data: { endDate: new Date('2026-12-31T00:00:00.000Z') }
             });
        }
        console.log("Colombia campaign and contract extended to Dec 31, 2026.");
    }
}

main().catch(console.error).finally(() => process.exit(0));
