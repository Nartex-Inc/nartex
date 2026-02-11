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

    let query = `
      SELECT
        i."ItemId" as "itemId",
        i."ItemCode" as "itemCode",
        i."Descr" as "description",
        i."ProdId" as "prodId",
        i."locitemtype" as "itemTypeId",
        t."descr" as "className",
        p."Name" as "categoryName"
      FROM ${T.ITEMS} i
      LEFT JOIN ${T.ITEM_TYPE} t ON i."locitemtype" = t."itemtypeid"
      LEFT JOIN ${T.PRODUCTS} p ON i."ProdId" = p."ProdId"
      WHERE i."ProdId" BETWEEN 1 AND 10
    `;

    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (i."ItemCode" ILIKE $${paramIndex} OR i."Descr" ILIKE $${paramIndex} OR t."descr" ILIKE $${paramIndex} OR p."Name" ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;

      query += `
        ORDER BY p."Name" ASC, t."descr" ASC, i."ItemCode" ASC
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
