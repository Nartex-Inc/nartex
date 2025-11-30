// src/app/api/returns/stats/route.ts
// Dashboard statistics - GET

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import type { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    const userName = session.user.name || "";

    // Build expert filter for role-based access
    const expertFilter: Prisma.ReturnWhereInput = userRole === "Expert"
      ? { expert: { contains: userName, mode: "insensitive" } }
      : {};

    // Total active returns (not finalized, not draft)
    const totalActive = await prisma.return.count({
      where: { isFinal: false, isDraft: false, ...expertFilter },
    });

    // Awaiting physical verification
    const awaitingPhysical = await prisma.return.count({
      where: {
        isFinal: false,
        retourPhysique: true,
        isVerified: false,
        ...expertFilter,
      },
    });

    // Ready for finalization
    const readyForFinalization = await prisma.return.count({
      where: {
        isFinal: false,
        isDraft: false,
        OR: [{ retourPhysique: false }, { isVerified: true }],
        ...expertFilter,
      },
    });

    // Drafts
    const drafts = await prisma.return.count({
      where: { isDraft: true, isFinal: false, ...expertFilter },
    });

    // Finalized (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const finalized = await prisma.return.count({
      where: {
        isFinal: true,
        dateFinalisation: { gte: thirtyDaysAgo },
        ...expertFilter,
      },
    });

    // Standby
    const standby = await prisma.return.count({
      where: { isStandby: true, ...expertFilter },
    });

    // By cause (for chart) - using raw query for grouping
    const byCauseRaw = await prisma.return.groupBy({
      by: ["cause"],
      where: { isFinal: false, ...expertFilter },
      _count: true,
    });

    const byCause = byCauseRaw.map((r) => ({
      cause: r.cause,
      count: r._count,
    }));

    // By month (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const returns = await prisma.return.findMany({
      where: {
        reportedAt: { gte: twelveMonthsAgo },
        ...expertFilter,
      },
      select: { reportedAt: true },
    });

    // Group by month
    const monthCounts: Record<string, number> = {};
    for (const r of returns) {
      const month = r.reportedAt.toISOString().slice(0, 7); // YYYY-MM
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    }

    const byMonth = Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      ok: true,
      stats: {
        totalActive,
        awaitingPhysical,
        readyForFinalization,
        drafts,
        finalized,
        standby,
        byCause,
        byMonth,
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
