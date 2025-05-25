// middleware.ts (in project root)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Log all API requests to help debug
  if (request.nextUrl.pathname.startsWith("/api/")) {
    console.log(`Middleware: ${request.method} ${request.nextUrl.pathname}`);
  }
  
  return NextResponse.next();
}

// Run middleware on API routes
export const config = {
  matcher: ["/api/:path*"],
};