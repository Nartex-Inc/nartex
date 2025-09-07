// src/app/api/prextra/order/route.ts
// GET /api/prextra/order?no_commande=12345
// Returns minimal SO header + joined details to auto-fill the return form.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("no_commande") ?? "";
    const parsed = decodeURIComponent(raw).trim();
    const sonbr = Number(parsed);

    // Validate query param
    if (!Number.isFinite(sonbr) || !Number.isInteger(sonbr)) {
      return NextResponse.json(
        { ok: false, exists: false, error: "Missing or invalid 'no_commande'." },
        { status: 400 },
      );
    }

    // sonbr may exist across companies: pick the one with highest cieid
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

    // Parallel lookups (all null-safe)
    const [cust, carr, rep, ship] = await Promise.all([
      so.custid ? prisma.customers.findUnique({ where: { custid: so.custid } }) : null,
      so.carrid ? prisma.carriers.findUnique({ where: { carrid: so.carrid } }) : null,
      so.srid ? prisma.salesrep.findUnique({ where: { srid: so.srid } }) : null,
      // Use shipmentid for ordering; also filter by cieid so we don't mix companies
      prisma.shipmentHdr.findFirst({
        where: { sonbr: so.sonbr, cieid: so.cieid },
        orderBy: { shipmentid: "desc" },
        select: { waybill: true },
      }),
    ]);

    // Serialize to what the UI expects
    return NextResponse.json({
      ok: true,
      exists: true,
      sonbr: so.sonbr,
      // Dates become ISO strings in JSON automatically
      OrderDate: so.orderdate ?? null,
      // Prisma Decimal -> number (or null)
      totalamt: so.totalamt != null ? Number(so.totalamt) : null,
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
      { status: 500 },
    );
  }
}
