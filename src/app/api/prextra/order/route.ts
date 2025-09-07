// GET /api/prextra/order?no_commande=XXXX

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("no_commande");

    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "Missing query param 'no_commande'." },
        { status: 400 }
      );
    }

    // sonbr is an INT in the DB -> coerce and validate
    const sonbr = Number(decodeURIComponent(raw).trim());
    if (!Number.isFinite(sonbr)) {
      return NextResponse.json(
        { ok: false, error: "Query param 'no_commande' must be a number." },
        { status: 400 }
      );
    }

    // Use findFirst because sonbr is not unique (composite PK on the table)
    const so = await prisma.sOHeader.findFirst({
      where: { sonbr },
      select: {
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
      so.srid ? prisma.salesrep.findUnique({ where: { srid: so.srid } }) : null,
      prisma.shipmentHdr.findFirst({ where: { sonbr: so.sonbr }, orderBy: { id: "desc" } }),
    ]);

    return NextResponse.json({
      ok: true,
      exists: true,
      sonbr: so.sonbr,
      // You can new Date(OrderDate) on the client
      OrderDate: so.orderdate,
      totalamt: so.totalamt,
      CustCode: cust?.custcode ?? "",
      CustomerName: cust?.name ?? "",
      CarrierName: carr?.name ?? "",
      SalesrepName: rep?.name ?? "",
      TrackingNumber: ship?.waybill ?? "",
    });
  } catch (err: any) {
    console.error("GET /api/prextra/order failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
