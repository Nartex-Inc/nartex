// src/app/api/catalogue/types/route.ts
// Fetches item types (second hierarchy level) for a given product category

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

export interface ItemType {
  id: number;
  name: string;
  itemCount: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json(
        { ok: false, error: "categoryId est requis" },
        { status: 400 }
      );
    }

    // Fetch item types for the given category with item counts
    const query = `
      SELECT 
        t."itemtypeid" as id,
        t."descr" as name,
        COUNT(i."ItemId") as item_count
      FROM public."itemtype" t
      INNER JOIN public."Items" i ON t."itemtypeid" = i."itemsubtypeid"
      WHERE i."ProdId" = $1
      GROUP BY t."itemtypeid", t."descr"
      ORDER BY t."descr" ASC
    `;

    const { rows } = await pg.query(query, [parseInt(categoryId, 10)]);

    const types: ItemType[] = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      itemCount: parseInt(row.item_count, 10) || 0,
    }));

    // Also count items without a type in this category
    const uncategorizedQuery = `
      SELECT COUNT(*) as count
      FROM public."Items"
      WHERE "ProdId" = $1 AND ("itemsubtypeid" IS NULL OR "itemsubtypeid" = 0)
    `;
    const { rows: uncatRows } = await pg.query(uncategorizedQuery, [parseInt(categoryId, 10)]);
    const uncategorizedCount = parseInt(uncatRows[0]?.count || 0, 10);

    return NextResponse.json({ 
      ok: true, 
      types,
      uncategorizedCount 
    });
  } catch (error: any) {
    console.error("GET /api/catalogue/types error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des types", details: error?.message },
      { status: 500 }
    );
  }
}
