// auth.config.ts

import { Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';

// We remove the invalid 'NextAuthConfig' import and type annotation.
// TypeScript will correctly infer the type from the object itself.
export const authConfig = {
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  callbacks: {
    // This callback is used by the middleware to protect routes
    authorized({ auth, request: { nextUrl } }: { auth: Session | null; request: any }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to the login page
      }
      return true;
    },
    // Add dummy JWT and Session callbacks to satisfy the structure if needed elsewhere,
    // but the main logic will be in the primary auth.ts
    jwt({ token }: { token: JWT }) {
        return token;
    },
    session({ session, token }: { session: Session, token: JWT }) {
        if (token.sub && session.user) {
            session.user.id = token.sub;
        }
        return session;
    },
  },
  providers: [], // Providers are defined in the main auth.ts file
};
