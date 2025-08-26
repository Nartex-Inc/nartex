// src/auth.ts
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './lib/prisma';
import { authConfig } from '../auth.config'; // Import the safe base config

import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import AzureAD from 'next-auth/providers/azure-ad';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig, // Spread the safe config (pages, authorized callback)
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email as string } });
        if (!user || !user.password) return null;
        const isValid = await bcrypt.compare(credentials.password as string, user.password);
        return isValid ? user : null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks, // Keep the authorized callback
    // Add the database-dependent JWT and session callbacks here
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as User).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});
