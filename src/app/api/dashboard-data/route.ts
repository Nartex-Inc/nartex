// src/app/api/dashboard-data/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { pg } from "@/lib/db";

const SQL_QUERY = `
SELECT
  sr."Name"            AS "salesRepName",
  c."Name"             AS "customerName",
  i."ItemCode"         AS "itemCode",
  i."Descr"            AS "itemDescription",
  h."InvDate"          AS "invoiceDate",
  d."Amount"::float8   AS "salesValue"
FROM public."InvHeader" h
JOIN public."Salesrep"   sr ON h."srid"   = sr."SRId"
JOIN public."Customers"  c  ON h."custid" = c."CustId"
JOIN public."InvDetail"  d  ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
JOIN public."Items"      i  ON d."Itemid" = i."ItemId"
JOIN public."Products"   p  ON i."ProdId" = p."ProdId" AND p."CieID" = h."cieid"
WHERE h."cieid" = $1
  AND h."InvDate" BETWEEN $2 AND $3
  AND sr."Name" <> 'OTOPROTEC (004)'
  AND NOT (p."ProdCode" ~ '^[0-9]+$' AND p."ProdCode"::int >= 499);
`;


export async function GET(req: Request) {
  // 1) Auth
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Role gate (keeps your original rule)
  const user = session.user as any; // cast to avoid TS complaints about .role
  if (user.role !== "ventes-exec") {
    return NextResponse.json(
      {
        error:
          "Vous ne disposez pas des autorisations nécessaires pour consulter ces données. Veuillez contacter votre département TI pour de l'aide.",
      },
      { status: 403 }
    );
  }

  // 3) Inputs
  const { searchParams } = new URL(req.url);
  const gcieid = Number(searchParams.get("gcieid") ?? 2);

  const endDate =
    searchParams.get("endDate") ?? new Date().toISOString().slice(0, 10);
  const startDate =
    searchParams.get("startDate") ??
    new Date(new Date().setDate(new Date(endDate).getDate() - 365))
      .toISOString()
      .slice(0, 10);

  // 4) Validate dates
  if (
    Number.isNaN(new Date(startDate).getTime()) ||
    Number.isNaN(new Date(endDate).getTime())
  ) {
    return NextResponse.json(
      { error: "Format de date invalide fourni." },
      { status: 400 }
    );
  }

  // 5) Query
  try {
    const params: [number, string, string] = [gcieid, startDate, endDate];
    const { rows } = await pg.query(SQL_QUERY, params);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Database query failed in /api/dashboard-data:", error);
    return NextResponse.json(
      {
        error: "Échec de la récupération des données du tableau de bord.",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
