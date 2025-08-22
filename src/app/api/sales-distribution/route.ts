// src/app/api/sales-distribution/route.ts
import { NextResponse } from "next/server";
import { pg } from "@/lib/db";

type Row = { salesRepName: string; value: number };

// NOTE ON PARAMETERS: Since the query is complex and uses internal CTEs for parameters,
// we are injecting the variables directly using template literals (${...})
// instead of relying on the pg client's numbered parameter binding ($1, $2, etc.).

const SQL_QUERY = (mode: string, gcieid: number, custid: number, asOf: string, targetSalesRepName: string) => `
-- ===================================================================================
-- Parameter CTE (Injected from Node.js variables)
-- ===================================================================================
WITH params AS (
  SELECT
    '${mode}'::text    AS mode,
    ${gcieid}::int     AS gcieid,
    ${custid}::int     AS custid,
    '${asOf}'::date    AS "asOfDate",
    '${targetSalesRepName}'::text AS targetSalesRepName
),
-- ===================================================================================
-- Date Range Calculations
-- ===================================================================================
dates AS (
  SELECT
    p."asOfDate"                                                     AS as_of_date,
    date_trunc('year', p."asOfDate")::date                           AS start_curr,
    (date_trunc('year', p."asOfDate") - interval '1 year')::date      AS start_prev,
    (p."asOfDate" - interval '1 year')::date                         AS end_prev
  FROM params p
),
-- ===================================================================================
-- Main Data Aggregation (Aggregating to Customer/SalesRep level)
-- ===================================================================================
SalesData AS (
  SELECT
    sr."Name" AS "salesRepName",
    h."InvDate",
    SUM(CASE WHEN (SELECT mode FROM params) = 'money' THEN d."Amount" ELSE d."Qty" * i."volume" END) AS salesValue
  FROM public."InvHeader" h
  CROSS JOIN params
  CROSS JOIN dates
  JOIN public."Salesrep" sr ON h."srid" = sr."SRId"
  JOIN public."Customers" c ON h."custid" = c."CustId"
  JOIN public."InvDetail" d ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
  JOIN public."Items" i ON d."Itemid" = i."ItemId"
  WHERE
    h."cieid" = (SELECT gcieid FROM params)
    AND ((SELECT custid FROM params) = 0 OR h."custid" = (SELECT custid FROM params))
    AND ((SELECT targetSalesRepName FROM params) = '' OR sr."Name" = (SELECT targetSalesRepName FROM params))
    AND h."InvDate" BETWEEN (SELECT start_prev FROM dates) AND (SELECT as_of_date FROM dates)
  GROUP BY
    sr."Name",
    h."InvDate"
),
-- ===================================================================================
-- Final Output Aggregation (Aggregating to SalesRep level only)
-- ===================================================================================
FinalData AS (
  SELECT
    "salesRepName",
    -- Current YTD Value
    SUM(CASE WHEN "InvDate" BETWEEN (SELECT start_curr FROM dates) AND (SELECT as_of_date FROM dates) THEN salesValue ELSE 0 END)::float8 AS curr_val,
    -- Previous YTD Value
    SUM(CASE WHEN "InvDate" BETWEEN (SELECT start_prev FROM dates) AND (SELECT end_prev FROM dates) THEN salesValue ELSE 0 END)::float8 AS prev_val
  FROM SalesData
  CROSS JOIN dates
  GROUP BY "salesRepName"
)
SELECT 
    "salesRepName", 
    curr_val AS value, 
    prev_val
FROM FinalData
ORDER BY value DESC NULLS LAST;
`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode   = (searchParams.get("mode") ?? "money") as "money"|"weight";
  const gcieid = Number(searchParams.get("gcieid") ?? 2);
  const custid = Number(searchParams.get("custid") ?? 0);
  const asOf   = searchParams.get("asOfDate") ?? new Date().toISOString().slice(0,10);
  const range  = (searchParams.get("range") ?? "ytd") as "ytd"|"qtd"|"mtd";
  // targetSalesRepName is not currently exposed in the frontend but included for flexibility
  const targetSalesRepName = searchParams.get("salesRep") ?? ""; 

  try {
    // Call the dynamic SQL query function
    const sql = SQL_QUERY(mode, gcieid, custid, asOf, targetSalesRepName);
    
    // Note: We pass an empty array of parameters since they are injected via template literal
    const { rows } = await pg.query(sql, []); 
    
    return NextResponse.json(buildPayload(rows, asOf, range));
    
  } catch (error: any) {
    console.error("Database query failed in /api/sales-distribution:", error);

    return NextResponse.json(
      {
        error: "An error occurred while fetching sales distribution data.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

function buildPayload(rows:any[], asOf:string, range:"ytd"|"qtd"|"mtd") {
  const current: Row[]  = rows.map(r => ({ salesRepName: r.salesRepName, value: Number(r.value || 0) }));
  const previous: Row[] = rows.map(r => ({ salesRepName: r.salesRepName, value: Number(r.prev_val || 0) }));
  const d = new Date(asOf), y = d.getUTCFullYear();
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
  
  // NOTE: The SQL now strictly computes YTD comparison based on asOf date,
  // but we keep the range logic here for display labels if the client requested MTD/QTD views.
  const meta =
    range === "mtd" ? { asOf, range, labelNow:`MTD ${m} ${y}`, labelPrev:`MTD ${m} ${y-1}` } :
    range === "qtd" ? { asOf, range, labelNow:`Q${Math.floor(d.getUTCMonth()/3)+1} ${y}`, labelPrev:`Q${Math.floor(d.getUTCMonth()/3)+1} ${y-1}` } :
                      { asOf, range, labelNow:`YTD ${y}`, labelPrev:`YTD ${y-1}` };
                      
  return { current, previous, meta };
}
