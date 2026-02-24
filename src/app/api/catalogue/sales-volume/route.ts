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

// ---------------------------------------------------------------------------
// Auto-discover the quantity column name from InvDetail (DMS-replicated)
// Cached per schema for the lifetime of the process.
// ---------------------------------------------------------------------------
const qtyColumnCache: Record<string, string | null> = {};

async function getQtyColumn(schema: string): Promise<string | null> {
  if (schema in qtyColumnCache) return qtyColumnCache[schema];

  const { rows } = await pg.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'InvDetail'
     AND column_name ILIKE '%qty%'
     ORDER BY column_name`,
    [schema]
  );

  const names = rows.map((r: Record<string, unknown>) => String(r.column_name));
  // Prefer QtyShip > qty > first match
  const col =
    names.find((n) => /qtyship/i.test(n)) ||
    names.find((n) => /^qty$/i.test(n)) ||
    names[0] ||
    null;

  // Validate column name (alphanumeric + underscore only)
  if (col && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) {
    qtyColumnCache[schema] = null;
    return null;
  }

  qtyColumnCache[schema] = col;
  console.log(`[sales-volume] InvDetail qty column for ${schema}: ${col} (candidates: ${names.join(", ")})`);
  return col;
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

    // Build filters
    const params: unknown[] = [2]; // $1 = cieid
    let paramIdx = 2;

    let itemFilterSQL = "";
    if (itemIds) {
      const idsArray = itemIds.split(",").map((id) => parseInt(id.trim(), 10));
      itemFilterSQL = `AND i."ItemId" = ANY($${paramIdx})`;
      params.push(idsArray);
      paramIdx++;
    } else {
      itemFilterSQL = `AND i."ProdId" = $${paramIdx}`;
      params.push(parseInt(prodId!, 10));
      paramIdx++;

      if (itemId) {
        itemFilterSQL += ` AND i."ItemId" = $${paramIdx}`;
        params.push(parseInt(itemId, 10));
        paramIdx++;
      } else if (typeId) {
        itemFilterSQL += ` AND i."locitemtype" = $${paramIdx}`;
        params.push(parseInt(typeId, 10));
        paramIdx++;
      }
    }

    let salesrepFilterSQL = "";
    if (salesrepIds) {
      const srIds = salesrepIds.split(",").map((id) => parseInt(id.trim(), 10));
      salesrepFilterSQL = `AND h."srid" = ANY($${paramIdx})`;
      params.push(srIds);
      paramIdx++;
    }

    // Discover the actual quantity column from InvDetail
    const qtyCol = await getQtyColumn(schema);

    // Translation expressions
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

    // Quantity and volume SQL expressions
    // If we found a qty column, use SUM(qty) for actual quantities and SUM(qty * volume) for Lt/Kg
    // Otherwise fall back to COUNT(*) for tx count (less accurate for volume)
    const qtyExpr365 = qtyCol
      ? `SUM(CASE WHEN h."InvDate" >= CURRENT_DATE - 365 THEN d."${qtyCol}"::float8 ELSE 0 END)`
      : `COUNT(CASE WHEN h."InvDate" >= CURRENT_DATE - 365 THEN 1 END)::float8`;
    const qtyExpr720 = qtyCol
      ? `SUM(d."${qtyCol}"::float8)`
      : `COUNT(*)::float8`;
    const volExpr365 = qtyCol
      ? `SUM(CASE WHEN h."InvDate" >= CURRENT_DATE - 365 THEN d."${qtyCol}"::float8 * COALESCE(i."volume", 0) ELSE 0 END)`
      : `0`;
    const volExpr720 = qtyCol
      ? `SUM(d."${qtyCol}"::float8 * COALESCE(i."volume", 0))`
      : `0`;

    // Mirrors dashboard-data pattern: InvHeader → InvDetail → Items → Products
    // Two-period aggregation via CASE WHEN on indexed InvDate
    const query = `
SELECT
  i."ItemId"    AS "itemId",
  i."ItemCode"  AS "itemCode",
  ${itemDescr}  AS "description",
  i."volume"    AS "volume",
  i."model"     AS "format",
  ${prodName}   AS "categoryName",
  ${typeDescr}  AS "className",
  SUM(CASE WHEN h."InvDate" >= CURRENT_DATE - 365
      THEN d."Amount"::float8 ELSE 0 END)  AS "sales365",
  ${qtyExpr365}                             AS "qty365",
  ${volExpr365}                             AS "volumeLtKg365",
  SUM(d."Amount"::float8)                   AS "sales720",
  ${qtyExpr720}                             AS "qty720",
  ${volExpr720}                             AS "volumeLtKg720"
FROM ${T.INV_HEADER} h
JOIN ${T.INV_DETAIL} d  ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
JOIN ${T.ITEMS}      i  ON d."Itemid" = i."ItemId"
LEFT JOIN ${T.PRODUCTS}  p ON i."ProdId" = p."ProdId"
LEFT JOIN ${T.ITEM_TYPE} t ON i."locitemtype" = t."itemtypeid"
${zdJoins}
WHERE h."cieid" = $1
  AND h."InvDate" >= CURRENT_DATE - 720
  AND i."ProdId" BETWEEN 1 AND 10
  AND i."isActive" = true
  ${itemFilterSQL}
  ${salesrepFilterSQL}
GROUP BY i."ItemId", i."ItemCode", i."Descr", i."volume", i."model",
         p."Name", p."ProdId", t."descr", t."itemtypeid"
         ${isEn ? `, zdi."Descr", zdp."Descr", zdt."Descr"` : ""}
ORDER BY ${prodName}, ${typeDescr}, i."volume", i."ItemCode"
`;

    const { rows } = await pg.query(query, params);

    // Volume Lt/Kg is now computed directly in SQL via SUM(qty * volume)
    const result = rows.map((row: Record<string, unknown>) => {
      return {
        itemId: row.itemId,
        itemCode: row.itemCode,
        description: row.description,
        volume: row.volume ? parseFloat(String(row.volume)) : null,
        format: row.format,
        categoryName: row.categoryName,
        className: row.className,
        sales365: parseFloat(String(row.sales365)) || 0,
        qty365: Math.round((parseFloat(String(row.qty365)) || 0) * 10) / 10,
        volumeLtKg365: Math.round((parseFloat(String(row.volumeLtKg365)) || 0) * 10) / 10,
        sales720: parseFloat(String(row.sales720)) || 0,
        qty720: Math.round((parseFloat(String(row.qty720)) || 0) * 10) / 10,
        volumeLtKg720: Math.round((parseFloat(String(row.volumeLtKg720)) || 0) * 10) / 10,
      };
    });

    setCache(cacheKey, result);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Sales volume API error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Erreur lors de la génération des données de ventes" },
      { status: 500 }
    );
  }
}
