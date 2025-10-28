// src/app/api/prextra/order/route.ts
// GET /api/prextra/order?no_commande=12345
// Returns minimal SO header + joined details to auto-fill the return form.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/** Public type that client code may import as `import type { PrextraOrderResponse } ...` */
export type PrextraOrderResponse =
  | {
      ok: true;
      exists: true;
      sonbr: number;
      OrderDate: string | null;
      totalamt: number | null;
      noClient: string;
      CustCode: string;
      CustomerName: string;
      CarrierName: string;
      SalesrepName: string;
      TrackingNumber: string | null;
    }
  | {
      ok: true;
      exists: false;
      error: string;
    }
  | {
      ok: false;
      exists: false;
      error: string;
    };

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("no_commande") ?? "";
    const parsed = decodeURIComponent(raw).trim();
    const sonbr = Number(parsed);

    // Validate query param
    if (!Number.isFinite(sonbr) || !Number.isInteger(sonbr)) {
      const body: PrextraOrderResponse = {
        ok: false,
        exists: false,
        error: "Missing or invalid 'no_commande'.",
      };
      return NextResponse.json(body, { status: 400 });
    }

    // sonbr may exist across companies: pick the one with highest cieid
    const so = await prisma.sOHeader.findFirst({
      where: { sonbr },
      orderBy: [{ cieid: "desc" }],
      select: {
        cieid: true,
        sonbr: true,
        orderdate: true,
        totalamt: true,
        custid: true,
        carrid: true,
        srid: true,
      },
    });

    if (!so) {
      const body: PrextraOrderResponse = {
        ok: true,
        exists: false,
        error: "Aucune information trouvée.",
      };
      return NextResponse.json(body);
    }

    // Parallel lookups (all null-safe)
    const [cust, carr, rep, ship] = await Promise.all([
      so.custid ? prisma.customers.findUnique({ where: { custid: so.custid } }) : null,
      so.carrid ? prisma.carriers.findUnique({ where: { carrid: so.carrid } }) : null,
      so.srid ? prisma.salesrep.findUnique({ where: { srid: so.srid } }) : null,
      // Filter by cieid; order by Id (Prisma field: id)
      prisma.shipmentHdr.findFirst({
        where: { sonbr: so.sonbr, cieid: so.cieid },
        orderBy: { id: "desc" },
        select: { waybill: true },
      }),
    ]);

    const body: PrextraOrderResponse = {
      ok: true,
      exists: true,
      sonbr: so.sonbr,
      OrderDate: so.orderdate ?? null, // Dates -> ISO in JSON
      totalamt: so.totalamt != null ? Number(so.totalamt) : null, // Decimal -> number
      // Provide both for maximum compatibility:
      noClient: cust?.custcode ?? "",
      CustCode: cust?.custcode ?? "",
      CustomerName: cust?.name ?? "",
      CarrierName: carr?.name ?? "",
      SalesrepName: rep?.name ?? "",
      TrackingNumber: ship?.waybill ?? "",
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    const body: PrextraOrderResponse = { ok: false, exists: false, error: message };
    return NextResponse.json(body, { status: 500 });
  }
}

/**
 * Ensure this file remains a module even if the handler is tree-shaken during type-checking.
 * This also allows harmless default imports from legacy code without changing behavior.
 */
// eslint-disable-next-line import/no-default-export
export default {};
