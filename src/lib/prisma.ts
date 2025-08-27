// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

/**
 * Use globalThis so this works in both Node (Lambda) and Edge runtimes.
 * We stash the client on a typed global to avoid multiple instances in dev.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Optional: quiet in prod, verbose in dev
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
    // If you want to be explicit about the connection string, uncomment:
    // datasourceUrl: process.env.DATABASE_URL,
  });

// Reuse the client across hot-reloads in dev; in prod each lambda gets its own.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
