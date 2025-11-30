// src/app/api/prextra/order/route.ts
// Order lookup by no_commande - GET

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { lookupOrder } from "@/lib/prextra";
import type { OrderLookup } from "@/types/returns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const noCommande = searchParams.get("no_commande");

    if (!noCommande) {
      return NextResponse.json(
        { ok: false, error: "Numéro de commande requis" },
        { status: 400 }
      );
    }

    const result = await lookupOrder(noCommande);

    if (!result) {
      return NextResponse.json({
        ok: true,
        exists: false,
        order: null,
      });
    }

    const order: OrderLookup = {
      sonbr: result.sonbr,
      orderDate: result.OrderDate?.toISOString() || null,
      totalamt: result.totalamt,
      customerName: result.customerName,
      custCode: result.custCode,
      noClient: result.custCode,
      carrierName: result.carrierName,
      salesrepName: result.salesrepName,
      tracking: result.tracking,
    };

    return NextResponse.json({
      ok: true,
      exists: true,
      order,
    });
  } catch (error) {
    console.error("GET /api/prextra/order error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la recherche de la commande" },
      { status: 500 }
    );
  }
}
