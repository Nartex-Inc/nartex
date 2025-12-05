import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

const PDS_PRICE_ID = 17; // priceid for 08-PDS (PRIX DETAIL / MSRP)

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

    // Build item filter for both queries
    let itemFilterSQL = "";
    const baseParams: any[] = [prodIdNum];
    let paramIdx = 2;

    if (itemId) {
      itemFilterSQL = `AND i."ItemId" = $${paramIdx}`;
      baseParams.push(parseInt(itemId, 10));
      paramIdx++;
    } else if (typeId) {
      itemFilterSQL = `AND i."locitemtype" = $${paramIdx}`;
      baseParams.push(parseInt(typeId, 10));
      paramIdx++;
    }

    // Step 1: Get MAX(itempricedateid) per item for the selected price list
    // This ensures all qty ranges for an item use the same date
    const mainQuery = `
      WITH LatestDatePerItem AS (
        SELECT 
          ipr."itemid",
          MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = $${paramIdx}
          AND i."ProdId" = $1
          ${itemFilterSQL}
        GROUP BY ipr."itemid"
      )
      SELECT 
        i."ItemId" as "itemId",
        i."ItemCode" as "itemCode",
        i."Descr" as "description",
        i."NetWeight" as "caisse",
        i."model" as "format",
        p."Name" as "categoryName",
        t."descr" as "className",
        ipr."fromqty" as "qtyMin",
        ipr."price" as "unitPrice",
        ipr."itempricerangeid" as "id",
        ipr."itempricedateid" as "dateId",
        pl."Descr" as "priceListName",
        pl."Pricecode" as "priceCode"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      INNER JOIN LatestDatePerItem ld ON ipr."itemid" = ld."itemid" AND ipr."itempricedateid" = ld."latestDateId"
      LEFT JOIN public."Products" p ON i."ProdId" = p."ProdId"
      LEFT JOIN public."itemtype" t ON i."locitemtype" = t."itemtypeid"
      WHERE ipr."priceid" = $${paramIdx}
        AND i."ProdId" = $1
        AND pl."IsActive" = true
        ${itemFilterSQL}
      ORDER BY i."ItemCode" ASC, ipr."fromqty" ASC
    `;

    const mainParams = [...baseParams, priceIdNum];

    // Step 2: Get PDS prices (priceid=17) with same logic
    const pdsQuery = `
      WITH LatestDatePerItem AS (
        SELECT 
          ipr."itemid",
          MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = ${PDS_PRICE_ID}
          AND i."ProdId" = $1
          ${itemFilterSQL}
        GROUP BY ipr."itemid"
      )
      SELECT 
        i."ItemId" as "itemId",
        ipr."fromqty" as "qtyMin",
        ipr."price" as "pdsPrice"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      INNER JOIN LatestDatePerItem ld ON ipr."itemid" = ld."itemid" AND ipr."itempricedateid" = ld."latestDateId"
      WHERE ipr."priceid" = ${PDS_PRICE_ID}
        AND i."ProdId" = $1
        AND pl."IsActive" = true
        ${itemFilterSQL}
      ORDER BY i."ItemId" ASC, ipr."fromqty" ASC
    `;

    console.log("Main query params:", mainParams);
    console.log("PDS query params:", baseParams);

    // Execute both queries in parallel
    const [mainResult, pdsResult] = await Promise.all([
      pg.query(mainQuery, mainParams),
      pg.query(pdsQuery, baseParams)
    ]);

    const rows = mainResult.rows;
    const pdsRows = pdsResult.rows;

    console.log(`Main query returned ${rows.length} rows`);
    console.log(`PDS query returned ${pdsRows.length} rows`);

    // Build PDS price map: itemId -> { qtyMin -> pdsPrice }
    const pdsMap: Record<number, Record<number, number>> = {};
    
    for (const row of pdsRows) {
      const itemId = row.itemId;
      const qtyMin = parseInt(row.qtyMin);
      
      if (!pdsMap[itemId]) {
        pdsMap[itemId] = {};
      }
      pdsMap[itemId][qtyMin] = parseFloat(row.pdsPrice);
    }

    console.log("PDS map keys:", Object.keys(pdsMap));

    // Group main results by item
    const itemsMap: Record<number, any> = {};
    
    for (const row of rows) {
      if (!itemsMap[row.itemId]) {
        itemsMap[row.itemId] = {
          itemId: row.itemId,
          itemCode: row.itemCode,
          description: row.description,
          caisse: row.caisse ? parseFloat(row.caisse) : null,
          format: row.format || null,
          categoryName: row.categoryName,
          className: row.className,
          priceListName: row.priceListName,
          priceCode: row.priceCode,
          ranges: []
        };
      }
      
      const qtyMin = parseInt(row.qtyMin);
      const pdsPrice = pdsMap[row.itemId]?.[qtyMin] ?? null;
      
      itemsMap[row.itemId].ranges.push({
        id: row.id,
        qtyMin: qtyMin,
        unitPrice: parseFloat(row.unitPrice),
        pdsPrice: pdsPrice
      });
    }

    // Convert to array and sort ranges
    const result = Object.values(itemsMap).map((item: any) => ({
      ...item,
      ranges: item.ranges.sort((a: any, b: any) => a.qtyMin - b.qtyMin)
    }));

    console.log(`Returning ${result.length} items with prices`);

    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error("Prices API error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la génération des prix" }, 
      { status: 500 }
    );
  }
}
