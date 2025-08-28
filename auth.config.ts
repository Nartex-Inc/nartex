// auth.config.ts (v5)
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/", error: "/auth/error" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      return !isOnDashboard || isLoggedIn;
    },
  },
  providers: [], // fill with your providers
};
