import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";
import { getPrextraTables } from "@/lib/prextra";

// --- Configuration Matrix ---
const COLUMN_MATRIX: Record<string, string[]> = {
  "01-EXP": ["01-EXP", "02-DET", "03-IND", "05-GROS", "08-PDS"],
  "02-DET": ["02-DET", "08-PDS"],
  "03-IND": ["03-IND"],
  "04-GROSEXP": ["02-DET", "04-GROSEXP", "05-GROS", "06-INDHZ", "08-PDS"],
  "05-GROS": ["05-GROS"],
  "06-INDHZ": ["06-INDHZ"],
  "07-DETHZ": ["07-DETHZ", "08-PDS"],
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const schema = session.user.prextraSchema;
    if (!schema) {
      return NextResponse.json({ error: "Aucune donnée ERP pour ce tenant" }, { status: 403 });
    }

    const T = getPrextraTables(schema);
    const { searchParams } = new URL(request.url);
    const priceId = searchParams.get("priceId");
    const prodId = searchParams.get("prodId");
    const typeId = searchParams.get("typeId");
    const itemId = searchParams.get("itemId");
    const itemIds = searchParams.get("itemIds");

    if (!priceId || (!prodId && !itemIds)) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const selectedPriceId = parseInt(priceId, 10);

    // 1. Identify the Selected Price List Code and Company
    const plRes = await pg.query(
      `SELECT "Pricecode" as code, "cieid" FROM ${T.PRICE_LIST} WHERE "priceid" = $1`,
      [selectedPriceId]
    );

    if (plRes.rows.length === 0) {
      return NextResponse.json({ error: "Liste de prix introuvable" }, { status: 404 });
    }

    const selectedCode = plRes.rows[0].code.trim();
    const currentCieId = plRes.rows[0].cieid;

    // 2. Determine Target Codes
    const targetCodesSet = new Set(COLUMN_MATRIX[selectedCode] || [selectedCode]);
    targetCodesSet.add("01-EXP");
    if (selectedCode !== "03-IND") targetCodesSet.add("08-PDS");
    const targetCodes = Array.from(targetCodesSet);

    // 3. Resolve Codes to PriceIDs
    const idRes = await pg.query(
      `SELECT "priceid", TRIM("Pricecode") as code
       FROM ${T.PRICE_LIST}
       WHERE "cieid" = $1 AND TRIM("Pricecode") = ANY($2)`,
      [currentCieId, targetCodes]
    );

    const codeToIdMap: Record<string, number> = {};
    const targetIds: number[] = [];

    idRes.rows.forEach(row => {
      codeToIdMap[row.code] = row.priceid;
      targetIds.push(row.priceid);
    });

    // 4. Build Query Filters
    let itemFilterSQL = "";
    const baseParams: any[] = [];
    let paramIdx = 1;

    if (itemIds) {
        const idsArray = itemIds.split(',').map(id => parseInt(id.trim(), 10));
        itemFilterSQL = `AND i."ItemId" = ANY($${paramIdx})`;
        baseParams.push(idsArray);
        paramIdx++;
    } else {
        const prodIdNum = parseInt(prodId!, 10);
        itemFilterSQL = `AND i."ProdId" = $${paramIdx}`;
        baseParams.push(prodIdNum);
        paramIdx++;

        if (itemId) {
            itemFilterSQL += ` AND i."ItemId" = $${paramIdx}`;
            baseParams.push(parseInt(itemId, 10));
            paramIdx++;
        } else if (typeId) {
            itemFilterSQL += ` AND i."locitemtype" = $${paramIdx}`;
            baseParams.push(parseInt(typeId, 10));
            paramIdx++;
        }
    }

    const activeFilter = `AND i."isActive" = true`;

    // 5. Fetch Products Info
    const itemsQuery = `
      SELECT
        i."ItemId" as "itemId", i."ItemCode" as "itemCode", i."Descr" as "description",
        i."NetWeight" as "caisse", i."model" as "format", i."volume" as "volume",
        p."Name" as "categoryName", t."descr" as "className"
      FROM ${T.ITEMS} i
      LEFT JOIN ${T.PRODUCTS} p ON i."ProdId" = p."ProdId"
      LEFT JOIN ${T.ITEM_TYPE} t ON i."locitemtype" = t."itemtypeid"
      WHERE 1=1 ${itemFilterSQL} ${activeFilter}
        AND NOT EXISTS (
          SELECT 1 FROM ${T.RECORD_SPEC_DATA} rsd
          WHERE rsd."TableName" = 'items'
            AND rsd."TableId" = i."ItemId"
            AND rsd."FieldName" IN ('excludecybercat', 'isPriceList')
            AND rsd."FieldValue" = '1'
        )
      ORDER BY p."Name" ASC, t."descr" ASC, i."volume" ASC, i."ItemCode" ASC
    `;

    // 6. Fetch Prices using IDs (Updated to fetch _discount)
    const pricesQuery = `
      WITH LatestDatePerItem AS (
        SELECT ipr."itemid", ipr."priceid", MAX(ipr."itempricedateid") as "latestDateId"
        FROM ${T.ITEM_PRICE_RANGE} ipr
        INNER JOIN ${T.ITEMS} i ON ipr."itemid" = i."ItemId"
        WHERE ipr."priceid" = ANY($${paramIdx})
          ${itemFilterSQL} ${activeFilter}
          AND NOT EXISTS (
            SELECT 1 FROM ${T.RECORD_SPEC_DATA} rsd
            WHERE rsd."TableName" = 'items'
              AND rsd."TableId" = i."ItemId"
              AND rsd."FieldName" IN ('excludecybercat', 'isPriceList')
              AND rsd."FieldValue" = '1'
          )
        GROUP BY ipr."itemid", ipr."priceid"
      )
      SELECT
        ipr."itemid" as "itemId",
        ipr."fromqty" as "qtyMin",
        ipr."price" as "price",
        ipr."_discount" as "discount",  -- <--- FETCHING DISCOUNT DIRECTLY
        ipr."priceid" as "priceId",
        ipr."itempricerangeid" as "id"
      FROM ${T.ITEM_PRICE_RANGE} ipr
      INNER JOIN LatestDatePerItem ld
        ON ipr."itemid" = ld."itemid"
        AND ipr."priceid" = ld."priceid"
        AND ipr."itempricedateid" = ld."latestDateId"
      WHERE ipr."priceid" = ANY($${paramIdx})
      ORDER BY ipr."itemid", ipr."fromqty"
    `;

    const pricesParams = [...baseParams, targetIds];

    const [itemsRes, pricesRes] = await Promise.all([
      pg.query(itemsQuery, baseParams),
      pg.query(pricesQuery, pricesParams)
    ]);

    // --- Fetch _costdiff per item via RecordSpecData → _DiscountMaintenanceHdr ---
    const costdiffMap: Record<number, number> = {};
    const caisseMap: Record<number, number> = {};

    const allItemIds = itemsRes.rows.map((r: any) => r.itemId);
    for (const item of itemsRes.rows) {
      caisseMap[item.itemId] = item.caisse ? parseFloat(item.caisse) : 0;
    }

    if (allItemIds.length > 0) {
      const costdiffRes = await pg.query(
        `SELECT rsd."TableId" AS "itemId", dmh."_costdiff" AS "costdiff"
         FROM ${T.RECORD_SPEC_DATA} rsd
         JOIN ${T.DISCOUNT_MAINTENANCE_HDR} dmh
           ON rsd."FieldValue" = CAST(dmh."DiscountMaintenanceHdrId" AS TEXT)
         WHERE rsd."TableName" = 'items'
           AND rsd."FieldName" = 'DiscountMaintenance'
           AND rsd."FieldValue" IS NOT NULL
           AND dmh."DiscountMaintenanceHdrId" IS NOT NULL
           AND rsd."TableId" = ANY($1)`,
        [allItemIds]
      );
      for (const row of costdiffRes.rows) {
        costdiffMap[row.itemId] = parseFloat(row.costdiff);
      }
    }

    // --- Processing Data ---

    // Map Prices: ItemID -> Qty -> PriceID -> { price, discount }
    const pricesMap: Record<number, Record<number, Record<number, { price: number, discount: number }>>> = {};

    for (const row of pricesRes.rows) {
      const iId = row.itemId;
      const qty = parseInt(row.qtyMin);
      const pId = row.priceId;
      const price = parseFloat(row.price);
      // Ensure discount is a number, default to 0 if null
      const discount = row.discount ? parseFloat(row.discount) : 0;

      if (!pricesMap[iId]) pricesMap[iId] = {};
      if (!pricesMap[iId][qty]) pricesMap[iId][qty] = {};

      pricesMap[iId][qty][pId] = { price, discount };
    }

    // Override 01-EXP prices for tiers above caisse using _costdiff
    const expPriceId = codeToIdMap["01-EXP"];
    if (expPriceId) {
      for (const iId of Object.keys(pricesMap).map(Number)) {
        const costdiff = costdiffMap[iId];
        if (costdiff === undefined || costdiff <= 0) continue;

        const caisse = caisseMap[iId];
        if (!caisse || caisse <= 0) continue;

        const itemPrices = pricesMap[iId];
        const baseCostEntry = itemPrices[caisse]?.[expPriceId];
        if (!baseCostEntry) continue;

        const baseCost = baseCostEntry.price;
        const quantities = Object.keys(itemPrices).map(Number).sort((a, b) => a - b);
        const tiersAboveCaisse = quantities.filter(q => q > caisse);

        for (let n = 0; n < tiersAboveCaisse.length; n++) {
          const qty = tiersAboveCaisse[n];
          const newPrice = Math.round((baseCost - (n + 1) * costdiff) * 100) / 100;
          if (!itemPrices[qty]) itemPrices[qty] = {};
          itemPrices[qty][expPriceId] = {
            price: newPrice,
            discount: itemPrices[qty][expPriceId]?.discount ?? 0
          };
        }
      }
    }

    // Fill missing quantity prices using discount ratios from reference price lists
    for (const iId of Object.keys(pricesMap).map(Number)) {
      const itemPrices = pricesMap[iId];
      const quantities = Object.keys(itemPrices).map(Number).sort((a, b) => a - b);
      const basePrices = itemPrices[1] || {}; // Qty=1 prices

      for (const qty of quantities) {
        if (qty === 1) continue;
        const pricesAtQty = itemPrices[qty];

        // Find a reference price list that has prices at both Qty=1 and this qty
        let ratio: number | null = null;
        for (const pId of Object.keys(pricesAtQty).map(Number)) {
          if (basePrices[pId] && basePrices[pId].price > 0) {
            ratio = pricesAtQty[pId].price / basePrices[pId].price;
            break;
          }
        }
        if (ratio === null) continue;

        // Apply ratio to price lists that have Qty=1 but are missing this qty
        for (const pId of Object.keys(basePrices).map(Number)) {
          if (!pricesAtQty[pId] && basePrices[pId].price > 0) {
            pricesAtQty[pId] = {
              price: Math.round(basePrices[pId].price * ratio * 100) / 100,
              discount: 0
            };
          }
        }
      }
    }

    const result = itemsRes.rows.map((item: any) => {
      const iId = item.itemId;
      const itemPrices = pricesMap[iId] || {};

      const quantities = Object.keys(itemPrices).map(Number).sort((a, b) => a - b);

      const ranges = quantities.map(qty => {
        const pricesAtQty = itemPrices[qty] || {};

        const columns: Record<string, number | null> = {};
        targetCodes.forEach(code => {
           const pId = codeToIdMap[code];
           if (pId && pricesAtQty[pId] !== undefined) {
             columns[code] = pricesAtQty[pId].price;
           } else {
             columns[code] = null;
           }
        });

        // Resolve Data for Selected Price List
        const selectedId = codeToIdMap[selectedCode];
        const selectedData = selectedId ? pricesAtQty[selectedId] : null;

        const unitPrice = selectedData ? selectedData.price : null;

        // Escompte: Comes from the _discount column of the SELECTED price list row
        const costingDiscountAmt = selectedData ? selectedData.discount : 0;

        const pdsId = codeToIdMap["08-PDS"];
        const pdsPrice = pdsId && pricesAtQty[pdsId] ? pricesAtQty[pdsId].price : null;

        const expId = codeToIdMap["01-EXP"] || codeToIdMap["04-GROSEXP"];
        const expBasePrice = expId && pricesAtQty[expId] ? pricesAtQty[expId].price : null;

        return {
          id: `${iId}-${qty}`,
          qtyMin: qty,
          unitPrice,
          pdsPrice,
          coutExp: expBasePrice,
          costingDiscountAmt, // Now populated from itempricerange._discount
          columns
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
