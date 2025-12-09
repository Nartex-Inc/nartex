import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

// ============================================================================
// PRICE LIST ID MAPPING (based on your database)
// ============================================================================
const PRICE_LIST_IDS = {
  EXP: 1,        // 01-EXP - EXPERT PRICE
  DET: 2,        // 02-DET - DETAILLANT / RETAILER  
  IND: 3,        // 03-IND - INDUSTRIEL / INDUSTRIAL
  GROSEXP: 4,    // 04-GROSEXP - GROSSISTE EXPERT / WHOLESALE EXPERT
  GROS: 5,       // 05-GROS - GROSSISTE / WHOLESALE
  INDHZ: 6,      // 06-INDHZ - INDUSTRIEL (HZ)
  DETHZ: 7,      // 07-DETHZ - DETAILLANT (HZ)
  PDS: 17,       // 08-PDS - PRIX DETAIL / MSRP
};

// ============================================================================
// COLUMN MAPPING: Which price columns to show for each selected price list
// ============================================================================
const PRICE_LIST_COLUMN_MAPPING: Record<number, {
  code: string;
  columns: { priceId: number; label: string; code: string }[];
}> = {
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

// Get the primary column (the one highlighted/selected by user)
function getPrimaryPriceId(selectedPriceId: number): number {
  const mapping = PRICE_LIST_COLUMN_MAPPING[selectedPriceId];
  if (!mapping) return selectedPriceId;
  // Primary is the first non-PDS column, or the first column
  const primary = mapping.columns.find(c => c.priceId !== PRICE_LIST_IDS.PDS);
  return primary?.priceId ?? selectedPriceId;
}

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

    const selectedPriceId = parseInt(priceId, 10);
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

    // Determine which price lists to fetch
    const mapping = PRICE_LIST_COLUMN_MAPPING[selectedPriceId];
    const priceListsToFetch = includeMultipleColumns && mapping 
      ? mapping.columns.map(c => c.priceId)
      : [selectedPriceId, PRICE_LIST_IDS.PDS]; // Always include PDS for margin calculations

    const uniquePriceIds = [...new Set(priceListsToFetch)];

    // Main query
    // UPDATED: Joins Items -> Products (for Category) and Items -> itemtype (for Class)
    const mainQuery = `
      WITH LatestDatePerItem AS (
        SELECT 
          ipr."itemid",
          ipr."priceid",
          MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = ANY($${paramIdx})
          AND i."ProdId" = $1
          ${itemFilterSQL}
        GROUP BY ipr."itemid", ipr."priceid"
      ),
      ItemRanges AS (
        SELECT 
          i."ItemId" as "itemId",
          i."ItemCode" as "itemCode",
          i."ItemDescr" as "description",
          i."Stocking" as "caisse",
          i."Format" as "format",
          i."volume" as "volume",
          
          -- Category comes from Products
          p."Descr" as "categoryName",
          
          -- Class comes from itemtype
          it."Descr" as "className",
          
          ipr."priceid" as "priceId",
          pl."Pricecode" as "priceCode",
          pl."Descr" as "priceListName",
          ipr."fromqty" as "qtyMin",
          ipr."price" as "unitPrice",
          ipr."itempricerangeid" as "rangeId"
        FROM public."Items" i
        INNER JOIN LatestDatePerItem ld ON i."ItemId" = ld."itemid"
        INNER JOIN public."itempricerange" ipr 
          ON ipr."itemid" = ld."itemid" 
          AND ipr."priceid" = ld."priceid"
          AND ipr."itempricedateid" = ld."latestDateId"
        
        -- Join relationships based on your new schema instructions
        INNER JOIN public."Products" p ON i."ProdId" = p."ProdId"
        LEFT JOIN public."itemtype" it ON i."locitemtype" = it."ItemTypeId"
        
        LEFT JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
        
        WHERE i."ProdId" = $1
          ${itemFilterSQL}
        ORDER BY i."ItemCode", ipr."priceid", ipr."fromqty"
      )
      SELECT * FROM ItemRanges
    `;

    const queryParams = [...baseParams, uniquePriceIds];
    const { rows } = await pg.query(mainQuery, queryParams);

    // Group results by item
    const itemsMap = new Map<number, {
      itemId: number;
      itemCode: string;
      description: string;
      caisse: number | null;
      format: string | null;
      volume: number | null;
      categoryName: string;
      className: string;
      pricesByList: Map<number, { 
        priceCode: string;
        priceListName: string;
        ranges: { rangeId: number; qtyMin: number; unitPrice: number }[];
      }>;
    }>();

    for (const row of rows) {
      if (!itemsMap.has(row.itemId)) {
        itemsMap.set(row.itemId, {
          itemId: row.itemId,
          itemCode: row.itemCode,
          description: row.description,
          caisse: row.caisse,
          format: row.format,
          volume: row.volume,
          categoryName: row.categoryName || "",
          className: row.className || "",
          pricesByList: new Map(),
        });
      }

      const item = itemsMap.get(row.itemId)!;
      
      if (!item.pricesByList.has(row.priceId)) {
        item.pricesByList.set(row.priceId, {
          priceCode: row.priceCode,
          priceListName: row.priceListName,
          ranges: [],
        });
      }

      item.pricesByList.get(row.priceId)!.ranges.push({
        rangeId: row.rangeId,
        qtyMin: row.qtyMin,
        unitPrice: parseFloat(row.unitPrice) || 0,
      });
    }

    // Build response with column configuration
    const columnsConfig = includeMultipleColumns && mapping
      ? mapping.columns
      : [{ priceId: selectedPriceId, label: "Prix", code: priceId.toString() }];

    const items = Array.from(itemsMap.values()).map(item => {
      // Get the primary price list ranges to determine row structure
      const primaryPriceId = getPrimaryPriceId(selectedPriceId);
      const primaryRanges = item.pricesByList.get(primaryPriceId)?.ranges || 
                           item.pricesByList.get(selectedPriceId)?.ranges || 
                           [];

      // Build ranges with prices from all requested lists
      const ranges = primaryRanges.map(range => {
        const pricesByListId: Record<number, number> = {};
        
        for (const priceListId of uniquePriceIds) {
          const listData = item.pricesByList.get(priceListId);
          if (listData) {
            // Find matching range by qtyMin
            const matchingRange = listData.ranges.find(r => r.qtyMin === range.qtyMin);
            if (matchingRange) {
              pricesByListId[priceListId] = matchingRange.unitPrice;
            }
          }
        }

        return {
          rangeId: range.rangeId,
          qtyMin: range.qtyMin,
          unitPrice: range.unitPrice,
          prices: pricesByListId,
        };
      });

      return {
        itemId: item.itemId,
        itemCode: item.itemCode,
        description: item.description,
        caisse: item.caisse,
        format: item.format,
        volume: item.volume,
        categoryName: item.categoryName,
        className: item.className,
        ranges,
      };
    });

    return NextResponse.json({
      ok: true,
      items,
      columnsConfig,
      selectedPriceId,
      primaryPriceId: getPrimaryPriceId(selectedPriceId),
    });

  } catch (error: any) {
    console.error("GET /api/catalogue/prices error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des prix", details: error?.message },
      { status: 500 }
    );
  }
}
