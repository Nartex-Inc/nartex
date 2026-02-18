import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";
import { getPrextraTables } from "@/lib/prextra";

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
    const itemTypeId = searchParams.get("itemTypeId");
    const search = searchParams.get("search");
    const isEn = searchParams.get("lang") === "en";

    const itemDescr = isEn ? `COALESCE(zdi."Descr", i."Descr")` : `i."Descr"`;
    const typeDescr = isEn ? `COALESCE(zdt."Descr", t."descr")` : `t."descr"`;
    const prodName = isEn ? `COALESCE(zdp."Descr", p."Name")` : `p."Name"`;

    const zdJoins = isEn
      ? `LEFT JOIN ${T.ZDATANAME} zdi
           ON zdi."TableName" = 'Items' AND zdi."FieldName" = 'descr'
           AND zdi."cieid" = 2 AND zdi."LangId" = 1
           AND zdi."Id" = i."ItemId"
         LEFT JOIN ${T.ZDATANAME} zdt
           ON zdt."TableName" = 'itemtype' AND zdt."FieldName" = 'descr'
           AND zdt."cieid" = 2 AND zdt."LangId" = 1
           AND zdt."Id" = t."itemtypeid"
         LEFT JOIN ${T.ZDATANAME} zdp
           ON zdp."TableName" = 'Products' AND zdp."FieldName" = 'descr'
           AND zdp."cieid" = 2 AND zdp."LangId" = 1
           AND zdp."Id" = p."ProdId"`
      : "";

    let query = `
      SELECT
        i."ItemId" as "itemId",
        i."ItemCode" as "itemCode",
        ${itemDescr} as "description",
        i."ProdId" as "prodId",
        i."locitemtype" as "itemTypeId",
        ${typeDescr} as "className",
        ${prodName} as "categoryName"
      FROM ${T.ITEMS} i
      LEFT JOIN ${T.ITEM_TYPE} t ON i."locitemtype" = t."itemtypeid"
      LEFT JOIN ${T.PRODUCTS} p ON i."ProdId" = p."ProdId"
      ${zdJoins}
      WHERE i."ProdId" BETWEEN 1 AND 10
        AND NOT EXISTS (
          SELECT 1 FROM ${T.RECORD_SPEC_DATA} rsd
          WHERE rsd."TableName" = 'items'
            AND rsd."TableId" = i."ItemId"
            AND rsd."FieldName" IN ('excludecybercat', 'isPriceList')
            AND rsd."FieldValue" = '1'
        )
    `;

    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (i."ItemCode" ILIKE $${paramIndex} OR ${itemDescr} ILIKE $${paramIndex} OR ${typeDescr} ILIKE $${paramIndex} OR ${prodName} ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;

      query += `
        ORDER BY ${prodName} ASC, ${typeDescr} ASC, i."ItemCode" ASC
        LIMIT 200
      `;

    } else if (itemTypeId) {
      query += ` AND i."locitemtype" = $${paramIndex}`;
      params.push(parseInt(itemTypeId, 10));
      paramIndex++;
      query += ` ORDER BY i."ItemCode" ASC`;
    } else {
      return NextResponse.json(
        { error: "Paramètres manquants: itemTypeId ou search requis" },
        { status: 400 }
      );
    }

    const { rows } = await pg.query(query, params);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET /api/catalogue/items error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des articles" },
      { status: 500 }
    );
  }
}
