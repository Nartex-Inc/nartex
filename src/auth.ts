// src/auth.ts
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./lib/prisma";
import { authConfig } from "../auth.config";

import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";

// Minimal shape we need from the DB user (avoid importing a non-existent type)
type DbUser = {
  id: string;
  role?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export const authOptions: NextAuthOptions = {
  // Pages from your config
  pages: authConfig.pages,

  // Core
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,

  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        return ok ? user : null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as DbUser;
        token.id = u.id;
        (token as any).role = u.role ?? null;
        (token as any).firstName = u.firstName ?? null;
        (token as any).lastName = u.lastName ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = (token as any).role ?? null;
        (session.user as any).firstName = (token as any).firstName ?? null;
        (session.user as any).lastName = (token as any).lastName ?? null;
      }
      return session;
    },
  },
};
