// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// This is the official Prisma recommendation for ensuring only one instance
// of PrismaClient is created in a serverless environment like Vercel or AWS.

// We declare a global variable to hold the Prisma instance.
// This is necessary because in a serverless environment, a new instance might be
// created on every function invocation, quickly exhausting database connections.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Check if an instance already exists on the global object.
// If not, create a new one. In a development environment, this file might be
// re-run due to hot-reloading, so we reuse the existing global instance.
const prisma =
  global.prisma ||
  new PrismaClient({
    // You can uncomment this line during development to see all database queries.
    // log: ['query', 'info', 'warn', 'error'],
  });

// In a non-production environment, we attach the new instance to the global
// object to ensure it's reused across hot-reloads.
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
