// middleware.ts (root level)
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const LANDING_HOSTS = ["nartex.ca", "www.nartex.ca"];

export async function middleware(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host"))?.split(":")[0] ?? "";
  const { pathname } = req.nextUrl;

  // Landing page: rewrite nartex.ca/* → /landing/*
  if (LANDING_HOSTS.includes(host)) {
    if (!pathname.startsWith("/landing")) {
      const url = req.nextUrl.clone();
      url.pathname = "/landing" + (pathname === "/" ? "" : pathname);
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
