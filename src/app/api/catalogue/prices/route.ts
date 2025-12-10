import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const PDS_PRICE_ID = 17;
const EXP_PRICE_ID = 1; // Used for "Costing Base" calculation - EXPERT price

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

// COLUMN MAPPING - Each price list shows specific columns in order
// The column matching the selected priceId is the "primary" (highlighted)
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

function getPrimaryPriceId(selectedPriceId: number): number {
  const mapping = PRICE_LIST_COLUMN_MAPPING[selectedPriceId];
  if (!mapping) return selectedPriceId;
  // Primary is the first non-PDS column (the main price for this list)
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

    // Get the column mapping for this price list - ALWAYS use multiple columns
    const mapping = PRICE_LIST_COLUMN_MAPPING[priceIdNum];
    
    // If no mapping exists for this priceId, create a default one
    const priceIdsToFetch = mapping 
      ? mapping.columns.map(c => c.priceId)
      : [priceIdNum, PDS_PRICE_ID];
    
    // Ensure unique IDs
    const uniquePriceIds = [...new Set(priceIdsToFetch)];

    // 1. MAIN QUERY - Fetches all relevant price columns
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

    // 2. PDS QUERY - For MSRP margin calculations
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

    // 3. EXP QUERY - For Costing Base calculations
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

    // 4. DISCOUNT QUERY
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
        ON (rsd."FieldValue" ~ '^[0-9]+$' AND CAST(rsd."FieldValue" AS INTEGER) = dmd."DiscountMaintenanceHdrId")
      WHERE i."ProdId" = $1 ${itemFilterSQL}
      ORDER BY i."ItemId" ASC, dmd."GreatherThan" ASC
    `;

    // Execute queries
    const [mainRes, pdsRes, expRes, discRes] = await Promise.all([
      pg.query(mainQuery, mainParams),
      pg.query(pdsQuery, baseParams),
      pg.query(expQuery, baseParams),
      pg.query(discountQuery, baseParams)
    ]);

    // --- DATA AGGREGATION ---

    const pdsMap = new Map<string, number>();
    pdsRes.rows.forEach((r: any) => {
      pdsMap.set(`${r.itemId}-${r.qtyMin}`, parseFloat(r.pdsPrice));
    });

    const expMap = new Map<string, number>();
    expRes.rows.forEach((r: any) => {
      expMap.set(`${r.itemId}-${r.qtyMin}`, parseFloat(r.expPrice));
    });

    const discMap = new Map<number, any[]>();
    discRes.rows.forEach((r: any) => {
      if (!discMap.has(r.itemId)) discMap.set(r.itemId, []);
      discMap.get(r.itemId)!.push({
        greaterThan: r.greaterThan,
        amt: parseFloat(r.costingDiscountAmt)
      });
    });

    // Main Item Aggregation
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
          rangesMap: new Map<number, any>()
        });
      }

      const item = itemsMap.get(row.itemId);
      const qty = row.qtyMin;

      // Initialize range bucket for this quantity if not exists
      if (!item.rangesMap.has(qty)) {
        item.rangesMap.set(qty, {
          rangeId: row.id,
          qtyMin: qty,
          unitPrice: 0,
          prices: {} // Dictionary of priceId -> value
        });
      }

      const range = item.rangesMap.get(qty);
      const priceVal = parseFloat(row.unitPrice);
      
      // Save price for this specific price list column
      range.prices[row.priceId] = priceVal;

      // If this row belongs to the main selected list, set it as the primary unit price
      if (row.priceId === priceIdNum) {
        range.unitPrice = priceVal;
        range.rangeId = row.id;
      }
    });

    // Finalize Array
    const finalItems = Array.from(itemsMap.values()).map((item: any) => {
      const ranges = Array.from(item.rangesMap.values()).map((range: any) => {
        // PDS
        const pds = pdsMap.get(`${item.itemId}-${range.qtyMin}`);
        range.pdsPrice = pds || null;

        // Costing Base
        const expBase = expMap.get(`${item.itemId}-${range.qtyMin}`);
        let discountAmt = 0;
        const discounts = discMap.get(item.itemId);
        if (discounts && expBase) {
          // Find applicable discount (largest greaterThan that is <= qtyMin)
          const applicable = discounts
            .filter((d: any) => range.qtyMin >= d.greaterThan)
            .pop();
          
          if (applicable) discountAmt = applicable.amt;
        }

        range.expBasePrice = expBase || null;
        range.costingDiscountAmt = discountAmt;
        range.coutExp = expBase ? (expBase - discountAmt) : null;

        return range;
      });

      // Sort ranges
      ranges.sort((a: any, b: any) => a.qtyMin - b.qtyMin);
      
      delete item.rangesMap;
      item.ranges = ranges;
      
      return item;
    });

    // Determine columns configuration - ALWAYS return the full mapping
    const columnsConfig = mapping?.columns || [
      { priceId: priceIdNum, label: "Prix", code: "Prix" },
      { priceId: PDS_PRICE_ID, label: "PDS_MSRP", code: "PDS" }
    ];

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
