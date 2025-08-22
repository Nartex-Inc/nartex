// src/app/api/sales-distribution/route.ts
import { NextResponse } from "next/server";
import { pg } from "@/lib/db";

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
    COALESCE(SUM(CASE WHEN h.invdate BETWEEN (SELECT start_curr FROM b) AND (SELECT as_of FROM b)
                 THEN (CASE WHEN $1::text='money' THEN d.amount ELSE d.qty * i.volume END)
                 ELSE 0 END),0)::numeric(18,2) AS curr_val,
    COALESCE(SUM(CASE WHEN h.invdate BETWEEN (SELECT start_prev FROM b) AND (SELECT as_of_prev FROM b)
                 THEN (CASE WHEN $1::text='money' THEN d.amount ELSE d.qty * i.volume END)
                 ELSE 0 END),0)::numeric(18,2) AS prev_val
  FROM salesrep sr
  LEFT JOIN invheader h
         ON h.srid = sr.srid
        AND h.cieid = $2
        AND ($3::int = 0 OR h.custid = $3)
  LEFT JOIN invdetail d
         ON d.invnbr = h.invnbr AND d.cieid = h.cieid
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
                 THEN (CASE WHEN $1::text='money' THEN d."Amount" ELSE d."Qty" * i."Volume" END)
                 ELSE 0 END),0)::numeric(18,2) AS curr_val,
    COALESCE(SUM(CASE WHEN h."InvDate" BETWEEN (SELECT start_prev FROM b) AND (SELECT as_of_prev FROM b)
                 THEN (CASE WHEN $1::text='money' THEN d."Amount" ELSE d."Qty" * i."Volume" END)
                 ELSE 0 END),0)::numeric(18,2) AS prev_val
  FROM public."Salesrep" sr
  LEFT JOIN public."InvHeader" h
         ON h."SrId" = sr."SrId"
        AND h."CieId" = $2
        AND ($3::int = 0 OR h."CustId" = $3)
  LEFT JOIN public."InvDetail" d
         ON d."InvNbr" = h."InvNbr" AND d."CieId" = h."CieId"
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
  const mode   = (searchParams.get("mode") ?? "money") as "money"|"weight";
  const gcieid = Number(searchParams.get("gcieid") ?? 2);
  const custid = Number(searchParams.get("custid") ?? 0);
  const asOf   = searchParams.get("asOfDate") ?? new Date().toISOString().slice(0,10);
  const range  = (searchParams.get("range") ?? "ytd") as "ytd"|"qtd"|"mtd";

  const params: (string|number)[] = [mode, gcieid, custid, asOf, "", range];

  try {
    const r = await pg.query(LOWER_SQL, params);
    return NextResponse.json(payload(r.rows, asOf, range));
  } catch (eLower:any) {
    try {
      const r2 = await pg.query(CAMEL_SQL, params);
      return NextResponse.json(payload(r2.rows, asOf, range));
    } catch (eCamel:any) {
      return NextResponse.json(
        { error: "Query failed", lower: String(eLower?.message||eLower), camel: String(eCamel?.message||eCamel) },
        { status: 500 }
      );
    }
  }
}

function payload(rows:any[], asOf:string, range:"ytd"|"qtd"|"mtd") {
  const current: Row[]  = rows.map(r => ({ salesRepName: r.salesRepName, value: Number(r.value||0) }));
  const previous: Row[] = rows.map(r => ({ salesRepName: r.salesRepName, value: Number(r.prev_val||0) }));
  const d = new Date(asOf), y = d.getUTCFullYear();
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
  const meta = (range === "mtd")
    ? { asOf, range, labelNow:`MTD ${m} ${y}`, labelPrev:`MTD ${m} ${y-1}` }
    : (range === "qtd")
      ? { asOf, range, labelNow:`Q${Math.floor(d.getUTCMonth()/3)+1} ${y}`, labelPrev:`Q${Math.floor(d.getUTCMonth()/3)+1} ${y-1}` }
      : { asOf, range, labelNow:`YTD ${y}`, labelPrev:`YTD ${y-1}` };
  return { current, previous, meta };
}
