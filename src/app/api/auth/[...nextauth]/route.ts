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

    // --- UPDATED AZURE AD PROVIDER CONFIGURATION ---
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      // Explicitly define authorization object to ensure v2.0 endpoint usage
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
      allowDangerousEmailAccountLinking: true,
      profile(profile: AzureADProfile) {
        // This log is critical for debugging. Check your server logs (e.g., AWS CloudWatch)
        // for this output on both a successful signup and a failed login to compare.
        console.log("Azure AD Profile Received on callback:", JSON.stringify(profile, null, 2));

        // The 'sub' claim is the correct, immutable, unique ID for the user.
        // It's used to link the external account to the user in your database.

        // Safely handle the 'picture' claim, which is not always provided by Azure.
        // Setting it to null prevents errors. It can be fetched later via Graph API if needed.
        return {
          id: profile.sub, // This becomes the `providerAccountId` in the database.
          name: profile.name,
          email: profile.email,
          image: null, // Set to null to be safe.
          emailVerified: new Date(), // Azure AD federated accounts are considered verified.
          firstName: profile.given_name,
          lastName: profile.family_name,
          role: undefined, // Role should be managed by your app, not from the provider profile.
        };
      },
    }),
    // --- END OF UPDATED SECTION ---
      
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
    error: "/auth/error",
  },
  callbacks: {
    // NEW SIGN-IN CALLBACK
    async signIn({ user, account }) {
      // Allow sign-in if email is already verified
      if (user.emailVerified) return true;
      
      // Bypass email verification for Azure AD users
      if (account?.provider === "azure-ad") return true;
      
      // Block sign-in for other unverified accounts
      return false;
    },

    async jwt({ token, user, account }) {
      // Set JWT token properties from user object
      if (user) {
        token.sub = user.id; // Use sub as stable user identifier
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

      // Fetch additional user data if needed
      if (token.sub && (token.role === undefined || token.firstName === undefined)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub }, // Changed to use token.sub
          select: { 
            role: true, 
            firstName: true, 
            lastName: true, 
            emailVerified: true, 
            name: true, 
            image: true, 
            email: true 
          },
        });
        
        if (dbUser) {
          token.role = dbUser.role;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.emailVerified = dbUser.emailVerified;
          token.name = dbUser.name || token.name;
          token.picture = dbUser.image || token.picture;
          token.email = dbUser.email || token.email;
        }
      }
      
      return token;
    },

    // UPDATED SESSION CALLBACK
    async session({ session, token }) {
      if (token && session.user) {
        // Use token.sub as the stable user ID
        session.user.id = token.sub as string;
        session.user.role = token.role as string | undefined | null;
        session.user.firstName = token.firstName as string | undefined | null;
        session.user.lastName = token.lastName as string | undefined | null;
        session.user.emailVerified = token.emailVerified as Date | undefined | null;
        
        // Set optional properties
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
    
    async redirect({ url, baseUrl }) {
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        if (new URL(url).origin === baseUrl) return url;
        return baseUrl + "/dashboard";
    },
  },
  // Add logging for easier debugging
  logger: {
    error(code, metadata) {
      console.error("NextAuth Error:", code, metadata);
    },
    warn(code) {
      console.warn("NextAuth Warning:", code);
    },
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
