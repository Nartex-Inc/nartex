// middleware.ts (root level)
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    authorized({ req, token }) {
      const isLoggedIn = !!token;
      const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
      const isOnApi = req.nextUrl.pathname.startsWith("/api");
      const isOnLanding = req.nextUrl.pathname.startsWith("/landing");

      // API routes handle their own auth
      if (isOnApi) return true;

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
