// src/app/api/customers/map/filters/route.ts
import { NextResponse } from "next/server";
import { pg } from "@/lib/db";
import { getPrextraTables } from "@/lib/prextra";
import { requireSchema, requireRoles, getErrorMessage } from "@/lib/auth-helpers";

const ALLOWED_ROLES = [
  "gestionnaire",
  "admin",
  "ventes-exec",
  "ventes_exec",
  "facturation",
  "expert",
];

export async function GET(req: Request) {
  const auth = await requireSchema();
  if (!auth.ok) return auth.response;
  const { user, schema } = auth;

  const forbidden = requireRoles(user, ALLOWED_ROLES);
  if (forbidden) return forbidden;

  const T = getPrextraTables(schema);
  const { searchParams } = new URL(req.url);
  const gcieid = Number(searchParams.get("gcieid") ?? 2);

  try {
    // Fetch sales reps
    const salesRepsQuery = `
      SELECT DISTINCT sr."Name" as name
      FROM ${T.SALESREP} sr
      JOIN ${T.INV_HEADER} h ON h."srid" = sr."SRId"
      WHERE h."cieid" = $1
        AND sr."Name" <> 'OTOPROTEC (004)'
      ORDER BY sr."Name";
    `;

    // Fetch products/items
    const productsQuery = `
      SELECT DISTINCT i."ItemCode" as code, i."Descr" as description
      FROM ${T.ITEMS} i
      JOIN ${T.PRODUCTS} p ON i."ProdId" = p."ProdId"
      WHERE p."CieID" = $1
        AND NOT (
          CASE
            WHEN btrim(p."ProdCode") ~ '^[0-9]+$'
              THEN (btrim(p."ProdCode")::int > 499)
            ELSE FALSE
          END
        )
      ORDER BY i."ItemCode";
    `;

    const [salesRepsResult, productsResult] = await Promise.all([
      pg.query(salesRepsQuery, [gcieid]),
      pg.query(productsQuery, [gcieid]),
    ]);

    return NextResponse.json({
      salesReps: salesRepsResult.rows.map((r: { name: string }) => r.name),
      products: productsResult.rows.map((r: { code: string; description: string }) => ({
        code: r.code,
        description: r.description,
      })),
    });
  } catch (error: unknown) {
    console.error("Failed to fetch filter options:", error);
    return NextResponse.json(
      { error: "Échec de la récupération des options de filtrage." },
      { status: 500 }
    );
  }
}
