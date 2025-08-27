// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id?: string;
      role?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      emailVerified?: Date | null;
    };
  }

  interface User extends DefaultUser {
    id?: string;
    role?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null;
  }
}
