import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

const PDS_PRICE_ID = 17; // priceid for 08-PDS (PRIX DETAIL / MSRP)
const EXP_PRICE_ID = 4;  // priceid for 01-EXPERT PRICE

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

    // Build item filter for queries
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

    // Main query: Get prices with MAX(itempricedateid) per item
    // Gets the price selected in the dropdown (e.g. 01-EXP, 02-PRO, etc.)
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
        i."volume" as "volume",
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

    // PDS query: Get PDS prices (priceid=17)
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

    // EXP base price query (priceid=4)
    // Used as the BASE for Coût Exp calculation
    const expQuery = `
      WITH LatestDatePerItem AS (
        SELECT 
          ipr."itemid",
          MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = ${EXP_PRICE_ID}
          AND i."ProdId" = $1
          ${itemFilterSQL}
        GROUP BY ipr."itemid"
      )
      SELECT 
        i."ItemId" as "itemId",
        ipr."fromqty" as "qtyMin",
        ipr."price" as "expPrice"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      INNER JOIN LatestDatePerItem ld ON ipr."itemid" = ld."itemid" AND ipr."itempricedateid" = ld."latestDateId"
      WHERE ipr."priceid" = ${EXP_PRICE_ID}
        AND i."ProdId" = $1
        AND pl."IsActive" = true
        ${itemFilterSQL}
      ORDER BY i."ItemId" ASC, ipr."fromqty" ASC
    `;

    // Discount query: Fetch ALL tiers for the item
    // Mapped via RecordSpecData (Items -> FieldValue) -> _DiscountMaintenanceHdr -> _DiscountMaintenanceDtl
    const discountQuery = `
      SELECT 
        i."ItemId" as "itemId",
        dmd."GreatherThan" as "minQty",
        dmd."_CostingDiscountAmt" as "discountAmt"
      FROM public."Items" i
      INNER JOIN public."RecordSpecData" rsd 
        ON i."ItemId" = rsd."TableId"
      INNER JOIN public."_DiscountMaintenanceHdr" dmh
        ON CAST(rsd."FieldValue" AS INTEGER) = dmh."DiscountMaintenanceHdrId"
      INNER JOIN public."_DiscountMaintenanceDtl" dmd 
        ON dmh."DiscountMaintenanceHdrId" = dmd."DiscountMaintenanceHdrId"
      WHERE i."ProdId" = $1
        AND rsd."TableName" = 'items'
        AND rsd."FieldName" = 'DiscountMaintenance'
        ${itemFilterSQL}
      ORDER BY i."ItemId", dmd."GreatherThan" DESC
    `;

    console.log("Executing queries...");

    // Execute all queries in parallel
    const [mainResult, pdsResult, expResult, discountResult] = await Promise.all([
      pg.query(mainQuery, mainParams),
      pg.query(pdsQuery, baseParams),
      pg.query(expQuery, baseParams),
      pg.query(discountQuery, baseParams).catch(err => {
        console.error("Discount query error:", err.message);
        return { rows: [] };
      })
    ]);

    const rows = mainResult.rows;
    const pdsRows = pdsResult.rows;
    const expRows = expResult.rows;
    const discountRows = discountResult.rows;

    console.log(`Main: ${rows.length}, PDS: ${pdsRows.length}, EXP: ${expRows.length}, Discounts: ${discountRows.length}`);

    // Build PDS price map: itemId -> { qtyMin -> pdsPrice }
    const pdsMap: Record<number, Record<number, number>> = {};
    for (const row of pdsRows) {
      if (!pdsMap[row.itemId]) pdsMap[row.itemId] = {};
      pdsMap[row.itemId][parseInt(row.qtyMin)] = parseFloat(row.pdsPrice);
    }

    // Build EXP price map: itemId -> { qtyMin -> expPrice }
    const expMap: Record<number, Record<number, number>> = {};
    for (const row of expRows) {
      if (!expMap[row.itemId]) expMap[row.itemId] = {};
      expMap[row.itemId][parseInt(row.qtyMin)] = parseFloat(row.expPrice);
    }

    // Build discount tiers map: itemId -> Array of { minQty, val }
    // Stored sorted by minQty DESC to easily find the correct tier
    interface DiscountTier { minQty: number; val: number; }
    const discountMap: Record<number, DiscountTier[]> = {};
    
    for (const row of discountRows) {
      if (!discountMap[row.itemId]) discountMap[row.itemId] = [];
      discountMap[row.itemId].push({
        minQty: parseInt(row.minQty),
        val: parseFloat(row.discountAmt) || 0
      });
    }

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
          volume: row.volume ? parseFloat(row.volume) : null,
          categoryName: row.categoryName,
          className: row.className,
          priceListName: row.priceListName,
          priceCode: row.priceCode,
          ranges: []
        };
      }
      
      const qtyMin = parseInt(row.qtyMin);
      
      // Get PDS Price
      const pdsPrice = pdsMap[row.itemId]?.[qtyMin] ?? null;
      
      // Get Base EXP Price (from priceid 4)
      const expBasePrice = expMap[row.itemId]?.[qtyMin] ?? null;
      
      // Calculate Discount Amount based on Quantity Tier
      // Logic: Find the highest 'GreatherThan' that is less than or equal to current qtyMin
      let discountAmt = 0;
      const tiers = discountMap[row.itemId];
      
      if (tiers && tiers.length > 0) {
        // Since tiers are sorted DESC (e.g., 240, 80, 1), we find the first one that fits.
        const tier = tiers.find(t => t.minQty <= qtyMin);
        if (tier) {
          discountAmt = tier.val;
        } else {
          // Fallback: if quantity is smaller than smallest tier (unlikely if tier starts at 1)
          // We can assume 0 or take the smallest tier. Usually tier 1 exists.
          discountAmt = 0;
        }
      }
      
      // COÛT EXP Calculation:
      // Coût Exp = Expert Price + _CostingDiscountAmt
      // Example: 3.62 + (-0.50) = 3.12
      const coutExp = expBasePrice !== null ? expBasePrice + discountAmt : null;
      
      itemsMap[row.itemId].ranges.push({
        id: row.id,
        qtyMin: qtyMin,
        unitPrice: parseFloat(row.unitPrice),
        pdsPrice: pdsPrice,
        expBasePrice: expBasePrice,
        coutExp: coutExp,
        discountAmt: discountAmt
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
