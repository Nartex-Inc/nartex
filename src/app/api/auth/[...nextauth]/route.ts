// src/app/api/auth/[...nextauth]/route.ts

import NextAuth, { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider, { GoogleProfile } from "next-auth/providers/google";
import AzureADProvider, { AzureADProfile } from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      allowDangerousEmailAccountLinking: true,
      profile(profile: AzureADProfile) {
        // --- VITAL DEBUG LOGGING ---
        // This will log the incoming profile from Microsoft to your server logs (AWS CloudWatch).
        // It helps you see the exact data being used for the user ID.
        console.log("Azure AD Profile Received:", profile);

        // The `oid` (Object ID) is the guaranteed unique and immutable identifier for a user
        // in a Microsoft Entra ID tenant. Using `sub` can be problematic in multi-tenant apps.
        // This function ensures NextAuth uses the `oid` as the stable providerAccountId.
        return {
          id: profile.sub, 
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: new Date(),
          firstName: profile.given_name,
          lastName: profile.family_name,
          role: undefined,
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
            throw new Error("Ce compte nécessite une connexion via un fournisseur externe (ex: Google, Microsoft).");
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
    signIn: "/",
    error: "/auth/error", // NextAuth will redirect to this page with an error query param
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
      if (token.id && ( token.role === undefined || token.firstName === undefined )) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, firstName: true, lastName: true, emailVerified: true, name: true, image: true, email: true },
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
