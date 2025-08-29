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
  // your custom pages (keep as-is)
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
    /**
     * Ensure the JWT always carries `id` and `role`.
     * - On sign-in: copy from the User object.
     * - If missing later: fetch from DB by token.sub.
     * - Allow role updates via `session.update({ role })` if you ever use it.
     */
    async jwt({ token, user, trigger, session }) {
      // On first sign-in we have a `user` object — copy id & role
      if (user) {
        const id = (user as any).id;
        const role = (user as any).role ?? null;
        token.sub = id; // make sure sub is set
        (token as any).id = id;
        (token as any).role = role;
      }

      // If role missing/stale, hydrate from DB
      if (!(token as any).role && (token.sub || (token as any).id)) {
        const id = (token as any).id ?? token.sub!;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id },
            select: { role: true },
          });
          (token as any).role = dbUser?.role ?? null;
        } catch {
          // ignore; keep token as-is
        }
      }

      // Optional: allow client-side session.update({ role }) to refresh token
      if (trigger === "update" && session && (session as any).role) {
        (token as any).role = (session as any).role;
      }

      return token;
    },

    /**
     * Expose id & role on `session.user` so server routes (and client) can read them.
     */
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id ?? token.sub ?? null;
        (session.user as any).role = (token as any).role ?? null;
      }
      return session;
    },
  },
};

export default authOptions;
