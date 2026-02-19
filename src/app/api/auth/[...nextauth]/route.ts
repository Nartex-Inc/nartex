import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const handler = NextAuth(authOptions);

export { handler as GET };

export async function POST(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  const ip = getClientIp(req);
  const { success, retryAfterMs } = rateLimit({
    key: `auth:${ip}`,
    limit: 10,
    windowMs: 60_000,
  });

  if (!success) {
    return rateLimitResponse(retryAfterMs);
  }

  return handler(req as unknown as Request, { params: await ctx.params }) as Promise<NextResponse>;
}
