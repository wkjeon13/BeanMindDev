import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const s = await prisma.shop.findMany({
        where: {
            OR: [
                {name: {contains: '성수'}}, 
                {address: {contains: '성수'}}
            ]
        }
    });
    console.log(JSON.stringify(s.map(x=>({
        name: x.name, 
        status: x.status, 
        lat: x.lat, 
        lng: x.lng
    })), null, 2));
}
main().finally(() => prisma.$disconnect());
