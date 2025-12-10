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

    // 2. JWT: Fetch the NEW image from the database
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.user) {
        token.role = session.user.role;
      }

      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "user";
        // If the user object already has an image, use it
        if (user.image) token.picture = user.image;
      }

      // CRITICAL: Refresh from DB to get the updated image
      if (token.email) {
         try {
           const dbUser = await prisma.user.findUnique({ 
              where: { email: token.email },
              select: { 
                id: true, 
                role: true, 
                image: true // <--- THIS WAS MISSING
              } 
           });
           
           if (dbUser) {
               token.id = dbUser.id;
               token.role = dbUser.role as string;
               // Force the token to use the database image
               if (dbUser.image) {
                 token.picture = dbUser.image;
               }
           }
         } catch (error) {
           console.error("Error refreshing user data:", error);
         }
      }
      return token;
    },

    // 3. SESSION: Pass the token image to the client
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        session.user.image = token.picture; // Ensure the session gets the image
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
