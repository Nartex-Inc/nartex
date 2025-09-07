// src/app/api/orders/[sonbr]/route.ts
// ✅ Next 15 route: fetch order + joined details for autofill
//    GET /api/orders/:sonbr

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Keep context loose to satisfy Next runtime validator across versions
type Context = { params?: { sonbr?: string } };

export async function GET(_req: Request, context: Context) {
  try {
    const raw = context?.params?.sonbr ?? "";
    const sonbr = Number(decodeURIComponent(raw).trim());

    if (!Number.isFinite(sonbr) || !Number.isInteger(sonbr)) {
      return NextResponse.json(
        { ok: false, exists: false, error: "Missing or invalid order number." },
        { status: 400 }
      );
    }

    // sonbr can exist in multiple companies; prefer the latest cieid
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

    const [cust, carr, rep, ship] = await Promise.all([
      so.custid ? prisma.customers.findUnique({ where: { custid: so.custid } }) : null,
      so.carrid ? prisma.carriers.findUnique({ where: { carrid: so.carrid } }) : null,
      so.srid   ? prisma.salesrep.findUnique({ where: { srid: so.srid } })       : null,
      // ⬇️ FIX: order by the actual Prisma field on ShipmentHdr
      prisma.shipmentHdr.findFirst({
        where: { sonbr: so.sonbr },
        orderBy: { shipmentid: "desc" },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      exists: true,
      sonbr: so.sonbr,
      OrderDate: so.orderdate ? new Date(so.orderdate).toISOString() : null,
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
      { status: 500 }
    );
  }
}
