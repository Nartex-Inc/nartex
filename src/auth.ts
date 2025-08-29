// src/auth.ts
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
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "organizations",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email) },
        });
        if (!user || !user.password) return null;
        const ok = await bcrypt.compare(String(credentials.password), user.password);
        return ok ? (user as unknown as User) : null;
      },
    }),
  ].filter(Boolean) as any,

  callbacks: {
    // Always carry id + role in the JWT. If role is missing (old token), hydrate from DB.
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role ?? "user";
      }
      if (!(token as any).role && token.sub) {
        try {
          const db = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true },
          });
          (token as any).role = db?.role ?? "user";
        } catch {
          // swallow
        }
      }
      return token;
    },

    // Mirror id + role into the session object that getServerSession() returns.
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id ?? token.sub ?? null;
        (session.user as any).role = (token as any).role ?? "user";
      }
      return session;
    },
  },
};

export default authOptions;
