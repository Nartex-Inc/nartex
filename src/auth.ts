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
      authorization: { params: { scope: "openid email profile" } },
      // Map Google "picture" → user.image when it’s present
      profile(profile) {
        return {
          id: (profile as any).sub,
          name:
            (profile as any).name ??
            [(profile as any).given_name, (profile as any).family_name].filter(Boolean).join(" "),
          email: (profile as any).email,
          image: (profile as any).picture ?? null,
        };
      },
    }), // <-- REQUIRED comma here

    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "organizations",
      allowDangerousEmailAccountLinking: true,
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

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id ?? token.sub ?? null;
        (session.user as any).role = (token as any).role ?? "user";
      }
      return session;
    },

    /** Ensure user image is populated/updated on every OAuth sign-in. */
    async signIn({ user, account, profile }) {
      if (!user || !account) return true;

      // --- GOOGLE ---
      if (account.provider === "google") {
        let picture: string | null =
          profile && (profile as any).picture ? String((profile as any).picture) : null;

        // Fallback: fetch userinfo with access_token if profile.picture is missing
        if (!picture && (account as any).access_token) {
          try {
            const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${(account as any).access_token}` },
            });
            if (r.ok) {
              const ui = await r.json();
              if (ui && ui.picture) picture = String(ui.picture);
            }
          } catch {}
        }

        if (picture && user.image !== picture) {
          await prisma.user.update({ where: { id: user.id }, data: { image: picture } });
        }
      }

      // --- AZURE / ENTRA ---
      if (account.provider === "azure-ad" && (account as any).access_token) {
        try {
          const res = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
            headers: { Authorization: `Bearer ${(account as any).access_token}` },
          });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
            if (user.image !== dataUrl) {
              await prisma.user.update({ where: { id: user.id }, data: { image: dataUrl } });
            }
          }
        } catch {}
      }

      return true;
    },
  },

  /** Also enrich image immediately when a provider is newly linked. */
  events: {
    async linkAccount({ user, account }) {
      if (!user || !account) return;

      if (account.provider === "azure-ad" && (account as any).access_token) {
        const dataUrl = await fetchAzurePhotoDataUrl((account as any).access_token as string);
        if (dataUrl && user.image !== dataUrl) {
          await prisma.user.update({ where: { id: user.id }, data: { image: dataUrl } });
        }
      }
      // (Google is handled on next sign-in; you could also fetch userinfo here similarly.)
    },
  },
};

export default authOptions;
