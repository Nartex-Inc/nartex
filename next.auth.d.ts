// nartex/next-auth.d.ts
import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

// Augment only; do NOT declare/replace any exports from the module.
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
    // keep id as provided by your DB, add extra fields as optional
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

// Ensure this stays a module augmentation, not a global script.
export {};
