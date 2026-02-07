// src/app/api/orders/[sonbr]/route.ts
// GET /api/orders/:sonbr

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";
import { getPrextraTables } from "@/lib/prextra";

export async function GET(_req: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, exists: false, error: "Non autorisé" }, { status: 401 });
    }

    const schema = session.user.prextraSchema;
    if (!schema) {
      return NextResponse.json({ ok: false, exists: false, error: "Aucun schéma Prextra configuré" }, { status: 403 });
    }

    const raw = context?.params?.sonbr ?? "";
    let decoded = "";
    try {
      decoded = decodeURIComponent(String(raw)).trim();
    } catch {
      decoded = String(raw).trim();
    }
    const sonbr = Number(decoded);

    if (!Number.isFinite(sonbr) || !Number.isInteger(sonbr)) {
      return NextResponse.json(
        { ok: false, exists: false, error: "Missing or invalid order number." },
        { status: 400 }
      );
    }

    const T = getPrextraTables(schema);

    // Single JOIN query for order + customer + carrier + salesrep + shipment
    const { rows } = await pg.query(
      `SELECT
        so."sonbr",
        so."OrderDate",
        so."totalamt",
        c."CustCode",
        c."Name"      AS "CustomerName",
        ca."name"      AS "CarrierName",
        sr."Name"      AS "SalesrepName",
        sh."WayBill"   AS "TrackingNumber"
       FROM ${T.SO_HEADER} so
       LEFT JOIN ${T.CUSTOMERS} c ON so."custid" = c."CustId"
       LEFT JOIN ${T.CARRIERS} ca ON so."Carrid" = ca."carrid"
       LEFT JOIN ${T.SALESREP} sr ON so."SRid" = sr."SRId"
       LEFT JOIN LATERAL (
         SELECT "WayBill" FROM ${T.SHIPMENT_HDR}
         WHERE "sonbr" = so."sonbr"
         ORDER BY "id" DESC LIMIT 1
       ) sh ON true
       WHERE so."sonbr" = $1
       ORDER BY so."cieid" DESC
       LIMIT 1`,
      [sonbr]
    );

    if (rows.length === 0) {
      return NextResponse.json({
        ok: true,
        exists: false,
        error: "Aucune information trouvée.",
      });
    }

    const row = rows[0];
    return NextResponse.json({
      ok: true,
      exists: true,
      sonbr: row.sonbr,
      OrderDate: row.OrderDate ?? null,
      totalamt: row.totalamt != null ? Number(row.totalamt) : null,
      CustCode: row.CustCode ?? "",
      CustomerName: row.CustomerName ?? "",
      CarrierName: row.CarrierName ?? "",
      SalesrepName: row.SalesrepName ?? "",
      TrackingNumber: row.TrackingNumber ?? "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json(
      { ok: false, exists: false, error: message },
      { status: 500 }
    );
  }
}
