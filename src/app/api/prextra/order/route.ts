// src/app/api/prextra/order/route.ts
// GET /api/prextra/order?no_commande=12345
// Returns minimal SO header + joined details to auto-fill the return form.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("no_commande") ?? "";
    const sonbr = Number(decodeURIComponent(raw).trim());

    // Validate query
    if (!Number.isFinite(sonbr)) {
      return NextResponse.json(
        { ok: false, exists: false, error: "Missing or invalid 'no_commande'." },
        { status: 400 }
      );
    }

    // Some datasets can have the same sonbr across companies (cieid).
    // Pick the record from the highest cieid.
    const so = await prisma.sOHeader.findFirst({
      where: { sonbr },
      orderBy: [{ cieid: "desc" }],
      select: {
        cieid: true,
        sonbr: true,
        orderdate: true,
        totalamt: true,
        custid: true,
        carrid: true,
        srid: true,
      },
    });

    if (!so) {
      return NextResponse.json({
        ok: true,
        exists: false,
        error: "Aucune information trouvée.",
      });
    }

    // Parallel lookups (null-safe)
    const [cust, carr, rep, ship] = await Promise.all([
      so.custid ? prisma.customers.findUnique({ where: { custid: so.custid } }) : null,
      so.carrid ? prisma.carriers.findUnique({ where: { carrid: so.carrid } }) : null,
      so.srid   ? prisma.salesrep.findUnique({ where: { srid: so.srid } })       : null,
      prisma.shipmentHdr.findFirst({
        where: { sonbr: so.sonbr },
        orderBy: { id: "desc" },
      }),
    ]);

    // Serialize in the shape your UI expects
    return NextResponse.json({
      ok: true,
      exists: true,
      sonbr: so.sonbr,
      OrderDate: so.orderdate ?? null,                              // keep as Date/ISO
      totalamt: so.totalamt != null ? Number(so.totalamt) : null,   // Decimal -> number
      CustCode: cust?.custcode ?? "",
      CustomerName: cust?.name ?? "",
      CarrierName: carr?.name ?? "",
      SalesrepName: rep?.name ?? "",
      TrackingNumber: ship?.waybill ?? "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json(
      { ok: false, exists: false, error: message },
      { status: 500 }
    );
  }
}
