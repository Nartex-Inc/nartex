import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";

export const authOptions: NextAuthOptions = {
  // Cast to any to prevent version mismatch errors during build
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 /* 7 days */ },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { 
    signIn: "/", 
    error: "/auth/error" 
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
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
      allowDangerousEmailAccountLinking: false,
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

        // Per-email brute-force protection: 5 attempts per 5 minutes
        const email = String(credentials.email).toLowerCase().trim();
        const rl = rateLimit({ key: `login:${email}`, limit: 5, windowMs: 5 * 60_000 });
        if (!rl.success) {
          const mins = Math.ceil(rl.retryAfterMs / 60_000);
          throw new Error(`Trop de tentatives de connexion. Réessayez dans ${mins} minute${mins > 1 ? "s" : ""}.`);
        }

        // Fix: Case-insensitive search for the user
        const user = await prisma.user.findFirst({ 
          where: { 
            email: { equals: String(credentials.email), mode: "insensitive" } 
          } 
        });

        if (!user || !user.password) throw new Error("Aucun utilisateur trouvé ou mot de passe non configuré.");

        // Block sign-in if email is not verified (ISO-27001: enforce email ownership)
        if (!user.emailVerified) {
          throw new Error("Veuillez vérifier votre adresse e-mail avant de vous connecter. Consultez votre boîte de réception.");
        }

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
    // 1. SIGN IN: Enforce signin/signup intent for OAuth providers.
    //    A cookie "auth_intent" is set by the client before initiating OAuth.
    //    - "signin" (default): only allow if user already exists in DB
    //    - "signup": only allow if user does NOT exist in DB
    async signIn({ user, account, profile }) {
      if (
        (account?.provider === "google" || account?.provider === "azure-ad") &&
        user.email
      ) {
        // Read intent cookie (defaults to "signin" for safety)
        let intent = "signin";
        try {
          const cookieStore = await cookies();
          intent = cookieStore.get("auth_intent")?.value || "signin";
        } catch {
          // cookies() may fail outside request context — default to signin
        }

        const existingUser = await prisma.user.findFirst({
          where: { email: { equals: user.email, mode: "insensitive" } },
        });

        if (intent === "signup" && existingUser) {
          // User already has an account — redirect back to login page
          return "/?error=account-exists";
        }

        if (intent === "signin" && !existingUser) {
          // No account found — redirect to signup page
          return "/signup?error=no-account";
        }

        // Sync Google profile image for existing users
        if (account.provider === "google" && existingUser) {
          try {
            const newImage = (profile as any)?.picture;
            if (newImage) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  image: newImage,
                  emailVerified: new Date(),
                },
              });
            }
          } catch {
            // Non-critical — continue sign-in
          }
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
            let dbUser;
            try {
              dbUser = await prisma.user.findUnique({
                where: { email: token.email },
                select: {
                  id: true,
                  name: true,
                  role: true,
                  image: true,
                  canManageTickets: true,
                  tenants: {
                    select: { tenantId: true },
                    take: 1,
                    orderBy: { createdAt: "asc" },
                  },
                },
              });
            } catch {
              // Fallback if canManageTickets column doesn't exist yet
              dbUser = await prisma.user.findUnique({
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
            }

            if (dbUser) {
              token.id = dbUser.id;
              token.name = dbUser.name;
              token.role = dbUser.role as string;
              token.canManageTickets = (dbUser as any).canManageTickets ?? false;
              if (dbUser.image) token.picture = dbUser.image;

              // Process pending invitation (works for both new and existing users)
              if (dbUser.tenants.length === 0) {
                try {
                  const invitation = await prisma.invitation.findFirst({
                    where: {
                      email: { equals: token.email!, mode: "insensitive" },
                      status: "pending",
                      expiresAt: { gt: new Date() },
                    },
                    select: { id: true, role: true, tenantId: true },
                  });

                  if (invitation) {
                    await prisma.user.update({
                      where: { id: dbUser.id },
                      data: { role: invitation.role },
                    });
                    token.role = invitation.role as string;

                    await prisma.userTenant.upsert({
                      where: {
                        userId_tenantId: {
                          userId: dbUser.id,
                          tenantId: invitation.tenantId,
                        },
                      },
                      create: {
                        userId: dbUser.id,
                        tenantId: invitation.tenantId,
                      },
                      update: {},
                    });

                    await prisma.invitation.update({
                      where: { id: invitation.id },
                      data: { status: "accepted" },
                    });

                    token.activeTenantId = invitation.tenantId;
                  }
                } catch (invErr) {
                  console.error("Error processing invitation in jwt:", invErr);
                }
              }

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
      //    Safety net: one-time DB fallback if activeTenantId was never set
      if (!token.activeTenantId && token.email && !token._tenantChecked) {
        token._tenantChecked = true;
        try {
          const fbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: {
              id: true,
              tenants: {
                select: { tenantId: true },
                take: 1,
                orderBy: { createdAt: "asc" },
              },
            },
          });
          if (fbUser) {
            token.id = fbUser.id;
            if (fbUser.tenants[0]) {
              token.activeTenantId = fbUser.tenants[0].tenantId;
              try {
                const t = await prisma.tenant.findUnique({
                  where: { id: token.activeTenantId as string },
                  select: { prextraSchema: true },
                });
                token.prextraSchema = t?.prextraSchema ?? null;
              } catch {
                token.prextraSchema = null;
              }
            }
          }
        } catch {
          // Silently continue — will use cached token
        }
      }

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
        session.user.canManageTickets = token.canManageTickets as boolean;
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
