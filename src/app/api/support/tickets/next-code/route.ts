// src/app/api/support/tickets/next-code/route.ts
// Generate the next ticket code

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    // Generate ticket code: TI-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `TI-${dateStr}-`;

    // Count existing tickets for today
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const todayCount = await prisma.supportTicket.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const sequenceNumber = (todayCount + 1).toString().padStart(4, "0");
    const nextCode = `${prefix}${sequenceNumber}`;

    return NextResponse.json({
      ok: true,
      data: {
        nextCode,
        todayCount,
      },
    });
  } catch (error) {
    console.error("GET /api/support/tickets/next-code error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la récupération du prochain code" },
      { status: 500 }
    );
  }
}
