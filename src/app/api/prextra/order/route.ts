// src/app/api/prextra/order/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const noCommande = searchParams.get("no_commande");

    if (!noCommande) {
      return NextResponse.json({ exists: false, error: "Numéro de commande requis" }, { status: 400 });
    }

    const sonbr = parseInt(noCommande, 10);
    if (isNaN(sonbr)) {
      return NextResponse.json({ exists: false, error: "Numéro de commande invalide" }, { status: 400 });
    }

    // 1. Fetch Order Header
    // Prisma will automatically handle the "SRId" casing via the @map in your schema
    const order = await prisma.sOHeader.findFirst({
      where: { sonbr: sonbr },
    });

    if (!order) {
      return NextResponse.json({ exists: false, error: "Commande introuvable" }, { status: 404 });
    }

    // 2. Fetch related details in parallel
    // We use separate queries because relations aren't strictly defined in the schema
    const [customer, carrier, salesrep, shipment] = await Promise.all([
      // Fetch Customer
      order.custid
        ? prisma.customers.findUnique({ where: { custid: order.custid } })
        : null,
      
      // Fetch Carrier
      order.carrid
        ? prisma.carriers.findUnique({ where: { carrid: order.carrid } })
        : null,
      
      // Fetch Sales Rep (This fixes your SRId error)
      order.srid
        ? prisma.salesrep.findUnique({ where: { srid: order.srid } })
        : null,

      // Fetch Tracking (Waybill) from Shipment Header
      prisma.shipmentHdr.findFirst({
        where: { sonbr: sonbr },
        select: { waybill: true },
      }),
    ]);

    // 3. Construct response matching your frontend expectation
    const data = {
      exists: true,
      sonbr: order.sonbr,
      orderDate: order.orderdate,
      totalamt: order.totalamt ? Number(order.totalamt) : null,
      
      // Mapped fields
      customerName: customer?.name || null,
      custCode: customer?.custcode || null,
      noClient: customer?.custcode || null, // Included for compatibility
      
      carrierName: carrier?.name || null,
      salesrepName: salesrep?.name || null,
      
      tracking: shipment?.waybill || null,
    };

    return NextResponse.json(data);

  } catch (error) {
    console.error("GET /api/prextra/order error:", error);
    // Return a clean error so the frontend doesn't crash
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la recherche de la commande" },
      { status: 500 }
    );
  }
}
