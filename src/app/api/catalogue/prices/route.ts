import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const PDS_PRICE_ID = 17;
const EXP_PRICE_ID = 4; // Using 4 as per your snippet

// ID Mapping for the Columns (Standard IDs)
const PRICE_LIST_IDS = {
  EXP: 1,        // 01-EXP
  DET: 2,        // 02-DET
  IND: 3,        // 03-IND
  GROSEXP: 4,    // 04-GROSEXP
  GROS: 5,       // 05-GROS
  INDHZ: 6,      // 06-INDHZ
  DETHZ: 7,      // 07-DETHZ
  PDS: 17,       // 08-PDS
};

// Column Display Mapping
const PRICE_LIST_COLUMN_MAPPING: Record<number, { code: string; columns: { priceId: number; label: string; code: string }[] }> = {
  [PRICE_LIST_IDS.EXP]: {
    code: "01-EXP",
    columns: [
      { priceId: PRICE_LIST_IDS.EXP, label: "EXPERT", code: "01-EXP" },
      { priceId: PRICE_LIST_IDS.DET, label: "DÉTAILLANT", code: "02-DET" },
      { priceId: PRICE_LIST_IDS.IND, label: "INDUSTRIEL", code: "03-IND" },
      { priceId: PRICE_LIST_IDS.GROSEXP, label: "GROSS-EXP", code: "04-GROSEXP" },
      { priceId: PRICE_LIST_IDS.GROS, label: "GROSSISTE", code: "05-GROS" },
      { priceId: PRICE_LIST_IDS.INDHZ, label: "INDUSTRIEL HZ", code: "06-INDHZ" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS", code: "08-PDS" },
    ],
  },
  [PRICE_LIST_IDS.DET]: {
    code: "02-DET",
    columns: [
      { priceId: PRICE_LIST_IDS.DET, label: "DÉTAILLANT", code: "02-DET" },
      { priceId: PRICE_LIST_IDS.IND, label: "INDUSTRIEL", code: "03-IND" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS", code: "08-PDS" },
    ],
  },
  [PRICE_LIST_IDS.IND]: {
    code: "03-IND",
    columns: [
      { priceId: PRICE_LIST_IDS.IND, label: "INDUSTRIEL", code: "03-IND" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS", code: "08-PDS" },
    ],
  },
  [PRICE_LIST_IDS.GROSEXP]: {
    code: "04-GROSEXP",
    columns: [
      { priceId: PRICE_LIST_IDS.EXP, label: "EXPERT", code: "01-EXP" },
      { priceId: PRICE_LIST_IDS.IND, label: "INDUSTRIEL", code: "03-IND" },
      { priceId: PRICE_LIST_IDS.GROSEXP, label: "GROSS-EXP", code: "04-GROSEXP" },
      { priceId: PRICE_LIST_IDS.GROS, label: "GROSSISTE", code: "05-GROS" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS", code: "08-PDS" },
    ],
  },
  [PRICE_LIST_IDS.GROS]: {
    code: "05-GROS",
    columns: [
      { priceId: PRICE_LIST_IDS.DET, label: "DÉTAILLANT", code: "02-DET" },
      { priceId: PRICE_LIST_IDS.IND, label: "INDUSTRIEL", code: "03-IND" },
      { priceId: PRICE_LIST_IDS.GROS, label: "GROSSISTE", code: "05-GROS" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS", code: "08-PDS" },
    ],
  },
  [PRICE_LIST_IDS.INDHZ]: {
    code: "06-INDHZ",
    columns: [
      { priceId: PRICE_LIST_IDS.INDHZ, label: "INDUSTRIEL HZ", code: "06-INDHZ" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS", code: "08-PDS" },
    ],
  },
  [PRICE_LIST_IDS.DETHZ]: {
    code: "07-DETHZ",
    columns: [
      { priceId: PRICE_LIST_IDS.DETHZ, label: "DÉTAILLANT HZ", code: "07-DETHZ" },
      { priceId: PRICE_LIST_IDS.PDS, label: "PDS", code: "08-PDS" },
    ],
  },
};

function getPrimaryPriceId(selectedPriceId: number): number {
  const mapping = PRICE_LIST_COLUMN_MAPPING[selectedPriceId];
  if (!mapping) return selectedPriceId;
  const primary = mapping.columns.find(c => c.priceId !== PRICE_LIST_IDS.PDS);
  return primary?.priceId ?? selectedPriceId;
}

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
    const includeMultipleColumns = searchParams.get("multipleColumns") === "true";

    if (!priceId || !prodId) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const priceIdNum = parseInt(priceId, 10);
    const prodIdNum = parseInt(prodId, 10);

    // Build base filter
    let itemFilterSQL = "";
    const baseParams: any[] = [prodIdNum];
    let paramIdx = 2; // Next param index (1 is prodId)

    if (itemId) {
      itemFilterSQL = `AND i."ItemId" = $${paramIdx}`;
      baseParams.push(parseInt(itemId, 10));
      paramIdx++;
    } else if (typeId) {
      itemFilterSQL = `AND i."locitemtype" = $${paramIdx}`;
      baseParams.push(parseInt(typeId, 10));
      paramIdx++;
    }

    // Determine IDs to fetch
    const mapping = PRICE_LIST_COLUMN_MAPPING[priceIdNum];
    // If multiple columns requested, use mapping, otherwise just the selected ID (and PDS for safety)
    const priceIdsToFetch = includeMultipleColumns && mapping 
      ? mapping.columns.map(c => c.priceId)
      : [priceIdNum, PDS_PRICE_ID];
    
    // Ensure unique IDs
    const uniquePriceIds = [...new Set(priceIdsToFetch)];

    // ---------------------------------------------------------
    // 1. MAIN QUERY (Multi-Column Capable)
    // ---------------------------------------------------------
    // CHANGE: "ipr.priceid = $X" becomes "ipr.priceid = ANY($X)"
    // The rest of the query is VERBATIM from your working snippet.
    const mainQuery = `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", ipr."priceid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = ANY($${paramIdx}) AND i."ProdId" = $1 ${itemFilterSQL}
        GROUP BY ipr."itemid", ipr."priceid"
      )
      SELECT 
        i."ItemId" as "itemId", i."ItemCode" as "itemCode", i."Descr" as "description",
        i."NetWeight" as "caisse", i."model" as "format", i."volume" as "volume",
        p."Name" as "categoryName", t."descr" as "className",
        ipr."fromqty" as "qtyMin", ipr."price" as "unitPrice", ipr."priceid" as "priceId",
        ipr."itempricerangeid" as "id", ipr."itempricedateid" as "dateId",
        pl."Descr" as "priceListName", pl."Pricecode" as "priceCode"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      INNER JOIN LatestDatePerItem ld ON ipr."itemid" = ld."itemid" 
                                     AND ipr."itempricedateid" = ld."latestDateId"
                                     AND ipr."priceid" = ld."priceid"
      LEFT JOIN public."Products" p ON i."ProdId" = p."ProdId"
      LEFT JOIN public."itemtype" t ON i."locitemtype" = t."itemtypeid"
      WHERE ipr."priceid" = ANY($${paramIdx}) AND i."ProdId" = $1 AND pl."IsActive" = true ${itemFilterSQL}
      ORDER BY i."ItemCode" ASC, ipr."priceid" ASC, ipr."fromqty" ASC
    `;
    const mainParams = [...baseParams, uniquePriceIds];

    // ---------------------------------------------------------
    // 2. PDS QUERY (Verbatim)
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // 3. EXP QUERY (Verbatim)
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // 4. DISCOUNT QUERY (Verbatim)
    // ---------------------------------------------------------
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
      WHERE i."ProdId" = $1 ${itemFilterSQL}
      ORDER BY i."ItemId" ASC, dmd."GreatherThan" ASC
    `;

    console.log("========================================");
    console.log("PRICES API (MULTI) - ProdId:", prodIdNum, "Fetching PriceIDs:", uniquePriceIds);
    console.log("========================================");

    // Execute all queries in parallel
    const [mainRes, pdsRes, expRes, discRes] = await Promise.all([
      pg.query(mainQuery, mainParams),
      pg.query(pdsQuery, baseParams),
      pg.query(expQuery, baseParams),
      pg.query(discountQuery, baseParams)
    ]);

    // ---------------------------------------------------------
    // DATA AGGREGATION
    // ---------------------------------------------------------

    // 1. Organize PDS prices by Item -> Qty
    const pdsMap = new Map<string, number>();
    pdsRes.rows.forEach((r: any) => {
      pdsMap.set(`${r.itemId}-${r.qtyMin}`, parseFloat(r.pdsPrice));
    });

    // 2. Organize EXP prices by Item -> Qty (Costing Base)
    const expMap = new Map<string, number>();
    expRes.rows.forEach((r: any) => {
      expMap.set(`${r.itemId}-${r.qtyMin}`, parseFloat(r.expPrice));
    });

    // 3. Organize Discounts by Item -> Qty
    // We want the discount where range.qtyMin >= discount.greaterThan (closest match)
    const discMap = new Map<number, any[]>();
    discRes.rows.forEach((r: any) => {
      if (!discMap.has(r.itemId)) discMap.set(r.itemId, []);
      discMap.get(r.itemId)!.push({
        greaterThan: r.greaterThan,
        amt: parseFloat(r.costingDiscountAmt)
      });
    });

    // 4. Group Main Results (Items -> Ranges -> Prices)
    const itemsMap = new Map<number, any>();

    mainRes.rows.forEach((row: any) => {
      if (!itemsMap.has(row.itemId)) {
        itemsMap.set(row.itemId, {
          itemId: row.itemId,
          itemCode: row.itemCode,
          description: row.description,
          caisse: row.caisse,
          format: row.format,
          volume: row.volume,
          categoryName: row.categoryName,
          className: row.className,
          // We will store ranges in a Map temporarily to merge by qtyMin
          rangesMap: new Map<number, any>()
        });
      }

      const item = itemsMap.get(row.itemId);
      const qty = row.qtyMin;

      if (!item.rangesMap.has(qty)) {
        item.rangesMap.set(qty, {
          rangeId: row.id, // Use ID from current row
          qtyMin: qty,
          unitPrice: 0, // Will be set to selectedPriceId's price
          prices: {} // Dictionary for multi-column
        });
      }

      const range = item.rangesMap.get(qty);
      const priceVal = parseFloat(row.unitPrice);
      
      // Store in prices dictionary
      range.prices[row.priceId] = priceVal;

      // If this row corresponds to the actively selected price list, set it as the main unitPrice
      if (row.priceId === priceIdNum) {
        range.unitPrice = priceVal;
        range.rangeId = row.id; // Ensure ID matches main selection
      }
    });

    // 5. Finalize Items Array
    const finalItems = Array.from(itemsMap.values()).map((item: any) => {
      // Convert rangesMap to array
      const ranges = Array.from(item.rangesMap.values()).map((range: any) => {
        // Attach PDS
        const pds = pdsMap.get(`${item.itemId}-${range.qtyMin}`);
        range.pdsPrice = pds || null;

        // Attach Costing (Calculated)
        // Logic: Costing Base (Exp) - Discount
        const expBase = expMap.get(`${item.itemId}-${range.qtyMin}`);
        
        let discountAmt = 0;
        const discounts = discMap.get(item.itemId);
        if (discounts && expBase) {
          // Find applicable discount (largest greaterThan that is <= qtyMin)
          // Since sorted ASC, we reverse or findLast
          const applicable = discounts
            .filter((d: any) => range.qtyMin >= d.greaterThan)
            .pop(); // Last one is the highest threshold met
          
          if (applicable) discountAmt = applicable.amt;
        }

        range.expBasePrice = expBase || null;
        range.costingDiscountAmt = discountAmt;
        range.coutExp = expBase ? (expBase - discountAmt) : null;

        return range;
      });

      // Sort ranges
      ranges.sort((a: any, b: any) => a.qtyMin - b.qtyMin);

      // Clean up temp map
      delete item.rangesMap;
      item.ranges = ranges;
      
      return item;
    });

    const columnsConfig = includeMultipleColumns && mapping
      ? mapping.columns
      : [{ priceId: priceIdNum, label: "Prix", code: priceId }];

    return NextResponse.json({
      ok: true,
      items: finalItems,
      columnsConfig,
      selectedPriceId: priceIdNum,
      primaryPriceId: getPrimaryPriceId(priceIdNum)
    });

  } catch (error: any) {
    console.error("GET /api/catalogue/prices error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des prix", details: error?.message },
      { status: 500 }
    );
  }
}
