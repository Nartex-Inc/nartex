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
    const priceId = searchParams.get("priceId");
    const prodId = searchParams.get("prodId");
    const typeId = searchParams.get("typeId");
    const itemId = searchParams.get("itemId");

    if (!priceId || !prodId) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Build item filter clause
    let itemFilter = "";
    const params: any[] = [parseInt(priceId, 10), parseInt(prodId, 10)];
    let paramIdx = 3;

    if (itemId) {
      itemFilter = `AND i."ItemId" = $${paramIdx}`;
      params.push(parseInt(itemId, 10));
      paramIdx++;
    } else if (typeId) {
      itemFilter = `AND i."locitemtype" = $${paramIdx}`;
      params.push(parseInt(typeId, 10));
      paramIdx++;
    }

    // Optimized query using CTE with ROW_NUMBER to get latest prices
    // This avoids the slow correlated subquery
    const query = `
      WITH LatestPrices AS (
        SELECT 
          ipr."itemid",
          ipr."fromqty",
          ipr."price",
          ipr."itempricerangeid",
          ipr."priceid",
          ROW_NUMBER() OVER (
            PARTITION BY ipr."itemid", ipr."priceid", ipr."fromqty" 
            ORDER BY ipr."itempricedateid" DESC
          ) as rn
        FROM public."itempricerange" ipr
        WHERE ipr."priceid" = $1
      )
      SELECT 
        i."ItemId" as "itemId",
        i."ItemCode" as "itemCode",
        i."Descr" as "description",
        i."NetWeight" as "format",
        i."NetWeight" as "udm",
        p."Name" as "categoryName",
        t."descr" as "className",
        lp."fromqty" as "qtyMin",
        lp."price" as "unitPrice",
        lp."itempricerangeid" as "id",
        pl."Descr" as "priceListName",
        pl."Pricecode" as "priceCode",
        COALESCE(
          CASE WHEN pl."Currid" = 1 THEN 'CAD' 
               WHEN pl."Currid" = 2 THEN 'USD' 
               ELSE 'CAD' 
          END, 
          'CAD'
        ) as "currency"
      FROM LatestPrices lp
      INNER JOIN public."Items" i ON lp."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON lp."priceid" = pl."priceid"
      LEFT JOIN public."Products" p ON i."ProdId" = p."ProdId"
      LEFT JOIN public."itemtype" t ON i."locitemtype" = t."itemtypeid"
      WHERE lp.rn = 1
        AND pl."IsActive" = true
        AND i."ProdId" = $2
        ${itemFilter}
      ORDER BY i."ItemCode" ASC, lp."fromqty" ASC
    `;

    console.log("Executing prices query with params:", params);
    const startTime = Date.now();
    
    const { rows } = await pg.query(query, params);
    
    console.log(`Query returned ${rows.length} rows in ${Date.now() - startTime}ms`);

    // Group by item with enhanced data structure
    const itemsMap: Record<number, any> = {};
    
    for (const row of rows) {
       if (!itemsMap[row.itemId]) {
          itemsMap[row.itemId] = {
             itemId: row.itemId,
             itemCode: row.itemCode,
             description: row.description,
             format: row.format ? parseFloat(row.format) : null,
             udm: row.udm ? parseFloat(row.udm) : null,
             categoryName: row.categoryName,
             className: row.className,
             priceListName: row.priceListName,
             priceCode: row.priceCode,
             currency: row.currency,
             ranges: []
          };
       }
       itemsMap[row.itemId].ranges.push({
          id: row.id,
          qtyMin: parseInt(row.qtyMin),
          unitPrice: parseFloat(row.unitPrice)
       });
    }

    const result = Object.values(itemsMap);
    console.log(`Returning ${result.length} items with prices`);

    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error("Prices API error:", error);
    return NextResponse.json({ error: error.message || "Erreur génération" }, { status: 500 });
  }
}
