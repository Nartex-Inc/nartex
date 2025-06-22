// src/app/api/auth/[...nextauth]/route.ts (FINAL AND CORRECTED)

import NextAuth, { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider, { GoogleProfile } from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad"; // --- ADD THIS IMPORT ---
import type { Profile as AzureADProfile } from "next-auth/providers/azure-ad"; // --- (Optional but good practice)
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Your diagnostic logs are good, we can leave them for now.
console.log("--- INITIALIZING NEXTAUTH ---");
console.log("AZURE_AD_CLIENT_ID is set:", !!process.env.AZURE_AD_CLIENT_ID);
console.log("AZURE_AD_CLIENT_SECRET is set:", !!process.env.AZURE_AD_CLIENT_SECRET);
console.log("AZURE_AD_TENANT_ID value:", process.env.AZURE_AD_TENANT_ID);
console.log("----------------------------");

const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      profile(profile: GoogleProfile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,
          firstName: profile.given_name,
          lastName: profile.family_name,
          role: undefined,
        };
      },
    }),

    // --- ADD THIS ENTIRE BLOCK FOR AZURE AD ---
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      allowDangerousEmailAccountLinking: true,
      profile(profile: AzureADProfile) {
        // The profile function maps Azure AD's data to your User model.
        // This is crucial for the Prisma adapter to create a user correctly.
        return {
          id: profile.sub, // `sub` is the standard unique identifier for the user.
          name: profile.name,
          email: profile.email,
          image: null, // Azure AD does not provide a standard 'picture' URL in the token.
          emailVerified: null, // You would need a custom flow to verify email from Azure.
          firstName: profile.given_name,
          lastName: profile.family_name,
          role: undefined, // Let the database default (`user`) apply for new users.
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
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) { throw new Error("Aucun utilisateur trouvé avec cet e-mail."); }
        if (!user.password) { throw new Error("Ce compte nécessite une connexion via un fournisseur externe (ex: Google)."); }
        if (!user.emailVerified) { throw new Error("Veuillez vérifier votre adresse e-mail avant de vous connecter."); }
        const isValidPassword = await bcrypt.compare(credentials.password, user.password);
        if (!isValidPassword) { throw new Error("Mot de passe incorrect."); }
        return user; // Return the full user object from the DB
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  
  // --- CORRECTED ---
  // Removing the `signIn` page prevents client-side redirect conflicts
  // when calling signIn() from a page that is not the root.
  pages: {
    error: "/auth/error", 
  },

  callbacks: {
    // Your JWT and Session callbacks are complex but appear correct for
    // persisting user data into the token and session.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.emailVerified = token.emailVerified;
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
