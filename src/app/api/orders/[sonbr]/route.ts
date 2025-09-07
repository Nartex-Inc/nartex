// ✅ Next 15 route: fetch order + joined details for autofill
//    GET /api/orders/:sonbr
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Keep the context loose to satisfy Next runtime validator across versions
type Context = any;

export async function GET(_req: Request, context: Context) {
  try {
    const raw = (context?.params?.sonbr ?? "") as string;

    // sonbr is INT in your DB → coerce & validate
    const parsed = decodeURIComponent(String(raw)).trim();
    const sonbr = Number(parsed);

    if (!Number.isFinite(sonbr) || !Number.isInteger(sonbr)) {
      return NextResponse.json(
        { ok: false, exists: false, error: "Missing or invalid order number." },
        { status: 400 }
      );
    }

    // If sonbr is not UNIQUE in your DB, use findFirst (safe)
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

    // Parallel lookups
    const [cust, carr, rep, ship] = await Promise.all([
      so.custid ? prisma.customers.findUnique({ where: { custid: so.custid } }) : null,
      so.carrid ? prisma.carriers.findUnique({ where: { carrid: so.carrid } }) : null,
      so.srid   ? prisma.salesrep.findUnique({ where: { srid: so.srid } }) : null,
      prisma.shipmentHdr.findFirst({
        where: { sonbr: so.sonbr },
        orderBy: { id: "desc" },
      }),
    ]);

    // JSON-safe serialization
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
