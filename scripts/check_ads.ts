import { PrismaClient } from '@prisma/client';
import fs from 'fs';

async function main() {
    const prisma = new PrismaClient();
    const creatives = await prisma.adCreative.findMany({
        where: { status: 'ACTIVE' },
        include: { placement: true, campaign: { include: { contract: true } } }
    });
    
    const formattedAds = creatives.map((c: any) => ({
        id: c.id,
        name: c.name,
        placementKey: c.placement?.locationKey || 'STANDARD',
        campaignStatus: c.campaign?.status,
        campStart: c.campaign?.startDate,
        campEnd: c.campaign?.endDate,
        country: c.campaign?.targetCountry,
        targetDays: c.campaign?.targetDays,
        targetHours: c.campaign?.targetHours,
        contractStatus: c.campaign?.contract?.status,
        contStart: c.campaign?.contract?.startDate,
        contEnd: c.campaign?.contract?.endDate,
        contBudget: c.campaign?.contract?.totalBudget,
        contSpent: c.campaign?.contract?.spentBudget
    }));

    fs.writeFileSync('ads_dump.json', JSON.stringify(formattedAds, null, 2));
}
main().catch(console.error);
