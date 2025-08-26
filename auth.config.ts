// auth.config.ts

import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import AzureAD from 'next-auth/providers/azure-ad';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { Session, User as NextAuthUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

// We remove the invalid 'NextAuthConfig' import and type annotation.
// TypeScript will correctly infer the type from the object itself.
export const authConfig = {
  pages: { signIn: "/", error: "/auth/error" },
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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
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
    authorized({ auth }: { auth: Session | null }) {
        return !!auth?.user;
    },
    jwt({ token, user }: { token: JWT, user?: NextAuthUser }) {
      if (user) {
        token.id = user.id;
        token.role = (user as User).role;
      }
      return token;
    },
    session({ session, token }: { session: Session, token: JWT }) {
      if (session.user && token) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
};
