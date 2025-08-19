// app/api/sales-per-rep/route.ts
import { NextResponse } from "next/server";
import { pg } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get("mode") ?? "money") as "money" | "weight";
  const gcieid = Number(searchParams.get("gcieid") ?? 2);
  const custid = Number(searchParams.get("custid") ?? 0);
  const asOfDate = searchParams.get("asOfDate") ?? new Date().toISOString().slice(0, 10);
  const targetRep = searchParams.get("rep") ?? ""; // '' = all

  // NOTE: adjust identifiers' case if your DB uses quoted CamelCase.
  const text = `
    WITH bounds AS (
      SELECT
        make_date(EXTRACT(YEAR FROM $4::date)::int, 1, 1) AS start_curr,
        $4::date AS as_of
    )
    SELECT
      sr.name AS "salesRepName",
      SUM(
        CASE
          WHEN $1::text = 'money'
          THEN d.amount
          ELSE d.qty * i.volume         -- replace i.volume with your "weight" basis if different
        END
      ) AS value
    FROM invheader h
    JOIN invdetail d ON d.invnbr = h.invnbr AND d.cieid = h.cieid
    JOIN items i      ON i.itemid = d.itemid
    JOIN salesrep sr  ON sr.srid  = h.srid
    WHERE h.cieid = $2
      AND ($3::int = 0 OR h.custid = $3)
      AND ($5::text = '' OR sr.name = $5)
      AND h.invdate BETWEEN (SELECT start_curr FROM bounds) AND (SELECT as_of FROM bounds)
    GROUP BY sr.name
    ORDER BY value DESC;
  `;

  const params = [mode, gcieid, custid, asOfDate, targetRep];
  const { rows } = await pg.query<{ salesRepName: string; value: string | number }>(text, params);

  // Coerce numeric text to numbers for recharts
  const data = rows.map(r => ({ salesRepName: r.salesRepName, value: Number(r.value) }));
  return NextResponse.json(data);
}
