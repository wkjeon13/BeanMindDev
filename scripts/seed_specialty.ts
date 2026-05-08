import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { encryptPII } from '../server/utils/encryption';

async function main() {
    // get a user
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log("No users in db");
        return;
    }

    const testStore = await prisma.store.create({
        data: {
            ownerId: users[0].id,
            name: "TEST SPECIALTY ROASTERY (SINGLE+BLEND)",
            primaryCoffeeType: "SPECIALTY_ROASTERY",
            address: encryptPII("Test Address Seoul"),
            phone: encryptPII("010-1234-5678"),
            shortDesc: "Test shop for filter bug",
            longDesc: "This shop handles both single origin and blending",
            signatureBean: "Blend 1, Single O 2",
            acidity: 3,
            sweetness: 3,
            bitterness: 3,
            body: 4,
            equipment: "Roaster XYZ",
            signatureMenu: "Americano, Drip",
            dessertPairing: "Cake",
            status: "APPROVED",
            hours: "09:00 - 20:00",
            lat: 37.5665,
            lng: 126.9800 // slightly offset from center
        }
    });

    console.log("Created test store:", testStore.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
