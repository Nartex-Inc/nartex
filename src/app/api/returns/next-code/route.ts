// src/app/api/returns/next-code/route.ts
// Get next available return code - GET

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatReturnCode } from "@/types/returns";
import { requireTenant } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;

    // Get max ID
    const maxReturn = await prisma.return.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });

    const nextCode = (maxReturn?.id || 0) + 1;

    return NextResponse.json({
      ok: true,
      data: {
        nextCode,
        formatted: formatReturnCode(nextCode),
      },
    });
  } catch (error) {
    console.error("GET /api/returns/next-code error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la récupération du prochain code" },
      { status: 500 }
    );
  }
}
