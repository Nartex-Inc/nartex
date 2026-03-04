import { NextRequest, NextResponse } from "next/server";
import { pg } from "@/lib/db";
import { getPrextraTables } from "@/lib/prextra";
import { requireSchema, getErrorMessage } from "@/lib/auth-helpers";

// ---------------------------------------------------------------------------
// Server-side cache (same pattern as dashboard-data)
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
type CacheEntry = { data: unknown; ts: number };
const queryCache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | null {
  const entry = queryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    queryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown) {
  queryCache.set(key, { data, ts: Date.now() });
  if (queryCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of queryCache) {
      if (now - v.ts > CACHE_TTL_MS) queryCache.delete(k);
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSchema();
    if (!auth.ok) return auth.response;
    const { schema } = auth;

    const T = getPrextraTables(schema);
    const { searchParams } = new URL(request.url);
    const prodId = searchParams.get("prodId");
    const typeId = searchParams.get("typeId");
    const itemId = searchParams.get("itemId");
    const itemIds = searchParams.get("itemIds");
    const salesrepIds = searchParams.get("salesrepIds");
    const isEn = searchParams.get("lang") === "en";

    if (!prodId && !itemIds) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Check cache
    const cacheKey = `sales-vol:${schema}:${prodId}:${typeId}:${itemId}:${itemIds}:${salesrepIds}:${isEn}`;
    const cached = getCached(cacheKey);
    if (cached !== null) {
      return NextResponse.json(cached);
    }

    // =====================================================================
    // STEP 1: Get matching items (dimension data only — small tables)
    // This query touches Items + Products + itemtype — all small dimension
    // tables that fdw handles easily.
    // =====================================================================
    const itemParams: unknown[] = [];
    let itemParamIdx = 1;
    let itemFilterSQL = "";

    if (itemIds) {
      const idsArray = itemIds.split(",").map((id) => parseInt(id.trim(), 10));
      itemFilterSQL = `AND i."ItemId" = ANY($${itemParamIdx})`;
      itemParams.push(idsArray);
      itemParamIdx++;
    } else {
      itemFilterSQL = `AND i."ProdId" = $${itemParamIdx}`;
      itemParams.push(parseInt(prodId!, 10));
      itemParamIdx++;

      if (itemId) {
        itemFilterSQL += ` AND i."ItemId" = $${itemParamIdx}`;
        itemParams.push(parseInt(itemId, 10));
        itemParamIdx++;
      } else if (typeId) {
        itemFilterSQL += ` AND i."locitemtype" = $${itemParamIdx}`;
        itemParams.push(parseInt(typeId, 10));
        itemParamIdx++;
      }
    }

    // Translation joins (EN mode)
    const itemDescr = isEn ? `COALESCE(zdi."Descr", i."Descr")` : `i."Descr"`;
    const prodName = isEn ? `COALESCE(zdp."Descr", p."Name")` : `p."Name"`;
    const typeDescr = isEn ? `COALESCE(zdt."Descr", t."descr")` : `t."descr"`;
    const zdJoins = isEn
      ? `LEFT JOIN ${T.ZDATANAME} zdi
           ON zdi."TableName" = 'Items' AND zdi."FieldName" = 'descr'
           AND zdi."cieid" = 2 AND zdi."LangId" = 1
           AND zdi."Id" = i."ItemId"
         LEFT JOIN ${T.ZDATANAME} zdp
           ON zdp."TableName" = 'Products' AND zdp."FieldName" = 'descr'
           AND zdp."cieid" = 2 AND zdp."LangId" = 1
           AND zdp."Id" = p."ProdId"
         LEFT JOIN ${T.ZDATANAME} zdt
           ON zdt."TableName" = 'itemtype' AND zdt."FieldName" = 'descr'
           AND zdt."cieid" = 2 AND zdt."LangId" = 1
           AND zdt."Id" = t."itemtypeid"`
      : "";

    const itemsQuery = `
SELECT
  i."ItemId"    AS "itemId",
  i."ItemCode"  AS "itemCode",
  ${itemDescr}  AS "description",
  i."volume"    AS "volume",
  i."model"     AS "format",
  ${prodName}   AS "categoryName",
  ${typeDescr}  AS "className"
FROM ${T.ITEMS} i
LEFT JOIN ${T.PRODUCTS}  p ON i."ProdId" = p."ProdId"
LEFT JOIN ${T.ITEM_TYPE} t ON i."locitemtype" = t."itemtypeid"
${zdJoins}
WHERE i."ProdId" BETWEEN 1 AND 10
  AND i."isActive" = true
  AND NOT EXISTS (
    SELECT 1 FROM ${T.RECORD_SPEC_DATA} rsd
    WHERE rsd."TableName" = 'items'
      AND rsd."TableId" = i."ItemId"
      AND rsd."FieldName" IN ('excludecybercat', 'isPriceList')
      AND rsd."FieldValue" = '1'
  )
  ${itemFilterSQL}
ORDER BY ${prodName}, ${typeDescr}, i."volume", i."ItemCode"
`;

    const { rows: items } = await pg.query(itemsQuery, itemParams);
    if (items.length === 0) {
      setCache(cacheKey, []);
      return NextResponse.json([]);
    }

    // =====================================================================
    // STEP 2: Aggregate invoice data for those item IDs
    // Only touches InvHeader + InvDetail — the two big tables.
    // Filtering by d."Itemid" = ANY(...) lets fdw push the filter down to
    // the remote InvDetail table directly.
    // =====================================================================
    const matchedIds = items.map((r: Record<string, unknown>) => r.itemId);

    const invParams: unknown[] = [2, matchedIds]; // $1 = cieid, $2 = itemIds
    let invParamIdx = 3;

    let salesrepFilter = "";
    if (salesrepIds) {
      const srIds = salesrepIds.split(",").map((id) => parseInt(id.trim(), 10));
      salesrepFilter = `AND h."srid" = ANY($${invParamIdx})`;
      invParams.push(srIds);
      invParamIdx++;
    }

    const invoiceQuery = `
SELECT
  d."Itemid"                                        AS "itemId",
  SUM(CASE WHEN h."InvDate" >= CURRENT_DATE - 365
      THEN d."Amount"::float8 ELSE 0 END)          AS "sales365",
  COUNT(CASE WHEN h."InvDate" >= CURRENT_DATE - 365
      THEN 1 END)::int                             AS "qty365",
  SUM(CASE WHEN h."InvDate" < CURRENT_DATE - 365
      THEN d."Amount"::float8 ELSE 0 END)          AS "sales720",
  COUNT(CASE WHEN h."InvDate" < CURRENT_DATE - 365
      THEN 1 END)::int                             AS "qty720"
FROM ${T.INV_HEADER} h
JOIN ${T.INV_DETAIL} d ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
WHERE h."cieid" = $1
  AND h."InvDate" >= CURRENT_DATE - 720
  AND d."Itemid" = ANY($2)
  ${salesrepFilter}
GROUP BY d."Itemid"
`;

    // Use a dedicated client with extended timeout for fdw (dev env)
    const client = await pg.connect();
    let invoices: Record<string, unknown>[];
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '90s'");
      const res = await client.query(invoiceQuery, invParams);
      invoices = res.rows;
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }

    // =====================================================================
    // STEP 3: Merge in JS — item details + invoice aggregates
    // =====================================================================
    const invoiceMap = new Map<number, Record<string, unknown>>();
    for (const inv of invoices) {
      invoiceMap.set(inv.itemId as number, inv);
    }

    const result = items.map((item: Record<string, unknown>) => {
      const inv = invoiceMap.get(item.itemId as number);
      const volume = item.volume ? parseFloat(String(item.volume)) : 0;
      const qty365 = inv ? parseInt(String(inv.qty365)) || 0 : 0;
      const qty720 = inv ? parseInt(String(inv.qty720)) || 0 : 0;
      const sales365 = inv ? parseFloat(String(inv.sales365)) || 0 : 0;
      const sales720 = inv ? parseFloat(String(inv.sales720)) || 0 : 0;

      return {
        itemId: item.itemId,
        itemCode: item.itemCode,
        description: item.description,
        volume: volume || null,
        format: item.format,
        categoryName: item.categoryName,
        className: item.className,
        sales365,
        qty365,
        volumeLtKg365: Math.round(qty365 * volume * 10) / 10,
        sales720,
        qty720,
        volumeLtKg720: Math.round(qty720 * volume * 10) / 10,
      };
    });

    setCache(cacheKey, result);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Sales volume API error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération des données de ventes" },
      { status: 500 }
    );
  }
}
