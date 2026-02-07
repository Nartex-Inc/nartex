// src/app/api/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";
import { getPrextraTables } from "@/lib/prextra";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
    }

    const schema = session.user.prextraSchema;
    if (!schema) {
      return NextResponse.json({ ok: false, error: "Aucun schéma Prextra configuré" }, { status: 403 });
    }

    const T = getPrextraTables(schema);
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const code = (searchParams.get("code") || "").trim();

    // 1. Single Item Lookup (Exact code)
    if (code) {
      const { rows } = await pg.query(
        `SELECT "ItemCode", "Descr" FROM ${T.ITEMS} WHERE "ItemCode" = $1 LIMIT 1`,
        [code]
      );

      if (rows.length === 0) {
        return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        item: {
          code: rows[0].ItemCode,
          descr: rows[0].Descr,
          weight: 0,
        },
      });
    }

    // 2. Search Suggestions (with Smart Sorting)
    if (q) {
      const { rows } = await pg.query(
        `SELECT "ItemCode", "Descr" FROM ${T.ITEMS}
         WHERE "ItemCode" ILIKE $1 OR "Descr" ILIKE $1
         LIMIT 50`,
        [`%${q}%`]
      );

      // --- SMART SORTING LOGIC ---
      const searchUpper = q.toUpperCase();

      rows.sort((a: { ItemCode: string; Descr: string | null }, b: { ItemCode: string; Descr: string | null }) => {
        const codeA = a.ItemCode.toUpperCase();
        const codeB = b.ItemCode.toUpperCase();

        // Priority 1: Exact Code Match
        if (codeA === searchUpper && codeB !== searchUpper) return -1;
        if (codeB === searchUpper && codeA !== searchUpper) return 1;

        // Priority 2: Code Starts With Query
        const startA = codeA.startsWith(searchUpper);
        const startB = codeB.startsWith(searchUpper);
        if (startA && !startB) return -1;
        if (startB && !startA) return 1;

        // Priority 3: Code Contains Query (vs Description only)
        const inCodeA = codeA.includes(searchUpper);
        const inCodeB = codeB.includes(searchUpper);
        if (inCodeA && !inCodeB) return -1;
        if (inCodeB && !inCodeA) return 1;

        // Priority 4: Alphabetical (fallback)
        return codeA.localeCompare(codeB);
      });

      // Slice to original limit of 20 after sorting
      const topItems = rows.slice(0, 20);

      return NextResponse.json({
        ok: true,
        suggestions: topItems.map((i: { ItemCode: string; Descr: string | null }) => ({
          code: i.ItemCode,
          descr: i.Descr,
        })),
      });
    }

    return NextResponse.json({ ok: false, error: "Missing parameters" }, { status: 400 });

  } catch (error: any) {
    console.error("GET /api/items error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
