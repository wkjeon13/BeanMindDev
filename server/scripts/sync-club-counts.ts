import { PrismaClient } from '@prisma/client';

import prisma from '../utils/prisma.js';

async function main() {
    console.log("Starting Club memberCount synchronization...");
    
    // Group by clubId where role is OWNER, ADMIN, or MEMBER
    const counts = await prisma.clubMember.groupBy({
        by: ['clubId'],
        where: { role: { in: ['OWNER', 'ADMIN', 'MEMBER'] } },
        _count: { _all: true }
    });

    console.log(`Found active member counts for ${counts.length} clubs.`);

    let updatedCount = 0;
    for (const item of counts) {
        await prisma.club.update({
            where: { id: item.clubId },
            data: { memberCount: item._count._all }
        });
        updatedCount++;
    }

    // Force default 1 for any club without even an owner (orphan protection)
    await prisma.club.updateMany({
        where: { memberCount: 0 },
        data: { memberCount: 1 }
    });

    console.log(`Successfully updated memberCount column for ${updatedCount} clubs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
