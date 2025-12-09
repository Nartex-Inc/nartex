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
    // 1. FORCE DB UPDATE ON SIGN IN
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.email) {
        try {
          // Google sends the image URL in the 'picture' field
          const newImage = (profile as any)?.picture;
          
          // Only update if we actually got an image
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

    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.user) {
        token.role = session.user.role;
      }

      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "user";
        // Ensure we capture the image initially if available
        if (user.image) token.picture = user.image;
      }

      // 2. FORCE REFRESH FROM DB (CRITICAL FIX)
      if (token.email) {
         try {
           const dbUser = await prisma.user.findUnique({ 
              where: { email: token.email },
              // ADDED 'image: true' HERE so the token actually gets the new URL
              select: { id: true, role: true, image: true } 
           });
           
           if (dbUser) {
               token.id = dbUser.id;
               token.role = dbUser.role as string;
               // Overwrite the token picture with the one from the database
               token.picture = dbUser.image; 
           }
         } catch (error) {
           console.error("Error refreshing user data:", error);
         }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        // Ensure the session uses the token's picture
        session.user.image = token.picture; 
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
