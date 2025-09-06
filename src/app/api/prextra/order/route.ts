// GET /api/prextra/order?no_commande=XXXX
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("no_commande");
  const sonbr = raw ? decodeURIComponent(raw).trim() : "";

  if (!sonbr) {
    return NextResponse.json(
      { ok: false, error: "Missing query param 'no_commande'." },
      { status: 400 }
    );
  }

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
    OrderDate: so.orderdate,         // client can do new Date(OrderDate)
    totalamt: so.totalamt,
    CustCode: cust?.custcode ?? "",
    CustomerName: cust?.name ?? "",
    CarrierName: carr?.name ?? "",
    SalesrepName: rep?.name ?? "",
    TrackingNumber: ship?.waybill ?? "",
  });
}
