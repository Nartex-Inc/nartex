// src/app/api/auth/[...nextauth]/route.ts
import "server-only";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// deliberately untyped to avoid next-auth v4/v5 type mismatches in CI
const authOptions: any = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      profile(profile: any) {
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
      authorization: { params: { scope: "openid profile email User.Read" } },
      allowDangerousEmailAccountLinking: true,
      profile(profile: any) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: null,
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Adresse e-mail et mot de passe requis.");
        }
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) throw new Error("Aucun utilisateur trouvé avec cet e-mail.");
        if (!user.password) {
          throw new Error("Ce compte nécessite une connexion via un fournisseur externe (ex: Google, Microsoft).");
        }
        if (!user.emailVerified) {
          throw new Error("Veuillez vérifier votre adresse e-mail avant de vous connecter.");
        }
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) throw new Error("Mot de passe incorrect.");
        return {
          id: user.id,
          name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
          email: user.email,
          image: user.image,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          role: user.role,
        } as any;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/", error: "/auth/error" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "azure-ad") return true;
      return !!(user as any)?.emailVerified;
    },
    async jwt({ token, user }) {
      if (user) {
        const u: any = user;
        token.sub = u.id;
        token.role = u.role;
        token.firstName = u.firstName;
        token.lastName = u.lastName;
        token.emailVerified = u.emailVerified;
        if (u.name) token.name = u.name;
        if (u.image) token.picture = u.image;
        if (u.email) token.email = u.email;
      }
      if (token.sub && (token.role === undefined || token.firstName === undefined)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: { role: true, firstName: true, lastName: true, emailVerified: true, name: true, image: true, email: true },
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
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub as string;
        (session.user as any).role = token.role as any;
        (session.user as any).firstName = token.firstName as any;
        (session.user as any).lastName = token.lastName as any;
        (session.user as any).emailVerified = token.emailVerified as any;
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
  logger: {
    error(code, metadata) { console.error("NextAuth Error:", code, metadata); },
    warn(code) { console.warn("NextAuth Warning:", code); },
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
