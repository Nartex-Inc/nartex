import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

// --- Configuration Matrix (Based on your Screenshot) ---
// Keys = The PriceCode of the *selected* dropdown option
// Values = The list of PriceCodes to fetch and display columns for
const COLUMN_MATRIX: Record<string, string[]> = {
  // Template: EXPERT
  "01-EXP": ["01-EXP", "02-DET", "03-IND", "05-GROS", "08-PDS"],
  
  // Template: DETAILLANT
  "02-DET": ["02-DET", "08-PDS"],
  
  // Template: INDUSTRIEL (Assuming code 03-IND based on pattern)
  "03-IND": ["03-IND"], 

  // Template: EXPERT GROSSISTE (Assuming code is 04-GROS EXP or similar)
  // YOU MUST VERIFY THE KEY HERE matches your DB 'PriceCode' for 'Expert Grossiste'
  "04-GROS EXP": ["02-DET", "04-GROS EXP", "05-GROS", "06-IND HZ", "08-PDS"],

  // Template: INDUSTRIEL HZ
  "06-IND HZ": ["06-IND HZ"],

  // Template: DETAILLANT HZ
  "07-DET HZ": ["07-DET HZ", "08-PDS"],
};

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

    const selectedPriceId = parseInt(priceId, 10);
    const prodIdNum = parseInt(prodId, 10);

    // 1. Identify the Selected Price List Code
    // We need to know if the user selected "01-EXP" or "02-DET" to apply the matrix
    const plRes = await pg.query(
      `SELECT "Pricecode" as code FROM public."PriceList" WHERE "priceid" = $1`,
      [selectedPriceId]
    );

    if (plRes.rows.length === 0) {
      return NextResponse.json({ error: "Liste de prix introuvable" }, { status: 404 });
    }

    const selectedCode = plRes.rows[0].code; // e.g., "01-EXP"

    // 2. Determine Target Columns
    // Default to showing ONLY the selected list if it's not in our matrix
    const targetCodes = COLUMN_MATRIX[selectedCode] || [selectedCode];

    // 3. Build Query Filters
    let itemFilterSQL = "";
    const baseParams: any[] = [prodIdNum];
    let paramIdx = 2; // $1 is prodId

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

    // 4. Fetch Products Info (Metadata)
    // We fetch items first to ensure we have the list even if prices are missing
    const itemsQuery = `
      SELECT 
        i."ItemId" as "itemId", i."ItemCode" as "itemCode", i."Descr" as "description",
        i."NetWeight" as "caisse", i."model" as "format", i."volume" as "volume",
        p."Name" as "categoryName", t."descr" as "className"
      FROM public."Items" i
      LEFT JOIN public."Products" p ON i."ProdId" = p."ProdId"
      LEFT JOIN public."itemtype" t ON i."locitemtype" = t."itemtypeid"
      WHERE i."ProdId" = $1 ${itemFilterSQL} ${activeFilter}
      ORDER BY i."ItemCode" ASC
    `;

    // 5. Fetch ALL Prices for Target Columns
    // We use ANY($array) to fetch all required columns in one go
    const pricesQuery = `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", ipr."priceid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
        WHERE pl."Pricecode" = ANY($${paramIdx}) 
          AND i."ProdId" = $1 ${itemFilterSQL} ${activeFilter}
        GROUP BY ipr."itemid", ipr."priceid"
      )
      SELECT 
        ipr."itemid" as "itemId",
        ipr."fromqty" as "qtyMin",
        ipr."price" as "price",
        pl."Pricecode" as "priceCode",
        pl."priceid" as "priceId",
        ipr."itempricerangeid" as "id"
      FROM public."itempricerange" ipr
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      INNER JOIN LatestDatePerItem ld 
        ON ipr."itemid" = ld."itemid" 
        AND ipr."priceid" = ld."priceid"
        AND ipr."itempricedateid" = ld."latestDateId"
      WHERE pl."Pricecode" = ANY($${paramIdx})
      ORDER BY ipr."itemid", ipr."fromqty"
    `;

    const pricesParams = [...baseParams, targetCodes];

    // 6. Fetch Discounts (Unchanged logic)
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
    `;

    const [itemsRes, pricesRes, discountRes] = await Promise.all([
      pg.query(itemsQuery, baseParams),
      pg.query(pricesQuery, pricesParams),
      pg.query(discountQuery, baseParams).catch(err => {
        console.error("Discount query error:", err.message);
        return { rows: [] };
      })
    ]);

    // --- Processing Data ---

    // Map Discounts
    const discountMap: Record<number, Record<number, number>> = {};
    for (const row of discountRes.rows) {
      if (!discountMap[row.itemId]) discountMap[row.itemId] = {};
      discountMap[row.itemId][parseInt(row.greaterThan)] = parseFloat(row.costingDiscountAmt) || 0;
    }

    // Map Prices to Structure: ItemID -> QtyMin -> PriceCode -> Price
    const pricesMap: Record<number, Record<number, Record<string, number>>> = {};
    
    for (const row of pricesRes.rows) {
      const iId = row.itemId;
      const qty = parseInt(row.qtyMin);
      const code = row.priceCode;
      const price = parseFloat(row.price);

      if (!pricesMap[iId]) pricesMap[iId] = {};
      if (!pricesMap[iId][qty]) pricesMap[iId][qty] = {};
      
      pricesMap[iId][qty][code] = price;
    }

    // Build Final Result
    const result = itemsRes.rows.map((item: any) => {
      const iId = item.itemId;
      const itemPrices = pricesMap[iId] || {};
      const itemDiscounts = discountMap[iId];
      
      // We need to determine all unique Qty breaks for this item across ALL retrieved price lists
      // (e.g., Expert might have break at 12, PDS might have break at 1)
      const quantities = Object.keys(itemPrices).map(Number).sort((a, b) => a - b);

      const ranges = quantities.map(qty => {
        const pricesAtQty = itemPrices[qty] || {};
        
        // Calculate Discount
        let costingDiscountAmt = 0;
        if (itemDiscounts) {
           if (itemDiscounts[qty] !== undefined) {
             costingDiscountAmt = itemDiscounts[qty];
           } else {
             // Find closest lower tier
             const tiers = Object.keys(itemDiscounts).map(Number).sort((a, b) => b - a);
             for (const tier of tiers) {
               if (tier <= qty) {
                 costingDiscountAmt = itemDiscounts[tier];
                 break;
               }
             }
           }
        }

        // Backward Compatibility Fields
        // "unitPrice" = The price of the SELECTED list
        const unitPrice = pricesAtQty[selectedCode] || null;
        
        // "pdsPrice" and "coutExp" were hardcoded before. 
        // Now we try to find them dynamically if they exist in the fetched columns.
        // Assuming "08-PDS" is standard code for PDS
        const pdsPrice = pricesAtQty["08-PDS"] || null;
        // Assuming "04-GROS EXP" or similar is Exp Base. 
        // Note: In your previous code, "coutExp" was derived from "expPrice".
        // You might need to adjust which column code represents 'Exp Base'. 
        // For now, let's assume if "01-EXP" exists, it's the base, or leave null.
        const expBasePrice = pricesAtQty["01-EXP"] || pricesAtQty["04-GROS EXP"] || null;

        return {
          id: `${iId}-${qty}`, // composite key
          qtyMin: qty,
          
          // Legacy fields for immediate frontend compatibility
          unitPrice: unitPrice, 
          pdsPrice: pdsPrice,
          coutExp: expBasePrice,
          costingDiscountAmt,

          // NEW FIELD: map of all columns for this row
          // Frontend can iterate this to show all columns requested in matrix
          columns: pricesAtQty 
        };
      });

      return {
        ...item,
        priceListName: selectedCode, // Use code as name for simplicity in identifying logic
        priceCode: selectedCode,
        ranges
      };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Prices API error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la génération des prix" }, 
      { status: 500 }
    );
  }
}
