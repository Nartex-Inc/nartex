// src/app/api/customers/map/filters/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";
import { getPrextraTables } from "@/lib/prextra";

// Roles allowed to access (case-insensitive)
const ALLOWED_USER_ROLES = [
  "gestionnaire",
  "admin",
  "ventes-exec",
  "ventes_exec",
  "facturation",
  "expert",
];

const BYPASS_EMAILS = ["n.labranche@sinto.ca"];

export async function GET(req: Request) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const userEmail = user.email;
  const sessionRole = (user.role || "").toLowerCase().trim();

  let isAuthorized = ALLOWED_USER_ROLES.includes(sessionRole);
  if (!isAuthorized && userEmail && BYPASS_EMAILS.includes(userEmail.toLowerCase())) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Vous ne disposez pas des autorisations nécessaires." },
      { status: 403 }
    );
  }

  const schema = user.prextraSchema;
  if (!schema) {
    return NextResponse.json({ error: "Aucune donnée ERP pour ce tenant" }, { status: 403 });
  }

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
      salesReps: salesRepsResult.rows.map((r: any) => r.name),
      products: productsResult.rows.map((r: any) => ({
        code: r.code,
        description: r.description,
      })),
    });
  } catch (error: any) {
    console.error("Failed to fetch filter options:", error);
    return NextResponse.json(
      { error: "Échec de la récupération des options de filtrage." },
      { status: 500 }
    );
  }
}
