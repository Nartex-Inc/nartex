import { NextResponse } from "next/server";

// don't let any edge/CDN cache this
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
