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

    if (!prodId) {
      return NextResponse.json({ error: "prodId requis" }, { status: 400 });
    }

    const query = `
      SELECT
        t."itemtypeid" as "itemTypeId",
        t."descr" as "description",
        COUNT(i."ItemId")::int as "itemCount"
      FROM ${T.ITEM_TYPE} t
      INNER JOIN ${T.ITEMS} i ON t."itemtypeid" = i."locitemtype"
      WHERE i."ProdId" = $1
      GROUP BY t."itemtypeid", t."descr"
      HAVING COUNT(i."ItemId") > 0
      ORDER BY t."descr" ASC
    `;

    const { rows } = await pg.query(query, [parseInt(prodId, 10)]);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET /api/catalogue/itemtypes error:", error);
    return NextResponse.json({ error: "Erreur types" }, { status: 500 });
  }
}
