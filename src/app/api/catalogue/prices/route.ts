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

    const priceIdNum = parseInt(priceId, 10);
    const prodIdNum = parseInt(prodId, 10);

    // Build WHERE conditions dynamically
    let whereConditions = `
      ipr."priceid" = $1
      AND i."ProdId" = $2
      AND pl."IsActive" = true
    `;
    
    const params: any[] = [priceIdNum, prodIdNum];
    let paramIdx = 3;

    if (itemId) {
      whereConditions += ` AND i."ItemId" = $${paramIdx}`;
      params.push(parseInt(itemId, 10));
      paramIdx++;
    } else if (typeId) {
      whereConditions += ` AND i."locitemtype" = $${paramIdx}`;
      params.push(parseInt(typeId, 10));
      paramIdx++;
    }

    // Simpler query: Get all prices, then filter to latest in JS
    // This avoids complex CTEs that might cause issues
    const query = `
      SELECT 
        i."ItemId" as "itemId",
        i."ItemCode" as "itemCode",
        i."Descr" as "description",
        i."NetWeight" as "format",
        i."NetWeight" as "udm",
        p."Name" as "categoryName",
        t."descr" as "className",
        ipr."fromqty" as "qtyMin",
        ipr."price" as "unitPrice",
        ipr."itempricerangeid" as "id",
        ipr."itempricedateid" as "dateId",
        pl."Descr" as "priceListName",
        pl."Pricecode" as "priceCode",
        COALESCE(
          CASE WHEN pl."Currid" = 1 THEN 'CAD' 
               WHEN pl."Currid" = 2 THEN 'USD' 
               ELSE 'CAD' 
          END, 
          'CAD'
        ) as "currency"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      LEFT JOIN public."Products" p ON i."ProdId" = p."ProdId"
      LEFT JOIN public."itemtype" t ON i."locitemtype" = t."itemtypeid"
      WHERE ${whereConditions}
      ORDER BY i."ItemCode" ASC, ipr."fromqty" ASC, ipr."itempricedateid" DESC
    `;

    console.log("Prices API - Executing query with params:", params);
    const startTime = Date.now();
    
    const { rows } = await pg.query(query, params);
    
    console.log(`Prices API - Query returned ${rows.length} rows in ${Date.now() - startTime}ms`);

    // Group by item and keep only latest price per qty range
    const itemsMap: Record<number, any> = {};
    const seenRanges: Set<string> = new Set(); // Track itemId-qtyMin combinations
    
    for (const row of rows) {
      const rangeKey = `${row.itemId}-${row.qtyMin}`;
      
      // Skip if we already have a price for this item+qty (we ordered by dateId DESC, so first is latest)
      if (seenRanges.has(rangeKey)) {
        continue;
      }
      seenRanges.add(rangeKey);

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

    // Convert to array and sort ranges by qtyMin
    const result = Object.values(itemsMap).map((item: any) => ({
      ...item,
      ranges: item.ranges.sort((a: any, b: any) => a.qtyMin - b.qtyMin)
    }));

    console.log(`Prices API - Returning ${result.length} items with prices`);

    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error("Prices API error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la génération des prix" }, 
      { status: 500 }
    );
  }
}
