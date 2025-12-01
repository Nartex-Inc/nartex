// src/app/api/returns/stats/route.ts
// Returns statistics - GET

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    const userName = session.user.name || "";

    // Expert filter
    const expertFilter: Prisma.ReturnWhereInput = userRole === "Expert"
      ? { expert: { contains: userName, mode: "insensitive" } }
      : {};

    // Get counts
    const [
      totalActive,
      awaitingPhysical,
      readyForFinalization,
      drafts,
      finalized,
      standby,
    ] = await Promise.all([
      // Total active (not finalized or in standby)
      prisma.return.count({
        where: { ...expertFilter, isFinal: false },
      }),
      // Awaiting physical verification
      prisma.return.count({
        where: { ...expertFilter, returnPhysical: true, isVerified: false, isFinal: false, isDraft: false },
      }),
      // Ready for finalization
      prisma.return.count({
        where: {
          ...expertFilter,
          isDraft: false,
          isFinal: false,
          OR: [
            { returnPhysical: false },
            { returnPhysical: true, isVerified: true },
          ],
        },
      }),
      // Drafts
      prisma.return.count({
        where: { ...expertFilter, isDraft: true, isFinal: false },
      }),
      // Finalized in last 30 days
      prisma.return.count({
        where: {
          ...expertFilter,
          isFinal: true,
          isStandby: false,
          finalizedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      // Standby
      prisma.return.count({
        where: { ...expertFilter, isStandby: true },
      }),
    ]);

    // Get by cause
    const byCause = await prisma.return.groupBy({
      by: ["cause"],
      where: { ...expertFilter, isFinal: false },
      _count: { id: true },
    });

    // Get by month (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const recentReturns = await prisma.return.findMany({
      where: {
        ...expertFilter,
        reportedAt: { gte: twelveMonthsAgo },
      },
      select: { reportedAt: true },
    });

    // Group by month
    const byMonth: Record<string, number> = {};
    for (const ret of recentReturns) {
      const monthKey = ret.reportedAt.toISOString().slice(0, 7); // "YYYY-MM"
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      data: {
        counts: {
          totalActive,
          awaitingPhysical,
          readyForFinalization,
          drafts,
          finalized,
          standby,
        },
        byCause: byCause.map((c) => ({ cause: c.cause, count: c._count.id })),
        byMonth: Object.entries(byMonth)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      },
    });
  } catch (error) {
    console.error("GET /api/returns/stats error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des statistiques" },
      { status: 500 }
    );
  }
}
