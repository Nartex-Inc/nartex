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

    const mainQuery = `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = $${paramIdx} AND i."ProdId" = $1 ${itemFilterSQL}
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
      WHERE ipr."priceid" = $${paramIdx} AND i."ProdId" = $1 AND pl."IsActive" = true ${itemFilterSQL}
      ORDER BY i."ItemCode" ASC, ipr."fromqty" ASC
    `;
    const mainParams = [...baseParams, priceIdNum];

    const pdsQuery = `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = ${PDS_PRICE_ID} AND i."ProdId" = $1 ${itemFilterSQL}
        GROUP BY ipr."itemid"
      )
      SELECT i."ItemId" as "itemId", ipr."fromqty" as "qtyMin", ipr."price" as "pdsPrice"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      INNER JOIN LatestDatePerItem ld ON ipr."itemid" = ld."itemid" AND ipr."itempricedateid" = ld."latestDateId"
      WHERE ipr."priceid" = ${PDS_PRICE_ID} AND i."ProdId" = $1 AND pl."IsActive" = true ${itemFilterSQL}
      ORDER BY i."ItemId" ASC, ipr."fromqty" ASC
    `;

    const expQuery = `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = ${EXP_PRICE_ID} AND i."ProdId" = $1 ${itemFilterSQL}
        GROUP BY ipr."itemid"
      )
      SELECT i."ItemId" as "itemId", ipr."fromqty" as "qtyMin", ipr."price" as "expPrice"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      INNER JOIN LatestDatePerItem ld ON ipr."itemid" = ld."itemid" AND ipr."itempricedateid" = ld."latestDateId"
      WHERE ipr."priceid" = ${EXP_PRICE_ID} AND i."ProdId" = $1 AND pl."IsActive" = true ${itemFilterSQL}
      ORDER BY i."ItemId" ASC, ipr."fromqty" ASC
    `;

    // FIX: Added (rsd."FieldValue" ~ '^[0-9]+$') to PREVENT CRASHES on dirty data
    // This ensures we only try to join when the field value is actually a number.
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
        AND rsd."FieldValue" ~ '^[0-9]+$' 
      INNER JOIN public."_DiscountMaintenanceDtl" dmd 
        ON CAST(rsd."FieldValue" AS INTEGER) = dmd."DiscountMaintenanceHdrId"
      WHERE i."ProdId" = $1 ${itemFilterSQL}
      ORDER BY i."ItemId" ASC, dmd."GreatherThan" ASC
    `;

    console.log("========================================");
    console.log("PRICES API - ProdId:", prodIdNum, "TypeId:", typeId, "ItemId:", itemId);

    // Execute main queries
    const [mainResult, pdsResult, expResult, discountResult] = await Promise.all([
      pg.query(mainQuery, mainParams),
      pg.query(pdsQuery, baseParams),
      pg.query(expQuery, baseParams),
      pg.query(discountQuery, baseParams).catch(err => {
        // If this logs, it means the query crashed (likely casting error) and returned empty
        console.error("Discount query error:", err.message);
        return { rows: [] };
      })
    ]);

    const rows = mainResult.rows;
    const pdsRows = pdsResult.rows;
    const expRows = expResult.rows;
    const discountRows = discountResult.rows;

    console.log(`Results: Main=${rows.length}, PDS=${pdsRows.length}, EXP=${expRows.length}, Discounts=${discountRows.length}`);

    // Build maps
    const pdsMap: Record<number, Record<number, number>> = {};
    for (const row of pdsRows) {
      if (!pdsMap[row.itemId]) pdsMap[row.itemId] = {};
      pdsMap[row.itemId][parseInt(row.qtyMin)] = parseFloat(row.pdsPrice);
    }

    const expMap: Record<number, Record<number, number>> = {};
    for (const row of expRows) {
      if (!expMap[row.itemId]) expMap[row.itemId] = {};
      expMap[row.itemId][parseInt(row.qtyMin)] = parseFloat(row.expPrice);
    }

    const discountMap: Record<number, Record<number, number>> = {};
    for (const row of discountRows) {
      if (!discountMap[row.itemId]) discountMap[row.itemId] = {};
      const greaterThan = parseInt(row.greaterThan);
      const discountAmt = parseFloat(row.costingDiscountAmt) || 0;
      discountMap[row.itemId][greaterThan] = discountAmt;
    }

    // Group results by item
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
      const pdsPrice = pdsMap[row.itemId]?.[qtyMin] ?? null;
      const expBasePrice = expMap[row.itemId]?.[qtyMin] ?? null;
      
      // Get discount for this quantity tier
      let costingDiscountAmt = 0;
      const itemDiscounts = discountMap[row.itemId];
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
      
      // COÛT EXP = EXP base price MINUS discount
      const coutExp = expBasePrice !== null ? expBasePrice - costingDiscountAmt : null;
      
      itemsMap[row.itemId].ranges.push({
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

    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error("Prices API error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la génération des prix" }, 
      { status: 500 }
    );
  }
}
