// ✅ Next 15–safe route: fetch order + joined details for autofill
//    GET /api/orders/:sonbr
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Context = any; // keep loose to satisfy Next's runtime validator across versions

export async function GET(_req: Request, context: Context) {
  try {
    const sonbrRaw = (context?.params?.sonbr ?? "") as string;
    const sonbr = decodeURIComponent(sonbrRaw).trim();

    if (!sonbr) {
      return NextResponse.json(
        { ok: false, exists: false, error: "Missing order number." },
        { status: 400 }
      );
    }

    // 1) header (minimal columns we need for follow-ups)
    const so = await prisma.sOHeader.findUnique({
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
      // Same shape as your legacy script when nothing is found
      return NextResponse.json({
        ok: true,
        exists: false,
        error: "Aucune information trouvée.",
      });
    }

    // 2) parallel lookups (null-safe)
    const [cust, carr, rep, ship] = await Promise.all([
      so.custid ? prisma.customers.findUnique({ where: { custid: so.custid } }) : null,
      so.carrid ? prisma.carriers.findUnique({ where: { carrid: so.carrid } }) : null,
      so.srid   ? prisma.salesrep.findUnique({ where: { srid: so.srid } }) : null,
      prisma.shipmentHdr.findFirst({ where: { sonbr: so.sonbr }, orderBy: { id: "desc" } }),
    ]);

    // 3) serialize to your front-end’s expected keys
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
    // Never leak raw errors; always return JSON so the UI can .json() safely
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json(
      { ok: false, exists: false, error: message },
      { status: 500 }
    );
  }
}
