// next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Extends the built-in session to include your custom properties.
   */
  interface Session {
    user: {
      id: string;
      role: string | null | undefined;
      firstName?: string | null;
      lastName?: string | null;
      emailVerified?: Date | null;
    } & DefaultSession["user"]; // Inherits name, email, image from the default session
  }

  /**
   * Extends the built-in user model.
   */
  interface User extends DefaultUser {
    id: string;
    role: string | null | undefined;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extends the JWT token to include your custom properties.
   */
  interface JWT extends DefaultJWT {
    id: string;
    role: string | null | undefined;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null;
  }
}
