// src/app/api/items/route.ts
// Item search and details - GET
// Uses raw pg queries for Prextra replicated tables

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { searchItems, getItemByCode } from "@/lib/prextra";
import type { ItemSuggestion, ItemDetail } from "@/types/returns";

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
      const result = await getItemByCode(code);

      if (!result) {
        return NextResponse.json({
          ok: true,
          found: false,
          item: null,
        });
      }

      const item: ItemDetail = {
        code: result.ItemCode,
        descr: result.Descr,
        weight: result.ShipWeight,
      };

      return NextResponse.json({
        ok: true,
        found: true,
        item,
      });
    }

    if (q) {
      // Autocomplete search
      if (q.trim().length < 2) {
        return NextResponse.json({ ok: true, suggestions: [] });
      }

      const results = await searchItems(q.trim());

      const suggestions: ItemSuggestion[] = results.map((r) => ({
        code: r.ItemCode,
        descr: r.Descr,
      }));

      return NextResponse.json({ ok: true, suggestions });
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
