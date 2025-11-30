// src/app/api/items/route.ts
// Item search and details - GET
// PostgreSQL version - queries replicated dbo."Items" table
//
// Usage:
//   GET /api/items?q=ABC     - Autocomplete search (returns up to 10 suggestions)
//   GET /api/items?code=ABC  - Get specific item details

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, PREXTRA_TABLES } from "@/lib/db";
import { ItemSuggestion, ItemDetail } from "@/types/returns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q"); // Autocomplete query
    const code = searchParams.get("code"); // Specific item code

    if (code) {
      // Get specific item details
      const result = await query<{ ItemCode: string; Descr: string | null; ShipWeight: number | null }>(
        `SELECT "ItemCode", "Descr", "ShipWeight" 
         FROM ${PREXTRA_TABLES.ITEMS}
         WHERE "ItemCode" = $1
         LIMIT 1`,
        [code]
      );

      if (result.length === 0) {
        return NextResponse.json({
          ok: true,
          found: false,
          item: null,
        });
      }

      const row = result[0];
      const item: ItemDetail = {
        code: row.ItemCode,
        descr: row.Descr,
        weight: row.ShipWeight,
      };

      return NextResponse.json({
        ok: true,
        found: true,
        item,
      });
    }

    if (q) {
      // Autocomplete search
      const searchTerm = q.trim();
      
      if (searchTerm.length < 2) {
        return NextResponse.json({
          ok: true,
          suggestions: [],
        });
      }

      const result = await query<{ ItemCode: string; Descr: string | null }>(
        `SELECT "ItemCode", "Descr" 
         FROM ${PREXTRA_TABLES.ITEMS}
         WHERE "ItemCode" ILIKE $1
         ORDER BY "ItemCode" ASC
         LIMIT 10`,
        [`${searchTerm}%`]
      );

      const suggestions: ItemSuggestion[] = result.map((r) => ({
        code: r.ItemCode,
        descr: r.Descr,
      }));

      return NextResponse.json({
        ok: true,
        suggestions,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Paramètre 'q' (recherche) ou 'code' (détails) requis" },
      { status: 400 }
    );
  } catch (error) {
    console.error("GET /api/items error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la recherche d'articles" },
      { status: 500 }
    );
  }
}
