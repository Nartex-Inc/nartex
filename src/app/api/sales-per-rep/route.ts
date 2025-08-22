// app/api/sales-distribution/route.ts
import { NextResponse } from "next/server";
import { pg } from "@/lib/db";

/**
 * Query params:
 *   mode=money|weight         (default: money)
 *   gcieid=<int>              (default: 2)
 *   custid=<int>              (default: 0 => all customers)
 *   asOfDate=YYYY-MM-DD       (default: today)
 *   range=ytd|qtd|mtd         (default: ytd)  // controls current/previous windows
 *
 * Returns { current: Row[], previous: Row[], meta:{...} }
 */
type Row = { salesRepName: string; value: number };

const LOWER_SQL = `
WITH b AS (
  SELECT
    $4::date AS as_of,
    CASE $6
      WHEN 'mtd' THEN date_trunc('month', $4::date)::date
      WHEN 'qtd' THEN date_trunc('quarter', $4::date)::date
      ELSE make_date(EXTRACT(YEAR FROM $4::date)::int, 1, 1)
    END AS start_curr,
    ($4::date - interval '1 year')::date AS as_of_prev,
    CASE $6
      WHEN 'mtd' THEN (date_trunc('month', $4::date) - interval '1 year')::date
      WHEN 'qtd' THEN (date_trunc('quarter', $4::date) - interval '1 year')::date
      ELSE make_date(EXTRACT(YEAR FROM $4::date)::int - 1, 1, 1)
    END AS start_prev
),
val AS (
  SELECT
    sr.name AS salesrep,
    -- YTD/QTD/MTD (current window)
    COALESCE(SUM(CASE WHEN h.invdate BETWEEN (SELECT start_curr FROM b) AND (SELECT as_of FROM b)
                 THEN (CASE WHEN $1::text='money'
                            THEN d.amount
                            ELSE d.qty * i.volume
                       END)
                 ELSE 0 END),0)::float8 AS curr_val,
    -- Prior YTD/QTD/MTD (previous window)
    COALESCE(SUM(CASE WHEN h.invdate BETWEEN (SELECT start_prev FROM b) AND (SELECT as_of_prev FROM b)
                 THEN (CASE WHEN $1::text='money'
                            THEN d.amount
                            ELSE d.qty * i.volume
                       END)
                 ELSE 0 END),0)::float8 AS prev_val
  FROM salesrep sr
  LEFT JOIN invheader h
         ON h.srid = sr.srid
        AND h.cieid = $2
        AND ($3::int = 0 OR h.custid = $3)
  LEFT JOIN invdetail d
         ON d.invnbr = h.invnbr
        AND d.cieid  = h.cieid
  LEFT JOIN items i
         ON i.itemid = d.itemid
  GROUP BY sr.name
)
SELECT salesrep AS "salesRepName", curr_val AS value, prev_val
FROM val
ORDER BY value DESC NULLS LAST;
`;

const CAMEL_SQL = `
WITH b AS (
  SELECT
    $4::date AS as_of,
    CASE $6
      WHEN 'mtd' THEN date_trunc('month', $4::date)::date
      WHEN 'qtd' THEN date_trunc('quarter', $4::date)::date
      ELSE make_date(EXTRACT(YEAR FROM $4::date)::int, 1, 1)
    END AS start_curr,
    ($4::date - interval '1 year')::date AS as_of_prev,
    CASE $6
      WHEN 'mtd' THEN (date_trunc('month', $4::date) - interval '1 year')::date
      WHEN 'qtd' THEN (date_trunc('quarter', $4::date) - interval '1 year')::date
      ELSE make_date(EXTRACT(YEAR FROM $4::date)::int - 1, 1, 1)
    END AS start_prev
),
val AS (
  SELECT
    sr."Name" AS salesrep,
    COALESCE(SUM(CASE WHEN h."InvDate" BETWEEN (SELECT start_curr FROM b) AND (SELECT as_of FROM b)
                 THEN (CASE WHEN $1::text='money'
                            THEN d."Amount"
                            ELSE d."Qty" * i."Volume"
                       END)
                 ELSE 0 END),0)::float8 AS curr_val,
    COALESCE(SUM(CASE WHEN h."InvDate" BETWEEN (SELECT start_prev FROM b) AND (SELECT as_of_prev FROM b)
                 THEN (CASE WHEN $1::text='money'
                            THEN d."Amount"
                            ELSE d."Qty" * i."Volume"
                       END)
                 ELSE 0 END),0)::float8 AS prev_val
  FROM public."Salesrep" sr
  LEFT JOIN public."InvHeader" h
         ON h."SrId" = sr."SrId"
        AND h."CieId" = $2
        AND ($3::int = 0 OR h."CustId" = $3)
  LEFT JOIN public."InvDetail" d
         ON d."InvNbr" = h."InvNbr"
        AND d."CieId"  = h."CieId"
  LEFT JOIN public."Items" i
         ON i."ItemId" = d."ItemId"
  GROUP BY sr."Name"
)
SELECT salesrep AS "salesRepName", curr_val AS value, prev_val
FROM val
ORDER BY value DESC NULLS LAST;
`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode      = (searchParams.get("mode") ?? "money") as "money" | "weight";
  const gcieid    = Number(searchParams.get("gcieid") ?? 2);
  const custid    = Number(searchParams.get("custid") ?? 0);
  const asOfDate  = searchParams.get("asOfDate") ?? new Date().toISOString().slice(0,10);
  const range     = (searchParams.get("range") ?? "ytd") as "ytd"|"qtd"|"mtd";

  const params: (string|number)[] = [mode, gcieid, custid, asOfDate, "", range];

  try {
    // Try lowercase schema first
    const { rows } = await pg.query(LOWER_SQL, params);
    const current: Row[]  = rows.map(r => ({ salesRepName: r.salesRepName, value: Number(r.value || 0) }));
    const previous: Row[] = rows.map(r => ({ salesRepName: r.salesRepName, value: Number((r as any).prev_val || 0) }));
    return NextResponse.json(makePayload(current, previous, asOfDate, range));
  } catch (eLower: any) {
    try {
      const { rows } = await pg.query(CAMEL_SQL, params);
      const current: Row[]  = rows.map(r => ({ salesRepName: r.salesRepName, value: Number(r.value || 0) }));
      const previous: Row[] = rows.map(r => ({ salesRepName: r.salesRepName, value: Number((r as any).prev_val || 0) }));
      return NextResponse.json(makePayload(current, previous, asOfDate, range));
    } catch (eCamel: any) {
      return NextResponse.json(
        { error: "Query failed", lower: String(eLower?.message || eLower), camel: String(eCamel?.message || eCamel) },
        { status: 500 }
      );
    }
  }
}

function makePayload(current: Row[], previous: Row[], asOf: string, range: "ytd"|"qtd"|"mtd") {
  const d = new Date(asOf);
  const y = d.getUTCFullYear();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let labelNow = `YTD ${y}`, labelPrev = `YTD ${y-1}`;
  if (range === "mtd") {
    labelNow = `MTD ${monthNames[d.getUTCMonth()]} ${y}`;
    labelPrev = `MTD ${monthNames[d.getUTCMonth()]} ${y-1}`;
  } else if (range === "qtd") {
    const q = Math.floor(d.getUTCMonth()/3)+1;
    labelNow = `Q${q} ${y}`;
    labelPrev = `Q${q} ${y-1}`;
  }
  return { current, previous, meta: { asOf, range, labelNow, labelPrev } };
}
