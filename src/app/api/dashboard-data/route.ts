// src/app/api/dashboard-data/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust this path if your auth route is elsewhere
import { pg } from "@/lib/db";

// This query is now parameterized to prevent SQL injection.
// Placeholders ($1, $2, $3) are used instead of template literals.
const SQL_QUERY = `
SELECT
  sr."Name" AS "salesRepName",
  c."Name" AS "customerName",
  i."ItemCode" AS "itemCode",
  i."Descr" AS "itemDescription",
  h."InvDate" AS "invoiceDate",
  d."Amount"::float8 AS "salesValue"
FROM public."InvHeader" h
JOIN public."Salesrep" sr ON h."srid" = sr."SRId"
JOIN public."Customers" c ON h."custid" = c."CustId"
JOIN public."InvDetail" d ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
JOIN public."Items" i ON d."Itemid" = i."ItemId"
WHERE
  h."cieid" = $1 -- Parameter 1: gcieid
  AND h."InvDate" BETWEEN $2 AND $3 -- Parameter 2: startDate, Parameter 3: endDate
  AND d."Amount" > 0;
`;

export async function GET(req: Request) {
  // 1. Get the session securely on the server
  const session = await getServerSession(authOptions);

  // 2. Check for authentication AND the specific role
  if (!session || session.user?.role !== "ventes-exec") {
    // 3. If the check fails, return a 403 Forbidden error immediately
    return NextResponse.json(
      { error: "Vous ne disposez pas des autorisations nécessaires pour consulter ces données. Veuillez contacter votre département TI pour de l'aide." },
      { status: 403 }
    );
  }

  // --- If the user is authorized, the code proceeds below ---

  const { searchParams } = new URL(req.url);
  const gcieid = Number(searchParams.get("gcieid") ?? 2);

  const endDate = searchParams.get("endDate") ?? new Date().toISOString().slice(0, 10);
  const startDate = searchParams.get("startDate") ?? 
    new Date(new Date().setDate(new Date(endDate).getDate() - 365)).toISOString().slice(0, 10);

  // Simple date validation
  if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
    return NextResponse.json({ error: "Format de date invalide fourni." }, { status: 400 });
  }

  try {
    // Create an array of parameters to safely pass to the query
    const params = [gcieid, startDate, endDate];
    
    // Execute the query with the safe parameters
    const { rows } = await pg.query(SQL_QUERY, params);
    
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Database query failed in /api/dashboard-data:", error);
    return NextResponse.json(
      { error: "Échec de la récupération des données du tableau de bord.", details: error.message },
      { status: 500 }
    );
  }
}
