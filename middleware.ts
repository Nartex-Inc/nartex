// middleware.ts (root level)
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const LANDING_HOSTS = ["nartex.ca", "www.nartex.ca"];

export async function middleware(req: NextRequest) {
  const xfh = req.headers.get("x-forwarded-host");
  const rawHost = req.headers.get("host");
  const host = (xfh || rawHost)?.split(":")[0] ?? "";
  const { pathname } = req.nextUrl;

  // DEBUG: Add headers to every response so we can see what middleware receives
  const addDebug = (res: NextResponse) => {
    res.headers.set("x-debug-host", host);
    res.headers.set("x-debug-raw-host", rawHost ?? "null");
    res.headers.set("x-debug-xfh", xfh ?? "null");
    res.headers.set("x-debug-pathname", pathname);
    res.headers.set("x-debug-match", String(LANDING_HOSTS.includes(host)));
    return res;
  };

  // DEBUG: Direct JSON response from middleware (bypasses all caching)
  if (pathname === "/mw-debug") {
    return new NextResponse(
      JSON.stringify({ host, rawHost, xfh, pathname, match: LANDING_HOSTS.includes(host) }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  // Landing page: rewrite nartex.ca/* → /landing/*
  if (LANDING_HOSTS.includes(host)) {
    if (!pathname.startsWith("/landing")) {
      const url = req.nextUrl.clone();
      url.pathname = "/landing" + (pathname === "/" ? "" : pathname);
      return addDebug(NextResponse.rewrite(url));
    }
    return addDebug(NextResponse.next());
  }

  // API routes handle their own auth
  if (pathname.startsWith("/api")) return NextResponse.next();

  // Dashboard requires login
  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const signInUrl = req.nextUrl.clone();
      signInUrl.pathname = "/auth/signin";
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return addDebug(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
