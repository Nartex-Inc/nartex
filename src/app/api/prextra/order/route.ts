// src/app/api/prextra/order/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";
import { getPrextraTables } from "@/lib/prextra";

/**
 * GET /api/prextra/order?no_commande=XXXXX
 * Looks up order details by SO number from the Prextra database
 */
export async function GET(request: NextRequest) {
  try {
    // 1) Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { exists: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const schema = session.user.prextraSchema;
    if (!schema) {
      return NextResponse.json(
        { exists: false, error: "Aucune donnée ERP pour ce tenant" },
        { status: 403 }
      );
    }

    // 2) Get query param
    const { searchParams } = new URL(request.url);
    const noCommande = searchParams.get("no_commande")?.trim();

    if (!noCommande) {
      return NextResponse.json(
        { exists: false, error: "Numéro de commande requis" },
        { status: 400 }
      );
    }

    // Parse as integer (SO numbers are numeric)
    const sonbr = parseInt(noCommande, 10);
    if (isNaN(sonbr)) {
      return NextResponse.json(
        { exists: false, error: "Numéro de commande invalide" },
        { status: 400 }
      );
    }

    // 3) Query the database for order info using raw SQL
    const T = getPrextraTables(schema);
    const query = `
      SELECT
        h."sonbr" as "sonbr",
        h."OrderDate" as "orderDate",
        h."totalamt" as "totalamt",
        c."Name" as "customerName",
        c."CustCode" as "custCode",
        cr."name" as "carrierName",
        sr."Name" as "salesrepName",
        sh."WayBill" as "tracking"
      FROM ${T.SO_HEADER} h
      LEFT JOIN ${T.CUSTOMERS} c ON h."custid" = c."CustId"
      LEFT JOIN ${T.CARRIERS} cr ON h."Carrid" = cr."carrid"
      LEFT JOIN ${T.SALESREP} sr ON h."SRId" = sr."SRId"
      LEFT JOIN ${T.SHIPMENT_HDR} sh ON h."sonbr" = sh."sonbr"
      WHERE h."sonbr" = $1
      LIMIT 1
    `;

    const { rows } = await pg.query(query, [sonbr]);

    if (rows.length === 0) {
      return NextResponse.json({ exists: false });
    }

    const order = rows[0];

    return NextResponse.json({
      exists: true,
      sonbr: order.sonbr,
      orderDate: order.orderDate,
      totalamt: order.totalamt ? Number(order.totalamt) : null,
      customerName: order.customerName || null,
      custCode: order.custCode || null,
      noClient: order.custCode || null,
      carrierName: order.carrierName || null,
      salesrepName: order.salesrepName || null,
      tracking: order.tracking || null,
    });
  } catch (error: any) {
    console.error("GET /api/prextra/order error:", error);
    return NextResponse.json(
      {
        exists: false,
        error: "Erreur lors de la recherche de la commande",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
