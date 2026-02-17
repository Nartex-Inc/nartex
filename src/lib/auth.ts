import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  // Cast to any to prevent version mismatch errors during build
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
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: "user",
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
          role: "user",
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
        if (!credentials?.email || !credentials?.password) throw new Error("Adresse e-mail et mot de passe requis.");
        
        // Fix: Case-insensitive search for the user
        const user = await prisma.user.findFirst({ 
          where: { 
            email: { equals: String(credentials.email), mode: "insensitive" } 
          } 
        });

        if (!user || !user.password) throw new Error("Aucun utilisateur trouvé ou mot de passe non configuré.");
        
        const isPasswordCorrect = await bcrypt.compare(String(credentials.password), user.password);
        if (!isPasswordCorrect) throw new Error("Mot de passe incorrect.");

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role as string 
        };
      },
    }),
  ],
  callbacks: {
    // 1. SIGN IN: Force the Database to update with the Google Image
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.email) {
        try {
          // Get the image URL directly from the Google profile
          const newImage = (profile as any)?.picture;
          
          if (newImage) {
            await prisma.user.update({
              where: { email: user.email },
              data: { 
                image: newImage,
                emailVerified: new Date() // Trust Google verification
              }
            });
          }
        } catch (error) {
          console.error("Error syncing Google profile data:", error);
        }
      }
      return true;
    },

    // 2. JWT: Populate token on sign-in, update on explicit session changes.
    //    DB queries run ONLY on sign-in and session update — not every request.
    async jwt({ token, user, trigger, session }) {
      // A) Explicit session update (role change, tenant switch from UI)
      if (trigger === "update" && session?.user) {
        if (session.user.role) token.role = session.user.role;
        if (session.user.activeTenantId !== undefined) {
          token.activeTenantId = session.user.activeTenantId;
          if (session.user.activeTenantId) {
            try {
              const tenant = await prisma.tenant.findUnique({
                where: { id: session.user.activeTenantId },
                select: { prextraSchema: true },
              });
              token.prextraSchema = tenant?.prextraSchema ?? null;
            } catch {
              token.prextraSchema = null;
            }
          } else {
            token.prextraSchema = null;
          }
        }
        return token;
      }

      // B) Initial sign-in — populate token from DB once
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "user";
        if (user.image) token.picture = user.image;

        // Fetch authoritative role + default tenant from DB
        if (token.email) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: token.email },
              select: {
                id: true,
                name: true,
                role: true,
                image: true,
                tenants: {
                  select: { tenantId: true },
                  take: 1,
                  orderBy: { createdAt: "asc" },
                },
              },
            });

            if (dbUser) {
              token.id = dbUser.id;
              token.name = dbUser.name;
              token.role = dbUser.role as string;
              if (dbUser.image) token.picture = dbUser.image;
              if (!token.activeTenantId && dbUser.tenants.length > 0) {
                token.activeTenantId = dbUser.tenants[0].tenantId;
              }
            }
          } catch (error) {
            console.error("Error loading user data on sign-in:", error);
          }
        }

        // Resolve prextraSchema for the active tenant
        if (token.activeTenantId) {
          try {
            const tenant = await prisma.tenant.findUnique({
              where: { id: token.activeTenantId as string },
              select: { prextraSchema: true },
            });
            token.prextraSchema = tenant?.prextraSchema ?? null;
          } catch {
            token.prextraSchema = null;
          }
        }

        if (!token.activeTenantId) token.activeTenantId = null;
        if (!token.prextraSchema) token.prextraSchema = null;
        return token;
      }

      // C) Subsequent requests — use cached token, zero DB queries
      if (!token.activeTenantId) token.activeTenantId = null;
      if (token.prextraSchema === undefined) token.prextraSchema = null;

      return token;
    },

    // 3. SESSION: Pass the token image + active tenant to the client
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.activeTenantId = token.activeTenantId as string | null;
        session.user.prextraSchema = token.prextraSchema as string | null;
        session.user.image = token.picture;
      }
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // Malformed URL — fall through to default
      }
      return baseUrl + "/dashboard";
    },
  },
};
