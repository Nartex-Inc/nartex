// src/app/api/auth/[...nextauth]/route.ts

import NextAuth, { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider, { GoogleProfile } from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

console.log("--- INITIALIZING NEXTAUTH ---");
console.log("AZURE_AD_CLIENT_ID is set:", !!process.env.AZURE_AD_CLIENT_ID);
console.log("AZURE_AD_CLIENT_SECRET is set:", !!process.env.AZURE_AD_CLIENT_SECRET);
console.log("AZURE_AD_TENANT_ID value:", process.env.AZURE_AD_TENANT_ID);
console.log("----------------------------");

// Define authOptions but DO NOT export it from this file
const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,

      // --- THIS IS THE ADDED LOGIC ---
      // This allows users who signed up with email/password to later
      // sign in with Google using the same email address. The accounts
      // will be automatically linked by the Prisma adapter.
      allowDangerousEmailAccountLinking: true,

      // The profile function maps the provider's profile to the User model structure.
      profile(profile: GoogleProfile) {
        return {
          // Standard fields NextAuth expects or uses for linking/user creation
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,

          // Custom fields that are part of our augmented User model in next-auth.d.ts
          firstName: profile.given_name,
          lastName: profile.family_name,
          role: undefined, // Allows the database default for `role` to apply on new user creation.
        };
      },
    }),
    CredentialsProvider({
      name: "Email + Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<NextAuthUser | null> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Adresse e-mail et mot de passe requis.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("Aucun utilisateur trouvé avec cet e-mail.");
        }
        if (!user.password) {
            throw new Error("Ce compte nécessite une connexion via un fournisseur externe (ex: Google).");
        }
        if (!user.emailVerified) {
          throw new Error("Veuillez vérifier votre adresse e-mail avant de vous connecter.");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);
        if (!isValidPassword) {
          throw new Error("Mot de passe incorrect.");
        }

        return {
          id: user.id,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
          image: user.image,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          role: user.role,
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    // The signIn line has been completely removed.
    error: "/auth/error", 
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;

        const fullUser = user as NextAuthUser & {
          role?: string | null;
          firstName?: string | null;
          lastName?: string | null;
        };

        token.role = fullUser.role;
        token.firstName = fullUser.firstName;
        token.lastName = fullUser.lastName;
        token.emailVerified = fullUser.emailVerified as Date | null;

        if (fullUser.name) token.name = fullUser.name;
        if (fullUser.image) token.picture = fullUser.image;
        if (fullUser.email) token.email = fullUser.email;
      }

      if (token.id && (
          token.role === undefined ||
          token.firstName === undefined ||
          token.lastName === undefined ||
          token.emailVerified === undefined
        )
      ) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            firstName: true,
            lastName: true,
            emailVerified: true,
            name: true,
            image: true,
            email: true,
          },
        });

        if (dbUser) {
          if (token.role === undefined) token.role = dbUser.role;
          if (token.firstName === undefined) token.firstName = dbUser.firstName;
          if (token.lastName === undefined) token.lastName = dbUser.lastName;
          if (token.emailVerified === undefined) token.emailVerified = dbUser.emailVerified;
          if (token.name === undefined && dbUser.name) token.name = dbUser.name;
          if (token.picture === undefined && dbUser.image) token.picture = dbUser.image;
          if (token.email === undefined && dbUser.email) token.email = dbUser.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string | undefined | null;
        session.user.firstName = token.firstName as string | undefined | null;
        session.user.lastName = token.lastName as string | undefined | null;
        session.user.emailVerified = token.emailVerified as Date | undefined | null;
        
        if (token.name) session.user.name = token.name;
        if (token.email) session.user.email = token.email;
        if (token.picture) session.user.image = token.picture;
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
