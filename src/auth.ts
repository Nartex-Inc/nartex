// src/auth.ts
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./lib/prisma";
import { authConfig } from "../auth.config";

import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  // Required in prod – same value on every ECS task
  secret: process.env.NEXTAUTH_SECRET,

  // Important behind Cloudflare/ALB
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV === "production",

  pages: authConfig.pages,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  providers: [
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          allowDangerousEmailAccountLinking: true,
        })
      : null,

    process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET
      ? AzureADProvider({
          clientId: process.env.AZURE_AD_CLIENT_ID!,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
          tenantId: process.env.AZURE_AD_TENANT_ID || "organizations",
          allowDangerousEmailAccountLinking: true,
        })
      : null,

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
        if (!ok) return null;

        // Return a minimal, normalized object
        return {
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          image: user.image ?? null,
          role: (user as any).role,
        } as any;
      },
    }),
  ].filter(Boolean) as any,

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = (token as any).id;
        (session.user as any).role = (token as any).role;
      }
      return session;
    },
  },
};

export default authOptions;
