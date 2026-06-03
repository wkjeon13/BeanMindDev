import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("=== DIAGNOSING ADVERTISEMENTS ===");
    try {
        const placements = await prisma.placement.findMany();
        console.log("1. PLACEMENT RECORDS:");
        console.log(JSON.stringify(placements, null, 2));

        const campaigns = await prisma.campaign.findMany({
            include: {
                creatives: {
                    include: {
                        placement: true
                    }
                }
            }
        });
        console.log("\n2. CAMPAIGN & CREATIVES:");
        console.log(JSON.stringify(campaigns, null, 2));

        fs.writeFileSync('ad_results.json', JSON.stringify({ placements, campaigns }, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
