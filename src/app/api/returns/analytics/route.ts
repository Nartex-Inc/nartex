// src/app/api/returns/analytics/route.ts
// Returns analytics for BI dashboard — counts, breakdowns, YOY trends

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireTenant, normalizeRole, getErrorMessage } from "@/lib/auth-helpers";

// ── Server-side cache (same pattern as dashboard-data) ──────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000;
type CacheEntry = { data: unknown; ts: number };
const queryCache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | null {
  const entry = queryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    queryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown) {
  queryCache.set(key, { data, ts: Date.now() });
  if (queryCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of queryCache) {
      if (now - v.ts > CACHE_TTL_MS) queryCache.delete(k);
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const causeFilter = searchParams.get("cause");
    const expertFilter = searchParams.get("expert");
    const noCache = searchParams.get("noCache") === "1";

    // Expert-scoped access (same as stats route)
    const userName = user.name || "";
    const baseWhere: Prisma.ReturnWhereInput =
      normalizeRole(user.role) === "expert"
        ? { tenantId, expert: { contains: userName, mode: "insensitive" } }
        : { tenantId };

    // Apply optional filters
    const where: Prisma.ReturnWhereInput = { ...baseWhere };
    if (dateFrom || dateTo) {
      where.reportedAt = {};
      if (dateFrom) (where.reportedAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      if (dateTo) (where.reportedAt as Prisma.DateTimeFilter).lte = new Date(dateTo + "T23:59:59.999Z");
    }
    if (causeFilter) {
      where.cause = causeFilter as Prisma.EnumCauseFilter;
    }
    if (expertFilter) {
      where.expert = { contains: expertFilter, mode: "insensitive" };
    }

    // Cache key
    const cacheKey = `returns-analytics:${tenantId}:${dateFrom}:${dateTo}:${causeFilter}:${expertFilter}`;
    if (!noCache) {
      const cached = getCached(cacheKey);
      if (cached !== null) return NextResponse.json(cached);
    }

    // ── Build "previous period" where clause for YOY ──
    const prevWhere: Prisma.ReturnWhereInput = { ...baseWhere };
    if (causeFilter) prevWhere.cause = causeFilter as Prisma.EnumCauseFilter;
    if (expertFilter) prevWhere.expert = { contains: expertFilter, mode: "insensitive" };

    let prevDateFrom: Date | null = null;
    let prevDateTo: Date | null = null;

    if (dateFrom && dateTo) {
      prevDateFrom = new Date(dateFrom);
      prevDateFrom.setFullYear(prevDateFrom.getFullYear() - 1);
      prevDateTo = new Date(dateTo + "T23:59:59.999Z");
      prevDateTo.setFullYear(prevDateTo.getFullYear() - 1);
      prevWhere.reportedAt = { gte: prevDateFrom, lte: prevDateTo };
    } else {
      // Default: last 12 months current, 12-24 months previous
      const now = new Date();
      const twelveAgo = new Date(now);
      twelveAgo.setMonth(twelveAgo.getMonth() - 12);
      const twentyFourAgo = new Date(now);
      twentyFourAgo.setMonth(twentyFourAgo.getMonth() - 24);

      where.reportedAt = where.reportedAt || { gte: twelveAgo };
      prevWhere.reportedAt = { gte: twentyFourAgo, lt: twelveAgo };
    }

    // ── Parallel queries ──
    const [
      total,
      drafts,
      active,
      finalized,
      standby,
      verified,
      byCauseRaw,
      byExpertRaw,
      topItemsRaw,
      currentReturns,
      previousReturns,
      expertsRaw,
    ] = await Promise.all([
      // 1. Counts
      prisma.return.count({ where }),
      prisma.return.count({ where: { ...where, isDraft: true } }),
      prisma.return.count({ where: { ...where, isDraft: false, isFinal: false, isStandby: false } }),
      prisma.return.count({ where: { ...where, isFinal: true } }),
      prisma.return.count({ where: { ...where, isStandby: true } }),
      prisma.return.count({ where: { ...where, isVerified: true } }),

      // 2. By cause
      prisma.return.groupBy({
        by: ["cause"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // 3. By expert
      prisma.return.groupBy({
        by: ["expert"],
        where: { ...where, expert: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 15,
      }),

      // 4. Top 10 items by # of distinct returns
      prisma.$queryRaw<{ codeProduit: string; count: number }[]>`
        SELECT rp."codeProduit", COUNT(DISTINCT rp."returnId")::int AS count
        FROM "ReturnProduct" rp
        JOIN "Return" r ON rp."returnId" = r.id
        WHERE r."tenant_id" = ${tenantId}
          ${dateFrom ? Prisma.sql`AND r."reportedAt" >= ${new Date(dateFrom)}` : Prisma.empty}
          ${dateTo ? Prisma.sql`AND r."reportedAt" <= ${new Date(dateTo + "T23:59:59.999Z")}` : Prisma.empty}
          ${causeFilter ? Prisma.sql`AND r."cause"::text = ${causeFilter}` : Prisma.empty}
          ${expertFilter ? Prisma.sql`AND r."expert" ILIKE ${"%" + expertFilter + "%"}` : Prisma.empty}
        GROUP BY rp."codeProduit"
        ORDER BY count DESC
        LIMIT 10
      `,

      // 5. Current period returns for monthly aggregation
      prisma.return.findMany({
        where,
        select: { reportedAt: true },
      }),

      // 6. Previous period returns for monthly aggregation
      prisma.return.findMany({
        where: prevWhere,
        select: { reportedAt: true },
      }),

      // 7. Distinct expert names for filter dropdown
      prisma.return.findMany({
        where: baseWhere,
        distinct: ["expert"],
        select: { expert: true },
        orderBy: { expert: "asc" },
      }),
    ]);

    // ── Aggregate by month (YOY) ──
    const currentByMonth: Record<string, number> = {};
    for (const r of currentReturns) {
      const key = r.reportedAt.toISOString().slice(0, 7);
      currentByMonth[key] = (currentByMonth[key] || 0) + 1;
    }

    const previousByMonth: Record<string, number> = {};
    for (const r of previousReturns) {
      // Shift previous year month +1 year to align with current period
      const d = new Date(r.reportedAt);
      d.setFullYear(d.getFullYear() + 1);
      const key = d.toISOString().slice(0, 7);
      previousByMonth[key] = (previousByMonth[key] || 0) + 1;
    }

    // Merge into sorted array
    const allMonths = new Set([...Object.keys(currentByMonth), ...Object.keys(previousByMonth)]);
    const byMonth = Array.from(allMonths)
      .sort()
      .map((month) => ({
        month,
        current: currentByMonth[month] || 0,
        previous: previousByMonth[month] || 0,
      }));

    const result = {
      counts: { total, drafts, active, finalized, standby, verified },
      byCause: byCauseRaw.map((c) => ({ name: c.cause, count: c._count.id })),
      byExpert: byExpertRaw.map((e) => ({ name: e.expert || "Inconnu", count: e._count.id })),
      topItems: topItemsRaw.map((i) => ({ name: i.codeProduit, count: Number(i.count) })),
      byMonth,
      experts: expertsRaw
        .map((e) => e.expert)
        .filter((e): e is string => e !== null),
    };

    setCache(cacheKey, result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/returns/analytics error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des analytiques", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
