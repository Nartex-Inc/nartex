import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

const PDS_PRICE_ID = 17;
const EXP_PRICE_ID = 4;

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

    // Build filter conditions
    let itemFilterSQL = "";
    const baseParams: any[] = [prodIdNum];
    let paramIdx = 2;

    if (itemId) {
      itemFilterSQL = ` AND i."ItemId" = $${paramIdx}`;
      baseParams.push(parseInt(itemId, 10));
      paramIdx++;
    } else if (typeId) {
      itemFilterSQL = ` AND i."locitemtype" = $${paramIdx}`;
      baseParams.push(parseInt(typeId, 10));
      paramIdx++;
    }

    // Main query - using lowercase isactive (PostgreSQL converts unquoted to lowercase)
    const mainQuery = `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = $${paramIdx} 
          AND i."ProdId" = $1 
          AND i."IsActive" = true${itemFilterSQL}
        GROUP BY ipr."itemid"
      )
      SELECT 
        i."ItemId" as "itemId", i."ItemCode" as "itemCode", i."Descr" as "description",
        i."NetWeight" as "caisse", i."model" as "format", i."volume" as "volume",
        p."Name" as "categoryName", t."descr" as "className",
        ipr."fromqty" as "qtyMin", ipr."price" as "unitPrice",
        ipr."itempricerangeid" as "id", ipr."itempricedateid" as "dateId",
        pl."Descr" as "priceListName", pl."Pricecode" as "priceCode"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      INNER JOIN LatestDatePerItem ld ON ipr."itemid" = ld."itemid" AND ipr."itempricedateid" = ld."latestDateId"
      LEFT JOIN public."Products" p ON i."ProdId" = p."ProdId"
      LEFT JOIN public."itemtype" t ON i."locitemtype" = t."itemtypeid"
      WHERE ipr."priceid" = $${paramIdx} 
        AND i."ProdId" = $1 
        AND i."IsActive" = true 
        AND pl."IsActive" = true${itemFilterSQL}
      ORDER BY i."ItemCode" ASC, ipr."fromqty" ASC
    `;
    const mainParams = [...baseParams, priceIdNum];

    // PDS query
    const pdsQuery = `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = ${PDS_PRICE_ID} 
          AND i."ProdId" = $1 
          AND i."IsActive" = true${itemFilterSQL}
        GROUP BY ipr."itemid"
      )
      SELECT i."ItemId" as "itemId", ipr."fromqty" as "qtyMin", ipr."price" as "pdsPrice"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      INNER JOIN LatestDatePerItem ld ON ipr."itemid" = ld."itemid" AND ipr."itempricedateid" = ld."latestDateId"
      WHERE ipr."priceid" = ${PDS_PRICE_ID} 
        AND i."ProdId" = $1 
        AND i."IsActive" = true 
        AND pl."IsActive" = true${itemFilterSQL}
      ORDER BY i."ItemId" ASC, ipr."fromqty" ASC
    `;

    // EXP query
    const expQuery = `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = ${EXP_PRICE_ID} 
          AND i."ProdId" = $1 
          AND i."IsActive" = true${itemFilterSQL}
        GROUP BY ipr."itemid"
      )
      SELECT i."ItemId" as "itemId", ipr."fromqty" as "qtyMin", ipr."price" as "expPrice"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      INNER JOIN LatestDatePerItem ld ON ipr."itemid" = ld."itemid" AND ipr."itempricedateid" = ld."latestDateId"
      WHERE ipr."priceid" = ${EXP_PRICE_ID} 
        AND i."ProdId" = $1 
        AND i."IsActive" = true 
        AND pl."IsActive" = true${itemFilterSQL}
      ORDER BY i."ItemId" ASC, ipr."fromqty" ASC
    `;

    // Discount query
    const discountQuery = `
      SELECT 
        i."ItemId" as "itemId", 
        i."ItemCode" as "itemCode",
        rsd."FieldValue" as "hdrId",
        dmd."GreatherThan" as "greaterThan",
        dmd."_CostingDiscountAmt" as "costingDiscountAmt"
      FROM public."Items" i
      INNER JOIN public."RecordSpecData" rsd 
        ON i."ItemId" = rsd."TableId"
        AND rsd."FieldName" = 'DiscountMaintenance'
      INNER JOIN public."_DiscountMaintenanceDtl" dmd 
        ON CAST(rsd."FieldValue" AS INTEGER) = dmd."DiscountMaintenanceHdrId"
      WHERE i."ProdId" = $1 
        AND i."IsActive" = true${itemFilterSQL}
      ORDER BY i."ItemId" ASC, dmd."GreatherThan" ASC
    `;

    console.log("========================================");
    console.log("PRICES API - ProdId:", prodIdNum, "TypeId:", typeId, "ItemId:", itemId);
    console.log("========================================");

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

    console.log(`Results: Main=${rows.length}, PDS=${pdsRows.length}, EXP=${expRows.length}, Discounts=${discountRows.length}`);
    
    if (discountRows.length > 0) {
      console.log("DISCOUNT ROWS (first 10):");
      discountRows.slice(0, 10).forEach((row: any) => {
        console.log(`  ItemId=${row.itemId} (${row.itemCode}): GreaterThan=${row.greaterThan}, Amt=${row.costingDiscountAmt}`);
      });
    }

    // Build PDS map
    const pdsMap: Record<number, Record<number, number>> = {};
    for (const row of pdsRows) {
      const id = Number(row.itemId);
      const qty = Number(row.qtyMin);
      if (!pdsMap[id]) pdsMap[id] = {};
      pdsMap[id][qty] = parseFloat(row.pdsPrice);
    }

    // Build EXP map
    const expMap: Record<number, Record<number, number>> = {};
    for (const row of expRows) {
      const id = Number(row.itemId);
      const qty = Number(row.qtyMin);
      if (!expMap[id]) expMap[id] = {};
      expMap[id][qty] = parseFloat(row.expPrice);
    }

    // Build discount map
    const discountMap: Record<number, Record<number, number>> = {};
    for (const row of discountRows) {
      const id = Number(row.itemId);
      const gt = Number(row.greaterThan);
      const amt = parseFloat(row.costingDiscountAmt) || 0;
      if (!discountMap[id]) discountMap[id] = {};
      discountMap[id][gt] = amt;
    }
    
    console.log("Discount map has", Object.keys(discountMap).length, "items");

    // Group results by item
    const itemsMap: Record<number, any> = {};
    
    for (const row of rows) {
      const id = Number(row.itemId);
      
      if (!itemsMap[id]) {
        itemsMap[id] = {
          itemId: id,
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
      
      const qtyMin = Number(row.qtyMin);
      const pdsPrice = pdsMap[id]?.[qtyMin] ?? null;
      const expBasePrice = expMap[id]?.[qtyMin] ?? null;
      
      // Get discount for this quantity tier
      let costingDiscountAmt = 0;
      const itemDiscounts = discountMap[id];
      
      if (itemDiscounts) {
        if (itemDiscounts[qtyMin] !== undefined) {
          costingDiscountAmt = itemDiscounts[qtyMin];
        } else {
          const tiers = Object.keys(itemDiscounts).map(Number).sort((a, b) => b - a);
          for (const tier of tiers) {
            if (tier <= qtyMin) {
              costingDiscountAmt = itemDiscounts[tier];
              break;
            }
          }
        }
      }
      
      const coutExp = expBasePrice !== null ? expBasePrice - costingDiscountAmt : null;
      
      itemsMap[id].ranges.push({
        id: row.id,
        qtyMin: qtyMin,
        unitPrice: parseFloat(row.unitPrice),
        pdsPrice: pdsPrice,
        expBasePrice: expBasePrice,
        coutExp: coutExp,
        costingDiscountAmt: costingDiscountAmt
      });
    }

    const result = Object.values(itemsMap).map((item: any) => ({
      ...item,
      ranges: item.ranges.sort((a: any, b: any) => a.qtyMin - b.qtyMin)
    }));

    console.log(`Returning ${result.length} items`);

    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error("Prices API error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la génération des prix" }, 
      { status: 500 }
    );
  }
}
