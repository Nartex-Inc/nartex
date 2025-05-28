// next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string | null | undefined; // <<< ADDED ROLE
      firstName?: string | null;
      lastName?: string | null;
      emailVerified?: Date | null;
    } & DefaultSession["user"]; // name, email, image come from DefaultSession
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the `user` object passed to the `jwt` callback from the `authorize` function or adapter.
   */
  interface User extends DefaultUser {
    id: string; // DefaultUser already has id, but good to be explicit if extending
    role: string | null | undefined; // <<< ADDED ROLE
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null; // For passing from authorize/profile
    // name, email, image are part of DefaultUser
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT extends DefaultJWT {
    id: string; // DefaultJWT might not have id, so good to add
    role: string | null | undefined; // <<< ADDED ROLE
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null; // Persist in JWT
    // name, email, picture are already part of DefaultJWT
  }
}