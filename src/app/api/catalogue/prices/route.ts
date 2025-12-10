import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

// --- Configuration Matrix ---
// UPDATED: Keys now match your DB Dump perfectly (No spaces in GROSEXP, INDHZ, etc)
const COLUMN_MATRIX: Record<string, string[]> = {
  // Template: EXPERT
  "01-EXP": ["01-EXP", "02-DET", "03-IND", "05-GROS", "08-PDS"],
  
  // Template: DETAILLANT
  "02-DET": ["02-DET", "08-PDS"],
  
  // Template: INDUSTRIEL
  "03-IND": ["03-IND"], 

  // Template: EXPERT GROSSISTE 
  // Fixed: "04-GROSEXP" matches DB dump (was "04- GROS EXP")
  "04-GROSEXP": ["02-DET", "04-GROSEXP", "05-GROS", "06-INDHZ", "08-PDS"],

  // Template: GROSSISTE
  "05-GROS": ["05-GROS"],

  // Template: INDUSTRIEL HZ
  // Fixed: "06-INDHZ" matches DB dump
  "06-INDHZ": ["06-INDHZ"],

  // Template: DETAILLANT HZ
  // Fixed: "07-DETHZ" matches DB dump
  "07-DETHZ": ["07-DETHZ", "08-PDS"],
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
    const plRes = await pg.query(
      `SELECT "Pricecode" as code FROM public."PriceList" WHERE "priceid" = $1`,
      [selectedPriceId]
    );

    if (plRes.rows.length === 0) {
      return NextResponse.json({ error: "Liste de prix introuvable" }, { status: 404 });
    }

    // Trim is crucial to remove any potential DB padding (CHAR types)
    const selectedCode = plRes.rows[0].code.trim();

    // 2. Determine Target Columns
    // Because keys now match the DB, this lookup will succeed.
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
    // We use TRIM in SQL to ensure we match codes even if DB has padding
    const pricesQuery = `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", ipr."priceid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM public."itempricerange" ipr
        INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
        INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
        WHERE TRIM(pl."Pricecode") = ANY($${paramIdx}) 
          AND i."ProdId" = $1 ${itemFilterSQL} ${activeFilter}
        GROUP BY ipr."itemid", ipr."priceid"
      )
      SELECT 
        ipr."itemid" as "itemId",
        ipr."fromqty" as "qtyMin",
        ipr."price" as "price",
        TRIM(pl."Pricecode") as "priceCode",
        pl."priceid" as "priceId",
        ipr."itempricerangeid" as "id"
      FROM public."itempricerange" ipr
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      INNER JOIN LatestDatePerItem ld 
        ON ipr."itemid" = ld."itemid" 
        AND ipr."priceid" = ld."priceid"
        AND ipr."itempricedateid" = ld."latestDateId"
      WHERE TRIM(pl."Pricecode") = ANY($${paramIdx})
      ORDER BY ipr."itemid", ipr."fromqty"
    `;

    const pricesParams = [...baseParams, targetCodes];

    // 6. Fetch Discounts
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

    const discountMap: Record<number, Record<number, number>> = {};
    for (const row of discountRes.rows) {
      if (!discountMap[row.itemId]) discountMap[row.itemId] = {};
      discountMap[row.itemId][parseInt(row.greaterThan)] = parseFloat(row.costingDiscountAmt) || 0;
    }

    const pricesMap: Record<number, Record<number, Record<string, number>>> = {};
    for (const row of pricesRes.rows) {
      const iId = row.itemId;
      const qty = parseInt(row.qtyMin);
      const code = row.priceCode; // Already trimmed in SQL
      const price = parseFloat(row.price);

      if (!pricesMap[iId]) pricesMap[iId] = {};
      if (!pricesMap[iId][qty]) pricesMap[iId][qty] = {};
      
      pricesMap[iId][qty][code] = price;
    }

    const result = itemsRes.rows.map((item: any) => {
      const iId = item.itemId;
      const itemPrices = pricesMap[iId] || {};
      const itemDiscounts = discountMap[iId];
      
      const quantities = Object.keys(itemPrices).map(Number).sort((a, b) => a - b);

      const ranges = quantities.map(qty => {
        const pricesAtQty = itemPrices[qty] || {};
        
        // --- CRITICAL FIX: FORCE COLUMNS ---
        // Iterate through the EXPECTED columns (targetCodes) and ensure they exist.
        // If the DB has no price, we explicitly set it to null.
        // This ensures the Frontend sees the key and renders the column header.
        const columns: Record<string, number | null> = {};
        
        targetCodes.forEach(code => {
           columns[code] = pricesAtQty[code] !== undefined ? pricesAtQty[code] : null;
        });

        // Calculate Discount
        let costingDiscountAmt = 0;
        if (itemDiscounts) {
           if (itemDiscounts[qty] !== undefined) {
             costingDiscountAmt = itemDiscounts[qty];
           } else {
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
        const unitPrice = pricesAtQty[selectedCode] || null;
        const pdsPrice = pricesAtQty["08-PDS"] || null;
        // Map 01-EXP or 04-GROSEXP to "Exp Base"
        const expBasePrice = pricesAtQty["01-EXP"] || pricesAtQty["04-GROSEXP"] || null;

        return {
          id: `${iId}-${qty}`,
          qtyMin: qty,
          unitPrice: unitPrice, 
          pdsPrice: pdsPrice,
          coutExp: expBasePrice,
          costingDiscountAmt,
          columns // Contains ALL matrix keys (e.g. "05-GROS": null)
        };
      });

      return {
        ...item,
        priceListName: selectedCode,
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
