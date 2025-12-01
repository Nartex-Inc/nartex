// src/app/api/auth/[...nextauth]/auth-options.ts
// NextAuth.js configuration with role support for returns management

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // 1. Google Provider (For @sinto.ca users)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    // 2. Azure AD Provider
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      allowDangerousEmailAccountLinking: true,
    }),
    // 3. Credentials Provider
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        // Note: Prisma maps 'password' to 'password_hash' automatically in your schema
        if (!user || !user.password) {
          throw new Error("Utilisateur non trouvé");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Mot de passe incorrect");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // If session is updated via client-side update(), reflect changes
      if (trigger === "update" && session?.user) {
        token.role = session.user.role;
      }

      if (user) {
        token.id = user.id;
        // Initial sign-in: use user object role or default
        token.role = (user as any).role || "user";
      }

      // CRITICAL: Always refresh role from DB for existing tokens
      // This ensures if you change a role in DB, the user gets it on next refresh/signin
      if (token.email) {
         const dbUser = await prisma.user.findUnique({ 
            where: { email: token.email },
            select: { role: true } 
         });
         if (dbUser) {
             token.role = dbUser.role;
         }
      }

      return token;
    },
    async session({ session, token }) {
      // Pass properties to the client
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
