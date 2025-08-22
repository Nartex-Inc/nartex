// auth.ts
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth" // We will import our config

// Initialize NextAuth with your configuration and export the handlers and auth function
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
