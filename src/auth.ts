// src/auth.ts

import NextAuth from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { User } from "@prisma/client";

// --- THIS IS THE FIX ---
// Changed from "@/lib/prisma" to a direct relative path.
import prisma from "./lib/prisma";

import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/", error: "/auth/error" },

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
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          throw new Error("Aucun utilisateur trouvé ou mot de passe non configuré.");
        }
        if (!user.emailVerified) {
          throw new Error("Veuillez vérifier votre adresse e--mail avant de vous connecter.");
        }

        const isPasswordCorrect = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordCorrect) {
          throw new Error("Mot de passe incorrect.");
        }

        // Return the full user object to be used in the JWT callback
        return user;
      },
    }),
  ],
  
  callbacks: {
    // This callback runs whenever a JWT is created or updated.
    // The `user` object is only passed on the initial sign-in.
    async jwt({ token, user }) {
      if (user) {
        // On the first sign-in, add the user's ID and role to the token
        token.id = user.id;
        token.role = (user as User).role; // Cast user to your custom User type
      }
      return token;
    },

    // This callback runs whenever a session is accessed.
    // It uses the data from the JWT to populate the session object.
    async session({ session, token }) {
      if (session.user && token) {
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
});
