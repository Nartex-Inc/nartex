// src/app/api/items/route.ts
// Item search and details - GET
// Uses raw pg queries for Prextra replicated tables (public."Items")

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

// Define types locally since we aren't importing the helper functions anymore
interface ItemSuggestion {
  code: string;
  descr: string;
}

interface ItemDetail {
  code: string;
  descr: string;
  weight: number;
}

export async function GET(request: NextRequest) {
  try {
    // 1) Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // 2) Parse parameters
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q"); // Autocomplete query
    const code = searchParams.get("code"); // Specific item code

    // ---------------------------------------------------------
    // SCENARIO A: Get specific item details (combines getDescription/getWeight)
    // ---------------------------------------------------------
    if (code) {
      // SQL translation:
      // PHP: SELECT Descr FROM Items WHERE ItemCode = :itemCode
      // PG:  SELECT "ItemCode", "Descr", "ShipWeight" FROM public."Items" ...
      
      const query = `
        SELECT 
          "ItemCode", 
          "Descr", 
          "ShipWeight"
        FROM public."Items"
        WHERE "ItemCode" = $1
        LIMIT 1
      `;

      const { rows } = await pg.query(query, [code]);

      if (rows.length === 0) {
        return NextResponse.json({
          ok: true,
          found: false,
          item: null,
        });
      }

      const row = rows[0];

      const item: ItemDetail = {
        code: row.ItemCode,
        descr: row.Descr,
        // Ensure weight is a number (Postgres numeric often returns as string)
        weight: row.ShipWeight ? Number(row.ShipWeight) : 0,
      };

      return NextResponse.json({
        ok: true,
        found: true,
        item,
      });
    }

    // ---------------------------------------------------------
    // SCENARIO B: Autocomplete search
    // ---------------------------------------------------------
    if (q) {
      if (q.trim().length < 2) {
        return NextResponse.json({ ok: true, suggestions: [] });
      }

      const searchTerm = q.trim() + "%"; // 'query%' for starts-with logic

      // SQL translation:
      // PHP: SELECT TOP 10 ItemCode FROM Items WHERE ItemCode LIKE :query
      // PG:  SELECT "ItemCode", "Descr" FROM public."Items" WHERE "ItemCode" ILIKE $1 LIMIT 10
      // Note: Using ILIKE for case-insensitive search, and fetching Descr for better UI context
      
      const query = `
        SELECT 
          "ItemCode",
          "Descr"
        FROM public."Items"
        WHERE "ItemCode" ILIKE $1
        ORDER BY "ItemCode" ASC
        LIMIT 10
      `;

      const { rows } = await pg.query(query, [searchTerm]);

      const suggestions: ItemSuggestion[] = rows.map((r: any) => ({
        code: r.ItemCode,
        descr: r.Descr,
      }));

      return NextResponse.json({ ok: true, suggestions });
    }

    // ---------------------------------------------------------
    // SCENARIO C: Missing parameters
    // ---------------------------------------------------------
    return NextResponse.json(
      { ok: false, error: "Paramètre 'q' (recherche) ou 'code' (détails) requis" },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("GET /api/items error:", error);
    return NextResponse.json(
      { 
        ok: false, 
        error: "Erreur lors de la recherche d'articles",
        details: error?.message 
      },
      { status: 500 }
    );
  }
}
