// src/lib/prisma.ts

import { PrismaClient } from '@prisma/client';

// This declares a global variable 'prisma' but only for TypeScript's type-checking.
// It allows us to safely attach our Prisma client to the global scope.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// This line is the core of the fix. It does the following:
// 1. Looks for an existing Prisma client on the global object (`globalThis.prisma`).
// 2. If it doesn't find one, it creates a `new PrismaClient()`.
// This prevents creating multiple clients during development hot-reloads.
const prisma = globalThis.prisma || new PrismaClient({
  // log: ['query'], // Uncomment for detailed query logging if needed
});

// In non-production environments, we store the created client on the global object
// so it can be reused across hot-reloads.
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Export the single, shared Prisma client instance.
export default prisma;
