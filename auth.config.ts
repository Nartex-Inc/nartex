// auth.config.ts

import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import AzureAD from 'next-auth/providers/azure-ad';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';

// We remove the ': NextAuthConfig' type annotation and let TypeScript infer it.
// This is the correct pattern for NextAuth v5.
export const authConfig = {
  pages: { signIn: "/", error: "/auth/error" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
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
    // Using an empty authorized callback is a common pattern to just check for a session
    authorized({ auth }: { auth: any }) {
        return !!auth?.user;
    },
    jwt({ token, user }: { token: any, user: any }) {
      if (user) {
        token.id = user.id;
        token.role = (user as User).role;
      }
      return token;
    },
    session({ session, token }: { session: any, token: any }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
