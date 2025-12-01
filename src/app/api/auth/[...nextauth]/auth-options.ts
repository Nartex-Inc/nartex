import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) throw new Error("Email requis");
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) throw new Error("Utilisateur introuvable");

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) throw new Error("Mot de passe incorrect");

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, 
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 1. Update trigger (client-side updates)
      if (trigger === "update" && session?.user) {
        token.role = session.user.role;
      }

      // 2. Initial Sign In (Provider passes user object)
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "user";
      }

      // 3. ESSENTIAL: Always refresh from DB on every request
      // This fixes the "undefined" role issue by checking the DB directly
      if (token.email) {
         const dbUser = await prisma.user.findUnique({ 
            where: { email: token.email },
            select: { id: true, role: true } 
         });
         
         if (dbUser) {
             token.id = dbUser.id;
             token.role = dbUser.role;
         }
      }
      return token;
    },
    async session({ session, token }) {
      // Pass the data from the token to the client-side session
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
