import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";
import { getPrextraTables } from "@/lib/prextra";

export async function GET() {
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
    const query = `
      SELECT
        p."ProdId" as "prodId",
        p."Name" as "name",
        COUNT(i."ItemId")::int as "itemCount"
      FROM ${T.PRODUCTS} p
      LEFT JOIN ${T.ITEMS} i ON p."ProdId" = i."ProdId"
        AND NOT EXISTS (
          SELECT 1 FROM ${T.RECORD_SPEC_DATA} rsd
          WHERE rsd."TableName" = 'items'
            AND rsd."TableId" = i."ItemId"
            AND rsd."FieldName" IN ('excludecybercat', 'isPriceList')
            AND rsd."FieldValue" = '1'
        )
      WHERE p."ProdId" BETWEEN 1 AND 10
      GROUP BY p."ProdId", p."Name"
      HAVING COUNT(i."ItemId") > 0
      ORDER BY p."Name" ASC
    `;

    const { rows } = await pg.query(query);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET /api/catalogue/products error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des catégories" },
      { status: 500 }
    );
  }
}
