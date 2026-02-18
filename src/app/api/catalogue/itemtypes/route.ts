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
    const prodId = searchParams.get("prodId");
    const isEn = searchParams.get("lang") === "en";

    if (!prodId) {
      return NextResponse.json({ error: "prodId requis" }, { status: 400 });
    }

    const descrCol = isEn
      ? `COALESCE(zdt."Descr", t."descr")`
      : `t."descr"`;

    const zdJoin = isEn
      ? `LEFT JOIN ${T.ZDATANAME} zdt
           ON zdt."TableName" = 'itemtype' AND zdt."FieldName" = 'descr'
           AND zdt."cieid" = 2 AND zdt."LangId" = 1
           AND zdt."Id" = t."itemtypeid"`
      : "";

    const groupExtra = isEn ? `, zdt."Descr"` : "";

    const query = `
      SELECT
        t."itemtypeid" as "itemTypeId",
        ${descrCol} as "description",
        COUNT(i."ItemId")::int as "itemCount"
      FROM ${T.ITEM_TYPE} t
      INNER JOIN ${T.ITEMS} i ON t."itemtypeid" = i."locitemtype"
      ${zdJoin}
      WHERE i."ProdId" = $1
        AND NOT EXISTS (
          SELECT 1 FROM ${T.RECORD_SPEC_DATA} rsd
          WHERE rsd."TableName" = 'items'
            AND rsd."TableId" = i."ItemId"
            AND rsd."FieldName" IN ('excludecybercat', 'isPriceList')
            AND rsd."FieldValue" = '1'
        )
      GROUP BY t."itemtypeid", t."descr"${groupExtra}
      HAVING COUNT(i."ItemId") > 0
      ORDER BY ${descrCol} ASC
    `;

    const { rows } = await pg.query(query, [parseInt(prodId, 10)]);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET /api/catalogue/itemtypes error:", error);
    return NextResponse.json({ error: "Erreur types" }, { status: 500 });
  }
}
