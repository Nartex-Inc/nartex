import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    host: req.headers.get("host"),
    "x-forwarded-host": req.headers.get("x-forwarded-host"),
    "x-forwarded-for": req.headers.get("x-forwarded-for"),
    "x-forwarded-proto": req.headers.get("x-forwarded-proto"),
    url: req.url,
    allHeaders: Object.fromEntries(req.headers.entries()),
  });
}
