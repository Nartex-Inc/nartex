// src/app/api/catalogue/products/route.ts
// Fetches all product categories (largest hierarchy level) with item counts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Fetch all product categories with item counts
    const query = `
      SELECT 
        p."ProdId" as "prodId",
        p."Name" as "name",
        COUNT(i."ItemId")::int as "itemCount"
      FROM public."Products" p
      LEFT JOIN public."Items" i ON p."ProdId" = i."ProdId"
      GROUP BY p."ProdId", p."Name"
      HAVING COUNT(i."ItemId") > 0
      ORDER BY p."Name" ASC
    `;

    const { rows } = await pg.query(query);

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET /api/catalogue/products error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des catégories" },
      { status: 500 }
    );
  }
}
