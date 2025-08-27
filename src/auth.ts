import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./lib/prisma";
import { authConfig } from "../auth.config";

import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  pages: authConfig.pages,
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
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.password) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        return ok ? user : null;
      },
    }),
  ],
  callbacks: {
    // keep your existing logic
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as User).id;
        token.role = (user as User).role;
        token.firstName = (user as User).firstName ?? null;
        token.lastName = (user as User).lastName ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string | null | undefined;
        (session.user as any).firstName = token.firstName ?? null;
        (session.user as any).lastName = token.lastName ?? null;
      }
      return session;
    },
  },
};
