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
      
      // API routes handle their own auth
      if (isOnApi) return true;
      
      // Dashboard requires login
      if (isOnDashboard) return isLoggedIn;
      
      // Everything else is public
      return true;
    },
  },
});

export const config = {
  // Protect everything except API, Next assets, and static files
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
