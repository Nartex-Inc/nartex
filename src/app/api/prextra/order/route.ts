// src/app/api/prextra/order/route.ts
// Order lookup by no_commande - GET
// PostgreSQL version - queries replicated Prextra tables

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, PREXTRA_TABLES } from "@/lib/db";
import { OrderLookup } from "@/types/returns";

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

    // Query replicated Prextra tables with JOINs
    // Note: Column names may be case-sensitive in PostgreSQL when using double quotes
    const result = await query<{
      sonbr: string;
      OrderDate: Date | null;
      totalamt: number | null;
      customerName: string | null;
      custCode: string | null;
      carrierName: string | null;
      salesrepName: string | null;
      tracking: string | null;
    }>(
      `SELECT 
        so."sonbr",
        so."OrderDate",
        so."totalamt",
        c."Name" AS "customerName",
        c."CustCode" AS "custCode",
        ca."name" AS "carrierName",
        sr."Name" AS "salesrepName",
        sh."WayBill" AS "tracking"
       FROM ${PREXTRA_TABLES.SO_HEADER} so
       LEFT JOIN ${PREXTRA_TABLES.CUSTOMERS} c ON so."custid" = c."CustId"
       LEFT JOIN ${PREXTRA_TABLES.CARRIERS} ca ON so."Carrid" = ca."carrid"
       LEFT JOIN ${PREXTRA_TABLES.SALESREP} sr ON so."SRid" = sr."SRId"
       LEFT JOIN ${PREXTRA_TABLES.SHIPMENT_HDR} sh ON so."sonbr" = sh."sonbr"
       WHERE so."sonbr" = $1
       LIMIT 1`,
      [noCommande]
    );

    if (result.length === 0) {
      return NextResponse.json({
        ok: true,
        exists: false,
        order: null,
      });
    }

    const row = result[0];

    const order: OrderLookup = {
      sonbr: row.sonbr,
      orderDate: row.OrderDate ? new Date(row.OrderDate).toISOString() : null,
      totalamt: row.totalamt,
      customerName: row.customerName,
      custCode: row.custCode,
      noClient: row.custCode,
      carrierName: row.carrierName,
      salesrepName: row.salesrepName,
      tracking: row.tracking,
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
