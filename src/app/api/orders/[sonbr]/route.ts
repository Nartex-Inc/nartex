// ✅ Next 15–safe route: fetch order + joined details for autofill
//    GET /api/orders/:sonbr
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Context = any; // keep loose to satisfy Next's runtime validator across versions

export async function GET(_req: Request, context: Context) {
  try {
    const sonbrRaw = (context?.params?.sonbr ?? "") as string;
    const parsed = Number(decodeURIComponent(sonbrRaw).trim());

    if (!Number.isFinite(parsed)) {
      return NextResponse.json(
        { ok: false, exists: false, error: "Missing or invalid order number." },
        { status: 400 }
      );
    }

    // sonbr is NOT unique -> use findFirst
    const so = await prisma.sOHeader.findFirst({
      where: { sonbr: parsed },
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
      // Keep as Date; the client can new Date(OrderDate)
      OrderDate: so.orderdate,
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
