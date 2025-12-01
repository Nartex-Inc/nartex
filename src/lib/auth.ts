// src/lib/auth.ts
import "server-only";
import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
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
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // We set role to null here so the JWT callback knows to fetch it
          role: null, 
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
          id: profile.sub ?? profile.oid,
          name: profile.name,
          email: profile.email ?? profile.preferred_username,
          image: null,
          role: null,
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
          throw new Error("Aucun utilisateur trouvé ou mot de passe non configuré.");
        }
        
        // Optional: Comment out if you want to allow unverified users for now
        // if (!user.emailVerified) throw new Error("Veuillez vérifier votre adresse e-mail.");

        const isPasswordCorrect = await bcrypt.compare(String(credentials.password), user.password);
        if (!isPasswordCorrect) throw new Error("Mot de passe incorrect.");

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role 
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 1. Handle client-side updates
      if (trigger === "update" && session?.user) {
        token.role = session.user.role;
      }

      // 2. Initial sign-in
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }

      // 3. CRITICAL FIX: Always refresh role from DB using email
      // This ensures that even if the provider returns null/undefined,
      // we fetch the REAL role ("Gestionnaire") from Postgres.
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
           console.error("Error refreshing user role:", error);
         }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl + "/dashboard";
    },
  },
} satisfies NextAuthConfig;
