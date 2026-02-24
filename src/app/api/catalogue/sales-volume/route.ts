import { NextRequest, NextResponse } from "next/server";
import { pg } from "@/lib/db";
import { getPrextraTables } from "@/lib/prextra";
import { requireSchema, getErrorMessage } from "@/lib/auth-helpers";

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

    // Discover the quantity column name in InvDetail (DMS-replicated, varies by ERP)
    const colRes = await pg.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'InvDetail'
         AND column_name ILIKE '%qty%'
       ORDER BY ordinal_position LIMIT 1`,
      [schema]
    );
    const qtyCol = colRes.rows.length > 0 ? `"${colRes.rows[0].column_name}"` : `"QtyShipped"`;

    // Build item filter
    let itemFilterSQL = "";
    const params: unknown[] = [];
    let paramIdx = 1;

    if (itemIds) {
      const idsArray = itemIds.split(",").map((id) => parseInt(id.trim(), 10));
      itemFilterSQL = `AND i."ItemId" = ANY($${paramIdx})`;
      params.push(idsArray);
      paramIdx++;
    } else {
      const prodIdNum = parseInt(prodId!, 10);
      itemFilterSQL = `AND i."ProdId" = $${paramIdx}`;
      params.push(prodIdNum);
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

    // Salesrep filter
    let salesrepFilterSQL = "";
    if (salesrepIds) {
      const srIds = salesrepIds.split(",").map((id) => parseInt(id.trim(), 10));
      salesrepFilterSQL = `AND h."srid" = ANY($${paramIdx})`;
      params.push(srIds);
      paramIdx++;
    }

    // Translation joins
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

    const query = `
      SELECT
        i."ItemId" AS "itemId",
        i."ItemCode" AS "itemCode",
        ${itemDescr} AS "description",
        i."volume" AS "volume",
        i."model" AS "format",
        ${prodName} AS "categoryName",
        ${typeDescr} AS "className",
        SUM(CASE WHEN h."InvDate" >= CURRENT_DATE - 365
            THEN d."Amount"::float8 ELSE 0 END) AS "sales365",
        SUM(CASE WHEN h."InvDate" >= CURRENT_DATE - 365
            THEN d.${qtyCol}::float8 ELSE 0 END) AS "qty365",
        SUM(CASE WHEN h."InvDate" < CURRENT_DATE - 365
            AND h."InvDate" >= CURRENT_DATE - 720
            THEN d."Amount"::float8 ELSE 0 END) AS "sales720",
        SUM(CASE WHEN h."InvDate" < CURRENT_DATE - 365
            AND h."InvDate" >= CURRENT_DATE - 720
            THEN d.${qtyCol}::float8 ELSE 0 END) AS "qty720"
      FROM ${T.ITEMS} i
      JOIN ${T.INV_DETAIL} d ON d."Itemid" = i."ItemId"
      JOIN ${T.INV_HEADER} h ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
      LEFT JOIN ${T.PRODUCTS} p ON i."ProdId" = p."ProdId"
      LEFT JOIN ${T.ITEM_TYPE} t ON i."locitemtype" = t."itemtypeid"
      ${zdJoins}
      WHERE h."cieid" = 2
        AND h."InvDate" >= CURRENT_DATE - 720
        AND i."ProdId" BETWEEN 1 AND 10
        AND i."isActive" = true
        ${itemFilterSQL}
        ${salesrepFilterSQL}
        AND NOT EXISTS (
          SELECT 1 FROM ${T.RECORD_SPEC_DATA} rsd
          WHERE rsd."TableName" = 'items'
            AND rsd."TableId" = i."ItemId"
            AND rsd."FieldName" IN ('excludecybercat', 'isPriceList')
            AND rsd."FieldValue" = '1'
        )
      GROUP BY i."ItemId", i."ItemCode", i."Descr", i."volume", i."model",
               p."Name", p."ProdId", t."descr", t."itemtypeid"
               ${isEn ? `, zdi."Descr", zdp."Descr", zdt."Descr"` : ""}
      ORDER BY ${prodName}, ${typeDescr}, i."volume", i."ItemCode"
    `;

    const { rows } = await pg.query(query, params);

    // Compute volume Lt/Kg server-side
    const result = rows.map((row: Record<string, unknown>) => {
      const volume = row.volume ? parseFloat(String(row.volume)) : 0;
      const qty365 = parseFloat(String(row.qty365)) || 0;
      const qty720 = parseFloat(String(row.qty720)) || 0;

      return {
        itemId: row.itemId,
        itemCode: row.itemCode,
        description: row.description,
        volume: row.volume ? parseFloat(String(row.volume)) : null,
        format: row.format,
        categoryName: row.categoryName,
        className: row.className,
        sales365: parseFloat(String(row.sales365)) || 0,
        qty365,
        volumeLtKg365: Math.round(qty365 * volume * 10) / 10,
        sales720: parseFloat(String(row.sales720)) || 0,
        qty720,
        volumeLtKg720: Math.round(qty720 * volume * 10) / 10,
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Sales volume API error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Erreur lors de la génération des données de ventes" },
      { status: 500 }
    );
  }
}
