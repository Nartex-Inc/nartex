// src/lib/auth.ts
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
        
        // Use findFirst with insensitive mode
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
    // 1. INSERT THIS SIGNIN CALLBACK
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.email) {
        try {
          // Google sends the image URL in the 'picture' field of the profile
          const newImage = (profile as any)?.picture;
          
          if (newImage) {
            await prisma.user.update({
              where: { email: user.email },
              data: { 
                image: newImage,
                emailVerified: new Date() // Optional: Mark email as verified since it's from Google
              }
            });
          }
        } catch (error) {
          console.error("Error updating user profile from Google:", error);
        }
      }
      return true; // Return true to allow the sign-in
    },

    // 2. KEEP YOUR EXISTING CALLBACKS BELOW
    async jwt({ token, user, trigger, session }) {
      // ... your existing jwt logic ...
      if (trigger === "update" && session?.user) {
        token.role = session.user.role;
      }
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "user";
      }
      if (token.email) {
         try {
           const dbUser = await prisma.user.findUnique({ 
              where: { email: token.email },
              select: { id: true, role: true } 
           });
           if (dbUser) {
               token.id = dbUser.id;
               token.role = dbUser.role as string;
           }
         } catch (error) {
           console.error("Error refreshing role:", error);
         }
      }
      return token;
    },
    async session({ session, token }) {
      // ... your existing session logic ...
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // ... your existing redirect logic ...
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl + "/dashboard";
    },
  },
};
