import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

// Hardcoded Price IDs based on your system
const EXP_PRICE_ID = 4;   // 01-EXP
const DET_PRICE_ID = 2;   // 02-DET
const IND_PRICE_ID = 3;   // 03-IND
const GROS_PRICE_ID = 1;  // 05-GROS
const PDS_PRICE_ID = 17;  // 08-PDS

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

    // Filter for Active items only
    // Using i."isActive" as seen in your screenshot
    const activeFilter = `AND i."isActive" = true`;

    // 1. Fetch Main Data (Items + Selected Price List)
    const mainQuery = `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = $${paramIdx} AND i."ProdId" = $1 ${itemFilterSQL} ${activeFilter}
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
      WHERE ipr."priceid" = $${paramIdx} AND i."ProdId" = $1 ${itemFilterSQL} ${activeFilter}
      ORDER BY i."ItemCode" ASC, ipr."fromqty" ASC
    `;
    const mainParams = [...baseParams, priceIdNum];

    // 2. Fetch ALL relevant price columns to support templates (01, 02, 03, 05, 17)
    // We execute one query to get all alternate prices for these items
    const altPricesQuery = `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", ipr."priceid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" IN (1, 2, 3, 4, 17) AND i."ProdId" = $1 ${itemFilterSQL} ${activeFilter}
        GROUP BY ipr."itemid", ipr."priceid"
      )
      SELECT 
        i."ItemId" as "itemId", 
        ipr."priceid" as "priceId",
        ipr."fromqty" as "qtyMin", 
        ipr."price" as "price"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN LatestDatePerItem ld ON ipr."itemid" = ld."itemid" AND ipr."priceid" = ld."priceid" AND ipr."itempricedateid" = ld."latestDateId"
      WHERE i."ProdId" = $1 ${itemFilterSQL} ${activeFilter}
    `;

    // 3. Fetch Discount Data (for display only)
    const discountQuery = `
      SELECT 
        i."ItemId" as "itemId", 
        dmd."GreatherThan" as "greaterThan",
        dmd."_CostingDiscountAmt" as "costingDiscountAmt"
      FROM public."Items" i
      INNER JOIN public."RecordSpecData" rsd 
        ON i."ItemId" = rsd."TableId"
        AND rsd."FieldName" = 'DiscountMaintenance'
        AND rsd."TableName" = 'items'
        AND rsd."FieldValue" ~ '^[0-9]+$' 
      INNER JOIN public."_DiscountMaintenanceHdr" dmh
        ON CAST(rsd."FieldValue" AS INTEGER) = dmh."DiscountMaintenanceHdrId"
      INNER JOIN public."_DiscountMaintenanceDtl" dmd 
        ON dmh."DiscountMaintenanceHdrId" = dmd."DiscountMaintenanceHdrId"
      WHERE i."ProdId" = $1 ${itemFilterSQL} ${activeFilter}
      ORDER BY i."ItemId" ASC, dmd."GreatherThan" ASC
    `;

    // 4. Execute queries
    const [mainResult, altPricesResult, discountResult] = await Promise.all([
      pg.query(mainQuery, mainParams),
      pg.query(altPricesQuery, baseParams),
      pg.query(discountQuery, baseParams).catch(err => {
        console.error("Discount query error:", err.message);
        return { rows: [] };
      })
    ]);

    const rows = mainResult.rows;
    const altRows = altPricesResult.rows;
    const discountRows = discountResult.rows;

    // 5. Build Map for Alternate Prices
    // Structure: itemId -> priceId -> qtyMin -> price
    const priceMap: Record<number, Record<number, Record<number, number>>> = {};
    for (const row of altRows) {
      if (!priceMap[row.itemId]) priceMap[row.itemId] = {};
      if (!priceMap[row.itemId][row.priceId]) priceMap[row.itemId][row.priceId] = {};
      priceMap[row.itemId][row.priceId][parseInt(row.qtyMin)] = parseFloat(row.price);
    }

    // 6. Build Discount Map
    const discountMap: Record<number, Record<number, number>> = {};
    for (const row of discountRows) {
      if (!discountMap[row.itemId]) discountMap[row.itemId] = {};
      const greaterThan = parseInt(row.greaterThan);
      const discountAmt = parseFloat(row.costingDiscountAmt) || 0;
      discountMap[row.itemId][greaterThan] = discountAmt;
    }

    // 7. Build Result
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
          className: row.className || "Autres", // Grouping key
          priceListName: row.priceListName,
          priceCode: row.priceCode,
          ranges: []
        };
      }
      
      const qtyMin = parseInt(row.qtyMin);
      
      // Helper to safely get price from map
      const getPrice = (pid: number) => priceMap[row.itemId]?.[pid]?.[qtyMin] ?? null;

      // Get discount for this quantity tier (for display only)
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

      itemsMap[row.itemId].ranges.push({
        id: row.id,
        qtyMin: qtyMin,
        unitPrice: parseFloat(row.unitPrice), // The selected price list price
        
        // Specific columns for templates
        pdsPrice: getPrice(PDS_PRICE_ID),
        expPrice: getPrice(EXP_PRICE_ID),
        detPrice: getPrice(DET_PRICE_ID),
        indPrice: getPrice(IND_PRICE_ID),
        grosPrice: getPrice(GROS_PRICE_ID),
        
        // Coût Exp logic (Equal to 01-EXP price as requested)
        coutExp: getPrice(EXP_PRICE_ID), 
        costingDiscountAmt: costingDiscountAmt // Passed for display column only
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
