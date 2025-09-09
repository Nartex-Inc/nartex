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

/** Optional helper: fetch Azure AD photo from Microsoft Graph */
async function fetchAzurePhotoDataUrl(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null; // many tenants don't expose photos
    const buf = Buffer.from(await res.arrayBuffer());
    // Graph most commonly returns JPEG; if you need detection, add HEAD to /me/photo.
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  pages: authConfig.pages,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
      // Ensure we actually request the profile scope and map picture → image.
      authorization: { params: { scope: "openid email profile" } },
      profile(profile) {
        return {
          id: (profile as any).sub,
          name: (profile as any).name ?? [(profile as any).given_name, (profile as any).family_name].filter(Boolean).join(" "),
          email: (profile as any).email,
          image: (profile as any).picture ?? null,
        };
      },
    }),

    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "organizations",
      allowDangerousEmailAccountLinking: true,
      // Profile typically won't include a photo; we'll enrich it in callbacks below.
      authorization: { params: { scope: "openid email profile offline_access" } },
      profile(profile) {
        return {
          id: (profile as any).sub ?? (profile as any).oid ?? (profile as any).id,
          name: (profile as any).name ?? null,
          email:
            (profile as any).email ??
            (profile as any).preferred_username ??
            (profile as any).upn ??
            null,
          image: null,
        };
      },
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: String(credentials.email) } });
        if (!user || !user.password) return null;
        const ok = await bcrypt.compare(String(credentials.password), user.password);
        return ok ? (user as unknown as User) : null;
      },
    }),
  ].filter(Boolean) as any,

  callbacks: {
    /** Keep your existing JWT enrichment */
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role ?? "user";
      }
      if (!(token as any).role && token.sub) {
        try {
          const db = await prisma.user.findUnique({ where: { id: token.sub }, select: { role: true } });
          (token as any).role = db?.role ?? "user";
        } catch {}
      }
      return token;
    },

    /** Keep your existing session enrichment */
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id ?? token.sub ?? null;
        (session.user as any).role = (token as any).role ?? "user";
      }
      return session;
    },

    /**
     * CRITICAL: ensure user image is (re)populated/updated on every sign-in,
     * even if the account already existed before provider linking.
     */
    async signIn({ user, account, profile }) {
      if (!user || !account) return true;

      // Google → use profile.picture when present
      if (account.provider === "google" && profile && (profile as any).picture) {
        const picture = (profile as any).picture as string;
        if (picture && user.image !== picture) {
          await prisma.user.update({ where: { id: user.id }, data: { image: picture } });
        }
      }

      // Azure AD → try Graph photo (requires User.Read delegated permission consented)
      if (account.provider === "azure-ad" && (account as any).access_token) {
        const dataUrl = await fetchAzurePhotoDataUrl((account as any).access_token as string);
        if (dataUrl && user.image !== dataUrl) {
          await prisma.user.update({ where: { id: user.id }, data: { image: dataUrl } });
        }
      }

      return true;
    },
  },

  /**
   * Also handle the case where a user *links* a provider after the account exists.
   * This mirrors the signIn logic so linking immediately enriches `users.image`.
   */
  events: {
    async linkAccount({ user, account }) {
      if (!user || !account) return;

      if (account.provider === "google" && (account as any).id_token) {
        // If you prefer, you can decode the id_token to extract `picture`.
        // Simpler: ask Google userinfo (requires extra fetch). Often unnecessary because
        // the next signIn will run anyway; but we keep parity with signIn for immediacy.
      }

      if (account.provider === "azure-ad" && (account as any).access_token) {
        const dataUrl = await fetchAzurePhotoDataUrl((account as any).access_token as string);
        if (dataUrl && user.image !== dataUrl) {
          await prisma.user.update({ where: { id: user.id }, data: { image: dataUrl } });
        }
      }
    },
  },
};

export default authOptions;
