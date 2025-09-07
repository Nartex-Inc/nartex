// src/app/api/items/route.ts
// GET /api/items?q=ip4&take=10      -> autocomplete (prefix, case-insensitive)
// GET /api/items?code=IP4            -> exact lookup (case-insensitive)
//
// Returns:
// - autocomplete: { ok:true, items:[{ code, descr }] }
// - exact:        { ok:true, item:{ code, descr, weight } } or { ok:true, item:null }

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const code = (url.searchParams.get("code") || "").trim();
    const take = Math.max(1, Math.min(50, Number(url.searchParams.get("take") || "10")));

    // 1) Autocomplete (prefix)
    if (q) {
      const pattern = `${q}%`; // prefix
      const rows = await prisma.$queryRaw<
        { code: string; descr: string | null }[]
      >(Prisma.sql`
        SELECT "ItemCode" AS code, "Descr" AS descr
        FROM "Items"
        WHERE "ItemCode" ILIKE ${pattern}
        ORDER BY "ItemCode" ASC
        LIMIT ${take}
      `);

      return NextResponse.json({ ok: true, items: rows ?? [] });
    }

    // 2) Exact lookup
    if (code) {
      const rows = await prisma.$queryRaw<
        { code: string; descr: string | null; weight: number | null }[]
      >(Prisma.sql`
        SELECT
          "ItemCode" AS code,
          "Descr"    AS descr,
          CAST("ShipWeight" AS double precision) AS weight
        FROM "Items"
        WHERE "ItemCode" = ${code}
        LIMIT 1
      `);

      const item = rows?.[0] ?? null;
      return NextResponse.json({ ok: true, item });
    }

    // Nothing provided
    return NextResponse.json(
      { ok: false, error: "Provide either ?q= for autocomplete or ?code= for exact lookup." },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
