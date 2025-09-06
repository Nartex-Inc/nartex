import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Keep the context untyped to satisfy Next's validator across versions.
export async function GET(_req: Request, context: any) {
  const { sonbr } = context.params as { sonbr: string };
  const so = await prisma.sOHeader.findUnique({
    where: { sonbr: decodeURIComponent(sonbr) },
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
    OrderDate: so.orderdate,
    totalamt: so.totalamt,
    CustCode: cust?.custcode ?? "",
    CustomerName: cust?.name ?? "",
    CarrierName: carr?.name ?? "",
    SalesrepName: rep?.name ?? "",
    TrackingNumber: ship?.waybill ?? "",
  });
}
