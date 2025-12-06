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
    // Added Items.volume for ($)/L calculation
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

    // EXP base price query (priceid=4) for COÛT EXP calculation
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

    // Discount query: Get discount amounts per item PER QUANTITY TIER
    // Join: Items.ItemId → RecordSpecData.TableId (where FieldName = 'DiscountMaintenance')
    //       RecordSpecData.FieldValue → _DiscountMaintenanceHdr.DiscountMaintenanceHdrId
    //       _DiscountMaintenanceHdr.DiscountMaintenanceHdrId → _DiscountMaintenanceDtl.DiscountMaintenanceHdrId
    // GreatherThan in _DiscountMaintenanceDtl matches fromqty in itempricerange
    const discountQuery = `
      SELECT 
        i."ItemId" as "itemId",
        dmd."GreatherThan" as "greaterThan",
        dmd."_CostingDiscountAmt" as "costingDiscountAmt"
      FROM public."Items" i
      INNER JOIN public."RecordSpecData" rsd 
        ON i."ItemId" = rsd."TableId"
        AND rsd."FieldName" = 'DiscountMaintenance'
      INNER JOIN public."_DiscountMaintenanceHdr" dmh 
        ON CAST(rsd."FieldValue" AS INTEGER) = dmh."DiscountMaintenanceHdrId"
      INNER JOIN public."_DiscountMaintenanceDtl" dmd 
        ON dmh."DiscountMaintenanceHdrId" = dmd."DiscountMaintenanceHdrId"
      WHERE i."ProdId" = $1
        ${itemFilterSQL}
      ORDER BY i."ItemId" ASC, dmd."GreatherThan" ASC
    `;

    console.log("Executing queries...");

    // Execute all queries in parallel
    const [mainResult, pdsResult, expResult, discountResult] = await Promise.all([
      pg.query(mainQuery, mainParams),
      pg.query(pdsQuery, baseParams),
      pg.query(expQuery, baseParams),
      pg.query(discountQuery, baseParams).catch(err => {
        console.log("Discount query error (table may not exist):", err.message);
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

    // Build discount map: itemId -> discountAmt
    const discountMap: Record<number, number> = {};
    for (const row of discountRows) {
      discountMap[row.itemId] = parseFloat(row.discountAmt) || 0;
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
          discountAmt: discountMap[row.itemId] || 0,
          ranges: []
        };
      }
      
      const qtyMin = parseInt(row.qtyMin);
      const pdsPrice = pdsMap[row.itemId]?.[qtyMin] ?? null;
      const expBasePrice = expMap[row.itemId]?.[qtyMin] ?? null;
      const discountAmt = discountMap[row.itemId] || 0;
      
      // COÛT EXP = EXP base price + discount amount
      const coutExp = expBasePrice !== null ? expBasePrice + discountAmt : null;
      
      itemsMap[row.itemId].ranges.push({
        id: row.id,
        qtyMin: qtyMin,
        unitPrice: parseFloat(row.unitPrice),
        pdsPrice: pdsPrice,
        expBasePrice: expBasePrice,
        coutExp: coutExp
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
