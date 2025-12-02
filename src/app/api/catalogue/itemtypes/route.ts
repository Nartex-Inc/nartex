// src/app/api/catalogue/itemtypes/route.ts
// Fetches item types (second hierarchy level) for a given product category

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const prodId = searchParams.get("prodId");

    if (!prodId) {
      return NextResponse.json(
        { error: "prodId est requis" },
        { status: 400 }
      );
    }

    // Fetch item types for the given product category with item counts
    const query = `
      SELECT 
        t."itemtypeid" as "itemTypeId",
        t."descr" as "description",
        COUNT(i."ItemId")::int as "itemCount"
      FROM public."itemtype" t
      INNER JOIN public."Items" i ON t."itemtypeid" = i."itemsubtypeid"
      WHERE i."ProdId" = $1
      GROUP BY t."itemtypeid", t."descr"
      HAVING COUNT(i."ItemId") > 0
      ORDER BY t."descr" ASC
    `;

    const { rows } = await pg.query(query, [parseInt(prodId, 10)]);

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET /api/catalogue/itemtypes error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des types d'articles" },
      { status: 500 }
    );
  }
}
