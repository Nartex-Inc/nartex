// middleware.ts  (v4)

import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/',          // must match authConfig.pages.signIn
  },
  callbacks: {
    // v4: the "authorized" callback lives in middleware, not in NextAuth options
    authorized({ req, token }) {
      const isLoggedIn = !!token;
      const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard');
      return isOnDashboard ? isLoggedIn : true;
    },
  },
});

export const config = {
  // Protect everything except API and Next assets (same pattern you had)
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
