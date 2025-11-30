// src/app/api/returns/stats/route.ts
// Dashboard statistics - GET
// PostgreSQL version

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    const userName = session.user.name || "";

    // Build expert filter for role-based access
    let expertFilter = "";
    const params: unknown[] = [];

    if (userRole === "Expert") {
      expertFilter = "AND expert ILIKE $1";
      params.push(`%${userName}%`);
    }

    // Total active returns (not finalized, not draft)
    const totalActiveResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM returns WHERE is_final = false AND is_draft = false ${expertFilter}`,
      params
    );
    const totalActive = parseInt(totalActiveResult[0]?.count || "0", 10);

    // Awaiting physical verification
    const awaitingPhysicalResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM returns 
       WHERE is_final = false AND retour_physique = true AND is_verified = false ${expertFilter}`,
      params
    );
    const awaitingPhysical = parseInt(awaitingPhysicalResult[0]?.count || "0", 10);

    // Ready for finalization (verified or no physical return needed)
    const readyForFinalizationResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM returns 
       WHERE is_final = false AND is_draft = false 
       AND (retour_physique = false OR is_verified = true) ${expertFilter}`,
      params
    );
    const readyForFinalization = parseInt(readyForFinalizationResult[0]?.count || "0", 10);

    // Drafts
    const draftsResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM returns WHERE is_draft = true AND is_final = false ${expertFilter}`,
      params
    );
    const drafts = parseInt(draftsResult[0]?.count || "0", 10);

    // Finalized (last 30 days)
    const finalizedResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM returns 
       WHERE is_final = true AND date_finalisation >= NOW() - INTERVAL '30 days' ${expertFilter}`,
      params
    );
    const finalized = parseInt(finalizedResult[0]?.count || "0", 10);

    // Standby returns
    const standbyResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM returns WHERE is_standby = true ${expertFilter}`,
      params
    );
    const standby = parseInt(standbyResult[0]?.count || "0", 10);

    // By cause (for chart)
    const byCauseResult = await query<{ cause_retour: string; count: string }>(
      `SELECT cause_retour, COUNT(*) as count FROM returns 
       WHERE is_final = false ${expertFilter}
       GROUP BY cause_retour ORDER BY count DESC`,
      params
    );
    const byCause = byCauseResult.map((r) => ({
      cause: r.cause_retour,
      count: parseInt(r.count, 10),
    }));

    // By month (last 12 months)
    const byMonthResult = await query<{ month: string; count: string }>(
      `SELECT TO_CHAR(date_signalement, 'YYYY-MM') as month, COUNT(*) as count 
       FROM returns 
       WHERE date_signalement >= NOW() - INTERVAL '12 months' ${expertFilter}
       GROUP BY TO_CHAR(date_signalement, 'YYYY-MM')
       ORDER BY month ASC`,
      params
    );
    const byMonth = byMonthResult.map((r) => ({
      month: r.month,
      count: parseInt(r.count, 10),
    }));

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
