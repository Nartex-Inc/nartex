// middleware.ts

import { withAuth } from 'next-auth/middleware';
// FIX: Import from './auth.config' because the file is in the root, not src/
import { authConfig } from './auth.config';

export default withAuth({
  pages: {
    // Now we can safely use the variable from your config
    signIn: authConfig.pages.signIn, 
  },
  callbacks: {
    authorized({ req, token }) {
      const isLoggedIn = !!token;
      const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard');
      // If on dashboard, require login. Otherwise, allow access.
      return isOnDashboard ? isLoggedIn : true;
    },
  },
});

export const config = {
  // Protect everything except API, Next assets, and static files
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
