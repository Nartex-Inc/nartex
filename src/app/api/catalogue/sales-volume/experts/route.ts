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

    const params: unknown[] = [];
    let paramIdx = 1;
    let prodFilter = "";
    let typeFilter = "";

    if (prodId) {
      prodFilter = `AND i."ProdId" = $${paramIdx}`;
      params.push(parseInt(prodId, 10));
      paramIdx++;
    }

    if (typeId) {
      typeFilter = `AND i."locitemtype" = $${paramIdx}`;
      params.push(parseInt(typeId, 10));
      paramIdx++;
    }

    const query = `
      SELECT DISTINCT sr."SRId" AS "srId", sr."Name" AS "name"
      FROM ${T.SALESREP} sr
      JOIN ${T.INV_HEADER} h ON h."srid" = sr."SRId"
      JOIN ${T.INV_DETAIL} d ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
      JOIN ${T.ITEMS} i ON d."Itemid" = i."ItemId"
      WHERE h."cieid" = 2
        AND h."InvDate" >= CURRENT_DATE - 720
        AND i."ProdId" BETWEEN 1 AND 10
        ${prodFilter}
        ${typeFilter}
        AND sr."Name" IS NOT NULL AND sr."Name" <> ''
      ORDER BY sr."Name"
    `;

    const { rows } = await pg.query(query, params);

    return NextResponse.json(rows);
  } catch (error: unknown) {
    console.error("Sales volume experts API error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Erreur lors du chargement des experts" },
      { status: 500 }
    );
  }
}
