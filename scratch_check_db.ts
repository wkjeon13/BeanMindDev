import { PrismaClient } from './node_modules/.prisma/client-stamp-v2/index.js';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const storeId = '9f431531-680e-4d0b-8a09-d861059a2246';
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { media: true }
  });
  
  console.log('--- STORE DETAILS IN DB ---');
  if (!store) {
    console.log(`Store with ID ${storeId} not found.`);
  } else {
    console.log(`ID: ${store.id}`);
    console.log(`Name: ${store.name}`);
    console.log(`MainImageUrl: ${store.mainImageUrl}`);
    console.log(`CoffeeMenuImageUrl: ${store.coffeeMenuImageUrl}`);
    console.log(`PopularMenuImageUrl: ${store.popularMenuImageUrl}`);
    console.log(`Media count: ${store.media.length}`);
    store.media.forEach((m, idx) => {
      console.log(`  Media[${idx}] -> URL: ${m.url}, Type: ${m.type}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });


