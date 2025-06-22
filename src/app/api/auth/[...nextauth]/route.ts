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

      authorization: {
        params: {
          prompt: "select_account",
        }
      },
      
      profile(profile: AzureADProfile) {
        // Use both oid and sub for maximum compatibility
        console.log("Azure AD Profile Received:", JSON.stringify(profile, null, 2));
        
        return {
          id: profile.sub, // Primary identifier
          azureOid: profile.oid, // Store Azure-specific OID separately
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
    signOut: "/",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log(`SignIn callback triggered for ${user.email} via ${account?.provider}`);
      
      // Always allow Azure AD users
      if (account?.provider === "azure-ad") {
        console.log("Allowing Azure AD user without email verification");
        return true;
      }
      
      // Allow users with verified emails
      if (user.emailVerified) {
        console.log("Allowing user with verified email");
        return true;
      }
      
      console.log("Blocking sign-in for unverified non-Azure user");
      return false;
    },

    async jwt({ token, user, account, profile }) {
      // Initial sign-in - populate token from user object
      if (user) {
        console.log(`JWT callback for new user: ${user.email}`);
        token.sub = user.id;
        
        const fullUser = user as NextAuthUser & {
          role?: string | null;
          firstName?: string | null;
          lastName?: string | null;
          azureOid?: string | null;
        };
        
        token.role = fullUser.role;
        token.firstName = fullUser.firstName;
        token.lastName = fullUser.lastName;
        token.emailVerified = fullUser.emailVerified as Date | null;
        token.azureOid = fullUser.azureOid; // Capture Azure OID if present
        
        if (fullUser.name) token.name = fullUser.name;
        if (fullUser.image) token.picture = fullUser.image;
        if (fullUser.email) token.email = fullUser.email;
      }
      
      // Subsequent calls - refresh user data if needed
      if (token.sub && (
        token.role === undefined || 
        token.firstName === undefined ||
        token.emailVerified === undefined
      )) {
        console.log(`Refreshing user data for ${token.sub}`);
        
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
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
      
      console.log("JWT token content:", JSON.stringify(token, null, 2));
      return token;
    },

    async session({ session, token }) {
      console.log("Session callback triggered");
      
      if (token && session.user) {
        // Core user information
        session.user.id = token.sub as string;
        session.user.role = token.role as string | null | undefined;
        session.user.email = token.email as string | null | undefined;
        
        // Personal details
        session.user.name = token.name as string | null | undefined;
        session.user.firstName = token.firstName as string | null | undefined;
        session.user.lastName = token.lastName as string | null | undefined;
        session.user.image = token.picture as string | null | undefined;
        
        // Verification status
        session.user.emailVerified = token.emailVerified as Date | null | undefined;
        
        // Azure-specific information
        if (token.azureOid) {
          session.user.azureOid = token.azureOid as string;
        }
      }
      
      console.log("Session content:", JSON.stringify(session, null, 2));
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      console.log(`Redirect callback: ${url} (base: ${baseUrl})`);
      
      // Prevent open redirects
      const safeUrl = url.startsWith("/") 
        ? `${baseUrl}${url}`
        : new URL(url).origin === baseUrl
          ? url
          : `${baseUrl}/dashboard`;
      
      console.log(`Redirecting to: ${safeUrl}`);
      return safeUrl;
    },
  },
  events: {
    async signIn(message) {
      console.log("SignIn event:", JSON.stringify(message, null, 2));
    },
    async signOut(message) {
      console.log("SignOut event:", message);
    },
    async createUser(message) {
      console.log("User created:", JSON.stringify(message.user, null, 2));
    },
    async linkAccount(message) {
      console.log("Account linked:", JSON.stringify(message, null, 2));
    },
    async error(message) {
      console.error("NextAuth error:", JSON.stringify(message, null, 2));
    }
  },
  logger: {
    error(code, metadata) {
      console.error("NextAuth Error:", code, metadata);
    },
    warn(code) {
      console.warn("NextAuth Warning:", code);
    },
    debug(code, metadata) {
      console.debug("NextAuth Debug:", code, metadata);
    }
  },
  debug: true, // Always enable debug for now
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
