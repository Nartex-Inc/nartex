// src/app/api/dashboard-data/route.ts
import { NextResponse } from "next/server";
import { pg } from "@/lib/db";

// This query fetches detailed sales data, NOT aggregated data.
// It's designed to be the single source of truth for the interactive dashboard.
const SQL_QUERY = (gcieid: number, startDate: string, endDate: string) => `
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
  h."cieid" = ${gcieid}
  AND h."InvDate" BETWEEN '${startDate}' AND '${endDate}'
  AND d."Amount" > 0;
`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gcieid = Number(searchParams.get("gcieid") ?? 2);

  // By default, fetch data for the last 365 days.
  const endDate = searchParams.get("endDate") ?? new Date().toISOString().slice(0, 10);
  const startDate = searchParams.get("startDate") ?? 
    new Date(new Date().setDate(new Date(endDate).getDate() - 365)).toISOString().slice(0, 10);

  try {
    const sql = SQL_QUERY(gcieid, startDate, endDate);
    const { rows } = await pg.query(sql);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Database query failed in /api/dashboard-data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data.", details: error.message },
      { status: 500 }
    );
  }
}
