// src/app/api/auth/[...nextauth]/route.ts

import NextAuth, { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider, { GoogleProfile } from "next-auth/providers/google";
import AzureADProvider, { AzureADProfile } from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Define authOptions
export const authOptions: NextAuthOptions = {
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
          role: undefined, // Let the DB handle the default role on creation
        };
      },
    }),

    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      
      // --- ADDED FOR CONSISTENCY WITH GOOGLE PROVIDER ---
      allowDangerousEmailAccountLinking: true,
      profile(profile: AzureADProfile) {
        // The `oid` claim is the Object ID and is a stable identifier for the user.
        // The `sub` claim can change for the same user over time, so `oid` is preferred for the user ID.
        return {
          id: profile.oid, 
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // Entra ID doesn't send a simple email_verified boolean. We assume if a user can log in
          // via an org's IdP, their email is de facto verified.
          emailVerified: new Date(),
          firstName: profile.given_name,
          lastName: profile.family_name,
          role: undefined, // Let the DB handle the default role on creation
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
            // Updated error message to include Microsoft
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
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // This callback logic should work for all providers as it pulls from the generic `user` object.
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
      
      // Refresh user data in token if it's missing (e.g., on subsequent loads)
      if (token.id && (token.role === undefined || token.firstName === undefined)) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (dbUser) {
          token.role = dbUser.role;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.emailVerified = dbUser.emailVerified;
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
