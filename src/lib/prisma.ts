import { PrismaClient } from '@prisma/client';

/**
 * Universal (Node/Edge) Prisma singleton.
 * Prevents exhausting DB connections during HMR / serverless cold starts.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
    // datasourceUrl: process.env.DATABASE_URL, // optional explicit wiring
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
