// next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      emailVerified?: Date | null; // Changed from boolean to Date
    } & DefaultSession["user"]; // name, email, image come from DefaultSession
  }

  interface User extends DefaultUser {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null; // For passing from authorize/profile
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null; // Persist in JWT
    // name, email, picture are already part of DefaultJWT
  }
}