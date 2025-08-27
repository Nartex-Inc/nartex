// src/types/next-auth.d.ts
import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      emailVerified?: Date | null;
    };
  }

  interface User extends DefaultUser {
    role?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null;
  }
}

export {};
