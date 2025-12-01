// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  // Cast adapter to 'any' to fix the "not assignable" build error caused by version mismatch
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { 
    signIn: "/", 
    error: "/auth/error" 
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub ?? "google_id",
          name: profile.name ?? "",
          email: profile.email ?? "",
          image: profile.picture ?? null,
          role: "user", // Must be a string to satisfy your custom User type
        };
      },
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub ?? profile.oid ?? "azure_id",
          name: profile.name ?? "",
          email: profile.email ?? profile.preferred_username ?? "",
          image: null,
          role: "user", // Must be a string to satisfy your custom User type
        };
      },
    }),
    CredentialsProvider({
      name: "Email + Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Adresse e-mail et mot de passe requis.");
        }
        
        const user = await prisma.user.findUnique({ 
          where: { email: String(credentials.email).toLowerCase() } 
        });

        if (!user || !user.password) {
          throw new Error("Utilisateur introuvable.");
        }
        
        const isPasswordCorrect = await bcrypt.compare(String(credentials.password), user.password);
        if (!isPasswordCorrect) throw new Error("Mot de passe incorrect.");

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role // This fetches the real role from DB
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.user) {
        token.role = session.user.role;
      }

      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "user";
      }

      // CRITICAL FIX: Refresh role from DB
      if (token.email) {
         try {
           const dbUser = await prisma.user.findUnique({ 
              where: { email: token.email },
              select: { id: true, role: true } 
           });
           
           if (dbUser) {
               token.id = dbUser.id;
               token.role = dbUser.role;
           }
         } catch (error) {
           console.error("Error refreshing role:", error);
         }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl + "/dashboard";
    },
  },
};
