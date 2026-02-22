// src/app/api/returns/analytics/route.ts
// Returns analytics for BI dashboard — counts, breakdowns, YOY trends
//
// NOTE: The "cause" column is stored as text in PostgreSQL, not as a Prisma enum.
// Prisma's typed where clause casts to "Cause" enum which fails. So we fetch
// returns without the cause filter and apply it in JS post-processing.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireTenant, normalizeRole, getErrorMessage } from "@/lib/auth-helpers";

// ── Server-side cache ───────────────────────────────────────────────────────
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

    // Cache key
    const cacheKey = `analytics:${tenantId}:${dateFrom}:${dateTo}:${causeFilter}:${expertFilter}`;
    if (!noCache) {
      const cached = getCached(cacheKey);
      if (cached !== null) return NextResponse.json(cached);
    }

    // Expert-scoped access
    const userName = user.name || "";
    const baseWhere: Prisma.ReturnWhereInput =
      normalizeRole(user.role) === "expert"
        ? { tenantId, expert: { contains: userName, mode: "insensitive" } }
        : { tenantId };

    // Build where clause (date + expert only — cause is filtered in JS)
    const where: Prisma.ReturnWhereInput = { ...baseWhere };
    if (dateFrom || dateTo) {
      where.reportedAt = {};
      if (dateFrom) (where.reportedAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      if (dateTo) (where.reportedAt as Prisma.DateTimeFilter).lte = new Date(dateTo + "T23:59:59.999Z");
    }
    if (expertFilter) {
      where.expert = { contains: expertFilter, mode: "insensitive" };
    }

    // Previous period where (for YOY)
    const prevWhere: Prisma.ReturnWhereInput = { ...baseWhere };
    if (expertFilter) prevWhere.expert = { contains: expertFilter, mode: "insensitive" };

    if (dateFrom && dateTo) {
      const prevDateFrom = new Date(dateFrom);
      prevDateFrom.setFullYear(prevDateFrom.getFullYear() - 1);
      const prevDateTo = new Date(dateTo + "T23:59:59.999Z");
      prevDateTo.setFullYear(prevDateTo.getFullYear() - 1);
      prevWhere.reportedAt = { gte: prevDateFrom, lte: prevDateTo };
    } else {
      const now = new Date();
      const twelveAgo = new Date(now);
      twelveAgo.setMonth(twelveAgo.getMonth() - 12);
      const twentyFourAgo = new Date(now);
      twentyFourAgo.setMonth(twentyFourAgo.getMonth() - 24);
      where.reportedAt = where.reportedAt || { gte: twelveAgo };
      prevWhere.reportedAt = { gte: twentyFourAgo, lt: twelveAgo };
    }

    // ── Fetch all data in parallel ──
    const [currentRaw, previousRaw, topItemsRaw, expertsRaw] = await Promise.all([
      // All returns in current period (with fields needed for counts + aggregation)
      prisma.return.findMany({
        where,
        select: {
          cause: true,
          expert: true,
          isDraft: true,
          isFinal: true,
          isStandby: true,
          isVerified: true,
          reportedAt: true,
        },
      }),

      // Previous period returns (for YOY)
      prisma.return.findMany({
        where: prevWhere,
        select: { cause: true, reportedAt: true },
      }),

      // Top 10 items (raw SQL handles cause::text cast properly)
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

      // Distinct expert names for filter dropdown (unfiltered)
      prisma.return.findMany({
        where: baseWhere,
        distinct: ["expert"],
        select: { expert: true },
        orderBy: { expert: "asc" },
      }),
    ]);

    // ── Apply cause filter in JS (avoids text vs enum type mismatch) ──
    const current = causeFilter
      ? currentRaw.filter((r) => r.cause === causeFilter)
      : currentRaw;

    const previous = causeFilter
      ? previousRaw.filter((r) => r.cause === causeFilter)
      : previousRaw;

    // ── Compute counts ──
    const total = current.length;
    const drafts = current.filter((r) => r.isDraft).length;
    const active = current.filter((r) => !r.isDraft && !r.isFinal && !r.isStandby).length;
    const finalized = current.filter((r) => r.isFinal).length;
    const standby = current.filter((r) => r.isStandby).length;
    const verified = current.filter((r) => r.isVerified).length;

    // ── Group by cause ──
    const causeMap = new Map<string, number>();
    for (const r of current) {
      if (r.cause) causeMap.set(r.cause, (causeMap.get(r.cause) || 0) + 1);
    }
    const byCause = Array.from(causeMap, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // ── Group by expert ──
    const expertMap = new Map<string, number>();
    for (const r of current) {
      if (r.expert) expertMap.set(r.expert, (expertMap.get(r.expert) || 0) + 1);
    }
    const byExpert = Array.from(expertMap, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // ── Aggregate by month (YOY) ──
    const currentByMonth: Record<string, number> = {};
    for (const r of current) {
      const key = r.reportedAt.toISOString().slice(0, 7);
      currentByMonth[key] = (currentByMonth[key] || 0) + 1;
    }

    const previousByMonth: Record<string, number> = {};
    for (const r of previous) {
      const d = new Date(r.reportedAt);
      d.setFullYear(d.getFullYear() + 1);
      const key = d.toISOString().slice(0, 7);
      previousByMonth[key] = (previousByMonth[key] || 0) + 1;
    }

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
      byCause,
      byExpert,
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
