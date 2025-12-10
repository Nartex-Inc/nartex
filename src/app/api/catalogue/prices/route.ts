import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const PDS_PRICE_ID = 17;
const EXP_PRICE_ID = 4; // For costing base calculation

// Standard Database Price IDs
const PRICE_LIST_IDS = {
  EXP: 1,        // 01-EXP (EXPERT)
  DET: 2,        // 02-DET (DÉTAILLANT)
  IND: 3,        // 03-IND (INDUSTRIEL)
  GROSEXP: 4,    // 04-GROSEXP (GROSSISTE EXPERT)
  GROS: 5,       // 05-GROS (GROSSISTE)
  INDHZ: 6,      // 06-INDHZ (INDUSTRIEL HZ)
  DETHZ: 7,      // 07-DETHZ (DÉTAILLANT HZ)
  PDS: 17,       // PDS/MSRP
};

// COLUMN MAPPING - Defines which columns to show for each selected price list
const PRICE_LIST_COLUMN_MAPPING: Record<number, { code: string; columns: { priceId: number; label: string; code: string }[] }> = {
  [PRICE_LIST_IDS.EXP]: {
    code: "01-EXPERT",
    columns: [
      { priceId: PRICE_LIST_IDS.EXP, label: "EXPERT", code: "EXPERT" },
      { priceId: PRICE_LIST_IDS.GROS, label: "GROSSISTE_WHOLESALE", code: "GROSSISTE" },
      { priceId: PRICE_LIST_IDS.DET, label: "DÉTAILLANT_RETAILER", code: "DÉTAILLANT" },
      { priceId: PRICE_LIST_IDS.IND, label: "INDUSTRIEL_INDUSTRIAL", code: "INDUSTRIEL" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS_MSRP", code: "PDS" },
    ],
  },
  [PRICE_LIST_IDS.DET]: {
    code: "02-DÉTAILLANT",
    columns: [
      { priceId: PRICE_LIST_IDS.DET, label: "DÉTAILLANT_RETAILER", code: "DÉTAILLANT" },
      { priceId: PRICE_LIST_IDS.IND, label: "INDUSTRIEL_INDUSTRIAL", code: "INDUSTRIEL" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS_MSRP", code: "PDS" },
    ],
  },
  [PRICE_LIST_IDS.IND]: {
    code: "03-INDUSTRIEL",
    columns: [
      { priceId: PRICE_LIST_IDS.IND, label: "INDUSTRIEL_INDUSTRIAL", code: "INDUSTRIEL" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS_MSRP", code: "PDS" },
    ],
  },
  [PRICE_LIST_IDS.GROSEXP]: {
    code: "04-GROSSISTE EXPERT",
    columns: [
      { priceId: PRICE_LIST_IDS.GROSEXP, label: "GROSS-EXP", code: "GROSS-EXP" },
      { priceId: PRICE_LIST_IDS.EXP, label: "EXPERT", code: "EXPERT" },
      { priceId: PRICE_LIST_IDS.GROS, label: "GROSSISTE_WHOLESALE", code: "GROSSISTE" },
      { priceId: PRICE_LIST_IDS.DET, label: "DÉTAILLANT_RETAILER", code: "DÉTAILLANT" },
      { priceId: PRICE_LIST_IDS.IND, label: "INDUSTRIEL_INDUSTRIAL", code: "INDUSTRIEL" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS_MSRP", code: "PDS" },
    ],
  },
  [PRICE_LIST_IDS.GROS]: {
    code: "05-GROSSISTE",
    columns: [
      { priceId: PRICE_LIST_IDS.GROS, label: "GROSSISTE_WHOLESALE", code: "GROSSISTE" },
      { priceId: PRICE_LIST_IDS.DET, label: "DÉTAILLANT_RETAILER", code: "DÉTAILLANT" },
      { priceId: PRICE_LIST_IDS.IND, label: "INDUSTRIEL_INDUSTRIAL", code: "INDUSTRIEL" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS_MSRP", code: "PDS" },
    ],
  },
  [PRICE_LIST_IDS.INDHZ]: {
    code: "06-INDUSTRIEL HZ",
    columns: [
      { priceId: PRICE_LIST_IDS.INDHZ, label: "INDUSTRIEL_HZ", code: "IND-HZ" },
      { priceId: PRICE_LIST_IDS.IND, label: "INDUSTRIEL_INDUSTRIAL", code: "INDUSTRIEL" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS_MSRP", code: "PDS" },
    ],
  },
  [PRICE_LIST_IDS.DETHZ]: {
    code: "07-DÉTAILLANT HZ",
    columns: [
      { priceId: PRICE_LIST_IDS.DETHZ, label: "DÉTAILLANT_HZ", code: "DET-HZ" },
      { priceId: PRICE_LIST_IDS.DET, label: "DÉTAILLANT_RETAILER", code: "DÉTAILLANT" },
      { priceId: PRICE_LIST_IDS.IND, label: "INDUSTRIEL_INDUSTRIAL", code: "INDUSTRIEL" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS_MSRP", code: "PDS" },
    ],
  },
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

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

    // Build item filter
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

    const activeFilter = `AND i."isActive" = true`;

    // Get column mapping for selected price list
    const mapping = PRICE_LIST_COLUMN_MAPPING[priceIdNum];
    const columnsConfig = mapping?.columns || [
      { priceId: priceIdNum, label: "Prix", code: "PRIX" },
      { priceId: PDS_PRICE_ID, label: "PDS_MSRP", code: "PDS" },
    ];

    // Get unique price IDs we need to fetch
    const priceIdsToFetch = [...new Set(columnsConfig.map(c => c.priceId))];

    // ========================================================================
    // MAIN QUERY - Get item details using the PRIMARY (selected) price list
    // This establishes our base items and their quantity ranges
    // ========================================================================
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

    // ========================================================================
    // BUILD SEPARATE QUERY FOR EACH ADDITIONAL PRICE COLUMN
    // ========================================================================
    const buildPriceQuery = (targetPriceId: number) => `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = ${targetPriceId} AND i."ProdId" = $1 ${itemFilterSQL} ${activeFilter}
        GROUP BY ipr."itemid"
      )
      SELECT i."ItemId" as "itemId", ipr."fromqty" as "qtyMin", ipr."price" as "price"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      INNER JOIN LatestDatePerItem ld ON ipr."itemid" = ld."itemid" AND ipr."itempricedateid" = ld."latestDateId"
      WHERE ipr."priceid" = ${targetPriceId} AND i."ProdId" = $1 ${itemFilterSQL} ${activeFilter}
      ORDER BY i."ItemId" ASC, ipr."fromqty" ASC
    `;

    // ========================================================================
    // EXP QUERY - For costing base calculation (always needed)
    // ========================================================================
    const expQuery = `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = ${EXP_PRICE_ID} AND i."ProdId" = $1 ${itemFilterSQL} ${activeFilter}
        GROUP BY ipr."itemid"
      )
      SELECT i."ItemId" as "itemId", ipr."fromqty" as "qtyMin", ipr."price" as "expPrice"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      INNER JOIN LatestDatePerItem ld ON ipr."itemid" = ld."itemid" AND ipr."itempricedateid" = ld."latestDateId"
      WHERE ipr."priceid" = ${EXP_PRICE_ID} AND i."ProdId" = $1 ${itemFilterSQL} ${activeFilter}
      ORDER BY i."ItemId" ASC, ipr."fromqty" ASC
    `;

    // ========================================================================
    // DISCOUNT QUERY
    // ========================================================================
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

    // ========================================================================
    // EXECUTE ALL QUERIES
    // ========================================================================
    
    // Build list of additional price IDs to query (excluding the main one)
    const additionalPriceIds = priceIdsToFetch.filter(pid => pid !== priceIdNum);
    
    const queryPromises: Promise<any>[] = [
      pg.query(mainQuery, mainParams),
      pg.query(expQuery, baseParams),
      pg.query(discountQuery, baseParams).catch(err => {
        console.error("Discount query error:", err.message);
        return { rows: [] };
      })
    ];

    // Add a query for each additional price column
    for (const pid of additionalPriceIds) {
      queryPromises.push(pg.query(buildPriceQuery(pid), baseParams));
    }

    const results = await Promise.all(queryPromises);

    const mainResult = results[0];
    const expResult = results[1];
    const discountResult = results[2];
    const additionalPriceResults = results.slice(3);

    // ========================================================================
    // BUILD PRICE MAPS
    // ========================================================================
    
    // Map for EXP prices (for costing)
    const expMap: Record<number, Record<number, number>> = {};
    for (const row of expResult.rows) {
      if (!expMap[row.itemId]) expMap[row.itemId] = {};
      expMap[row.itemId][parseInt(row.qtyMin)] = parseFloat(row.expPrice);
    }

    // Map for discounts
    const discountMap: Record<number, Record<number, number>> = {};
    for (const row of discountResult.rows) {
      if (!discountMap[row.itemId]) discountMap[row.itemId] = {};
      const greaterThan = parseInt(row.greaterThan);
      const discountAmt = parseFloat(row.costingDiscountAmt) || 0;
      discountMap[row.itemId][greaterThan] = discountAmt;
    }

    // Maps for each additional price column: { priceId: { itemId: { qtyMin: price } } }
    const priceColumnMaps: Record<number, Record<number, Record<number, number>>> = {};
    
    additionalPriceIds.forEach((pid, idx) => {
      const result = additionalPriceResults[idx];
      priceColumnMaps[pid] = {};
      
      for (const row of result.rows) {
        if (!priceColumnMaps[pid][row.itemId]) {
          priceColumnMaps[pid][row.itemId] = {};
        }
        priceColumnMaps[pid][row.itemId][parseInt(row.qtyMin)] = parseFloat(row.price);
      }
    });

    // ========================================================================
    // PROCESS MAIN RESULTS AND MERGE ALL PRICES
    // ========================================================================
    const itemsMap: Record<number, any> = {};
    
    for (const row of mainResult.rows) {
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
      const unitPrice = parseFloat(row.unitPrice);
      
      // Get EXP base price for costing
      const expBasePrice = expMap[row.itemId]?.[qtyMin] ?? null;
      
      // Calculate Discount
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
      
      // Coût EXP = EXP Base Price only (as requested)
      const coutExp = expBasePrice;

      // Build the prices dictionary for all columns
      const prices: Record<number, number> = {};
      
      // Add the main/selected price
      prices[priceIdNum] = unitPrice;
      
      // Add all additional prices from our column maps
      for (const pid of additionalPriceIds) {
        const priceVal = priceColumnMaps[pid]?.[row.itemId]?.[qtyMin];
        if (priceVal !== undefined) {
          prices[pid] = priceVal;
        }
      }

      // Get PDS price for margin calculation
      const pdsPrice = prices[PDS_PRICE_ID] ?? null;
      
      itemsMap[row.itemId].ranges.push({
        id: row.id,
        qtyMin: qtyMin,
        unitPrice: unitPrice,
        pdsPrice: pdsPrice,
        expBasePrice: expBasePrice,
        coutExp: coutExp,
        costingDiscountAmt: costingDiscountAmt,
        prices: prices // All prices for all columns
      });
    }

    // Sort ranges and convert to array
    const result = Object.values(itemsMap).map((item: any) => ({
      ...item,
      ranges: item.ranges.sort((a: any, b: any) => a.qtyMin - b.qtyMin)
    }));

    // Return with columns config for frontend
    return NextResponse.json({
      ok: true,
      items: result,
      columnsConfig: columnsConfig,
      selectedPriceId: priceIdNum,
      primaryPriceId: priceIdNum
    });
    
  } catch (error: any) {
    console.error("Prices API error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Erreur lors de la génération des prix" }, 
      { status: 500 }
    );
  }
}
