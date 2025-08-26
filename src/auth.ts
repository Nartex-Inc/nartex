// src/auth.ts
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './lib/prisma';
import { authConfig } from '../auth.config'; // Import the safe config

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig, // Spread the safe config
  adapter: PrismaAdapter(prisma), // Add the adapter here
  session: { strategy: 'jwt' },
});
