const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();
    const creatives = await prisma.adCreative.findMany({
        include: { placement: true, campaign: { include: { contract: true } } }
    });
    
    const formattedAds = creatives.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        campaignStatus: c.campaign?.status,
        contractStatus: c.campaign?.contract?.status,
        placementKey: c.placement?.locationKey || 'STANDARD',
        campaignEnd: c.campaign?.endDate,
        contractEnd: c.campaign?.contract?.endDate,
    }));

    require('fs').writeFileSync('all_ads_dump.json', JSON.stringify(formattedAds, null, 2));
}
main().catch(console.error);
