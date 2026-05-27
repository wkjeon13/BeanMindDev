import { PrismaClient } from '../../node_modules/.prisma/client-stamp/index.js';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({ 
    datasourceUrl: process.env.DATABASE_URL 
});

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;
