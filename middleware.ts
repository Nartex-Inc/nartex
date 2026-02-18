// middleware.ts (root level)
import { withAuth } from "next-auth/middleware";

// API routes that do NOT require authentication
const PUBLIC_API_PREFIXES = [
  "/api/auth/",         // NextAuth handlers (login, OAuth callbacks)
  "/api/signup",        // Registration
  "/api/health",        // Health check
  "/api/ping",          // Ping
  "/api/support/email-webhook", // External email webhook (has its own secret)
];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default withAuth({
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized({ req, token }) {
      const isLoggedIn = !!token;
      const pathname = req.nextUrl.pathname;
      const isOnDashboard = pathname.startsWith("/dashboard");
      const isOnApi = pathname.startsWith("/api");
      const isOnLanding = pathname.startsWith("/landing");

      // Only explicitly public API routes skip auth
      if (isOnApi) return isPublicApiRoute(pathname) || isLoggedIn;

      // Landing page is public
      if (isOnLanding) return true;

      // Dashboard requires login
      if (isOnDashboard) return isLoggedIn;

      // Everything else is public
      return true;
    },
  },
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
