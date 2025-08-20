// src/app/api/sales-per-rep/route.ts
import { NextResponse } from "next/server";
import { pg } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Row = { salesRepName: string; value: number };

const sqlLower = `
  WITH bounds AS (
    SELECT make_date(EXTRACT(YEAR FROM $4::date)::int, 1, 1) AS start_curr, $4::date AS as_of
  )
  SELECT sr.name AS "salesRepName",
         (SUM(CASE WHEN $1::text='money' THEN d.amount ELSE d.qty * i.volume END))::float8 AS value
  FROM invheader h
  JOIN invdetail d ON d.invnbr=h.invnbr AND d.cieid=h.cieid
  JOIN items i     ON i.itemid=d.itemid
  JOIN salesrep sr ON sr.srid=h.srid
  WHERE h.cieid=$2
    AND ($3::int=0 OR h.custid=$3)
    AND ($5::text='' OR sr.name=$5)
    AND h.invdate BETWEEN (SELECT start_curr FROM bounds) AND (SELECT as_of FROM bounds)
  GROUP BY sr.name
  ORDER BY value DESC;
`;

const sqlCamel = `
  SET LOCAL search_path TO public;
  WITH bounds AS (
    SELECT make_date(EXTRACT(YEAR FROM $4::date)::int, 1, 1) AS start_curr, $4::date AS as_of
  )
  SELECT sr.name AS "salesRepName",
         (SUM(CASE WHEN $1::text='money' THEN d.amount ELSE d.qty * i.volume END))::float8 AS value
  FROM "InvHeader" h
  JOIN "InvDetail" d ON d."InvNbr" = h."InvNbr" AND d."CieId" = h."CieId"
  JOIN "Items"     i ON i."ItemId" = d."ItemId"
  JOIN "Salesrep" sr ON sr."SrId"   = h."SrId"
  WHERE h."CieId" = $2
    AND ($3::int=0 OR h."CustId"=$3)
    AND ($5::text='' OR sr."Name"=$5)
    AND h."InvDate" BETWEEN (SELECT start_curr FROM bounds) AND (SELECT as_of FROM bounds)
  GROUP BY sr."Name"
  ORDER BY value DESC;
`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode      = (searchParams.get("mode") ?? "money") as "money" | "weight";
  const gcieid    = Number(searchParams.get("gcieid") ?? 2);
  const custid    = Number(searchParams.get("custid") ?? 0);
  const asOfDate  = searchParams.get("asOfDate") ?? new Date().toISOString().slice(0,10);
  const targetRep = searchParams.get("rep") ?? "";

  const params = [mode, gcieid, custid, asOfDate, targetRep] as const;

  try {
    // try lower-case
    const { rows } = await pg.query<Row>(sqlLower, params);
    return NextResponse.json(
      rows.map(r => ({ salesRepName: r.salesRepName, value: Number(r.value) || 0 })),
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (eLower: any) {
    // retry CamelCase
    try {
      const { rows } = await pg.query<Row>(sqlCamel, params);
      return NextResponse.json(
        rows.map(r => ({ salesRepName: r.salesRepName, value: Number(r.value) || 0 })),
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      );
    } catch (eCamel: any) {
      console.error("sales-per-rep failed", { eLower: String(eLower?.message || eLower), eCamel: String(eCamel?.message || eCamel) });
      return NextResponse.json(
        { error: "Query failed", lower: String(eLower?.message || eLower), camel: String(eCamel?.message || eCamel) },
        { status: 500 }
      );
    }
  }
}
