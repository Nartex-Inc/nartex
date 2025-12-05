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

    // Build WHERE conditions
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
    // If no typeId and no itemId, get ALL items for the prodId (all classes)

    // Main query for selected price list
    const query = `
      SELECT 
        i."ItemId" as "itemId",
        i."ItemCode" as "itemCode",
        i."Descr" as "description",
        i."NetWeight" as "udm",
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
      LEFT JOIN public."Products" p ON i."ProdId" = p."ProdId"
      LEFT JOIN public."itemtype" t ON i."locitemtype" = t."itemtypeid"
      WHERE ${whereConditions}
      ORDER BY i."ItemCode" ASC, ipr."fromqty" ASC, ipr."itempricedateid" DESC
    `;

    // Query for PDS prices (priceid=17)
    let pdsWhereConditions = `
      ipr."priceid" = ${PDS_PRICE_ID}
      AND i."ProdId" = $1
    `;
    
    const pdsParams: any[] = [prodIdNum];
    let pdsParamIdx = 2;

    if (itemId) {
      pdsWhereConditions += ` AND i."ItemId" = $${pdsParamIdx}`;
      pdsParams.push(parseInt(itemId, 10));
      pdsParamIdx++;
    } else if (typeId) {
      pdsWhereConditions += ` AND i."locitemtype" = $${pdsParamIdx}`;
      pdsParams.push(parseInt(typeId, 10));
      pdsParamIdx++;
    }

    const pdsQuery = `
      SELECT 
        i."ItemId" as "itemId",
        ipr."fromqty" as "qtyMin",
        ipr."price" as "pdsPrice",
        ipr."itempricedateid" as "dateId"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      WHERE ${pdsWhereConditions}
        AND pl."IsActive" = true
      ORDER BY i."ItemId" ASC, ipr."fromqty" ASC, ipr."itempricedateid" DESC
    `;

    // Execute both queries
    const [mainResult, pdsResult] = await Promise.all([
      pg.query(query, params),
      pg.query(pdsQuery, pdsParams)
    ]);

    const rows = mainResult.rows;
    const pdsRows = pdsResult.rows;

    // Build PDS price map: itemId -> { qtyMin -> pdsPrice }
    const pdsMap: Record<number, Record<number, number>> = {};
    const seenPdsRanges: Set<string> = new Set();
    
    for (const row of pdsRows) {
      const rangeKey = `${row.itemId}-${row.qtyMin}`;
      if (seenPdsRanges.has(rangeKey)) continue;
      seenPdsRanges.add(rangeKey);
      
      if (!pdsMap[row.itemId]) {
        pdsMap[row.itemId] = {};
      }
      pdsMap[row.itemId][row.qtyMin] = parseFloat(row.pdsPrice);
    }

    // Group main results by item and keep only latest price per qty range
    const itemsMap: Record<number, any> = {};
    const seenRanges: Set<string> = new Set();
    
    for (const row of rows) {
      const rangeKey = `${row.itemId}-${row.qtyMin}`;
      
      if (seenRanges.has(rangeKey)) continue;
      seenRanges.add(rangeKey);

      if (!itemsMap[row.itemId]) {
        itemsMap[row.itemId] = {
          itemId: row.itemId,
          itemCode: row.itemCode,
          description: row.description,
          udm: row.udm ? parseFloat(row.udm) : null,
          categoryName: row.categoryName,
          className: row.className,
          priceListName: row.priceListName,
          priceCode: row.priceCode,
          ranges: []
        };
      }
      
      const qtyMin = parseInt(row.qtyMin);
      const pdsPrice = pdsMap[row.itemId]?.[qtyMin] || null;
      
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

    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error("Prices API error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la génération des prix" }, 
      { status: 500 }
    );
  }
}
