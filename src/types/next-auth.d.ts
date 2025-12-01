// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // We make 'role' required (string) because auth-options guarantees a fallback
      role: string; 
      firstName?: string | null;
      lastName?: string | null;
      emailVerified?: Date | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null;
  }
}
