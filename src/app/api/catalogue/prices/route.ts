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
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId est requis" },
        { status: 400 }
      );
    }

    // FIXED QUERY: Strict Case Sensitivity & Table Names
    // 1. Table 'itempricerange' (lowercase)
    // 2. Items."ItemId" (CamelCase) matches itempricerange."itemid" (lowercase)
    // 3. PriceList."priceid" matches itempricerange."priceid"
    const query = `
      SELECT 
        ipr."priceid" as "priceId",
        pl."Descr" as "priceListName",
        COALESCE(
          CASE WHEN pl."Currid" = 1 THEN 'CAD' 
               WHEN pl."Currid" = 2 THEN 'USD' 
               WHEN pl."Currid" = 3 THEN 'EUR'
               ELSE 'CAD' 
          END, 
          'CAD'
        ) as "currency",
        ipr."itempricerangeid" as "id",
        ipr."fromqty" as "qtyMin",
        ipr."toqty" as "qtyMax",
        ipr."price" as "unitPrice"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      WHERE i."ItemId" = $1 AND pl."IsActive" = true
      ORDER BY pl."Descr" ASC, ipr."fromqty" ASC
    `;

    const { rows } = await pg.query(query, [parseInt(itemId, 10)]);

    // Group by price list for the frontend
    const priceListsMap: Record<number, {
      priceId: number;
      priceListName: string;
      currency: string;
      ranges: Array<{ id: number; qtyMin: number; qtyMax: number | null; unitPrice: number }>;
    }> = {};

    for (const row of rows) {
      const priceId = row.priceId;
      if (!priceListsMap[priceId]) {
        priceListsMap[priceId] = {
          priceId: row.priceId,
          priceListName: row.priceListName || "Liste inconnue",
          currency: row.currency,
          ranges: [],
        };
      }
      priceListsMap[priceId].ranges.push({
        id: row.id,
        qtyMin: row.qtyMin,
        // Handle 9999 or similar high numbers as "and up" (null) if needed, 
        // otherwise keep the value. Assuming 9999 is a placeholder for max.
        qtyMax: row.qtyMax >= 9999 ? null : row.qtyMax,
        unitPrice: parseFloat(row.unitPrice) || 0,
      });
    }

    return NextResponse.json({
      itemId: parseInt(itemId, 10),
      priceLists: Object.values(priceListsMap),
    });
  } catch (error: any) {
    console.error("GET /api/catalogue/prices error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des prix" },
      { status: 500 }
    );
  }
}
