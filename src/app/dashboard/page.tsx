// src/app/dashboard/page.tsx
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Calendar, RotateCcw } from "lucide-react";
import { THEME, CHART_COLORS } from "@/lib/theme-tokens";
import { useCurrentAccent } from "@/components/accent-color-provider";
import { currency, percentage, formatNumber } from "@/lib/dashboard-formatters";
import { RETENTION_THRESHOLD, NEW_CUSTOMER_MIN_SPEND, isUserAuthorized } from "@/lib/dashboard-constants";
import { totalsByRep, totalsByRepCustomer, totalsByKey } from "@/lib/dashboard-aggregators";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { SalesRecord, FilterState, PerfRow, YoyFilter } from "@/types/dashboard";
import {
  ErrorState,
  AccessDenied,
  KpiCard,
  AnimatedNumber,
  YOYBadge,
  SegmentedControl,
} from "@/components/dashboard/sales-ui";
import { DashboardCharts } from "./_components/dashboard-charts";
import { DashboardModals } from "./_components/dashboard-modals";

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Dashboard Content
   ═══════════════════════════════════════════════════════════════════════════════ */
const DashboardContent = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const { color: accentColor, muted: accentMuted } = useCurrentAccent();

  const mode = mounted && resolvedTheme === "light" ? "light" : "dark";

  const t = useMemo(() => ({
    ...THEME[mode],
    accent: accentColor,
    accentMuted: accentMuted || (mode === "dark" ? "#1A2A3D" : "#DBEAFE")
  }), [mode, accentColor, accentMuted]);

  const chartColors = useMemo(() => {
    const baseColors = CHART_COLORS[mode];
    return [accentColor, ...baseColors.filter(c => c !== accentColor)];
  }, [mode, accentColor]);

  // Data fetching
  const {
    defaultDateRange,
    activeDateRange,
    setActiveDateRange,
    masterData,
    previousYearData,
    history3yData,
    isLoading,
    error,
    fetchDashboardData,
  } = useDashboardData();

  // State
  const [stagedDateRange, setStagedDateRange] = useState(defaultDateRange);
  const [stagedSelectedRep, setStagedSelectedRep] = useState("");
  const [showYOYComparison, setShowYOYComparison] = useState(true);
  const [filters, setFilters] = useState<FilterState>({ salesReps: [], itemCodes: [], customers: [] });
  const [yoyFilter, setYoyFilter] = useState<YoyFilter>("all");

  // Modal states
  const [showRetentionTable, setShowRetentionTable] = useState(false);
  const [showNewCustomersModal, setShowNewCustomersModal] = useState(false);
  const [showRepGrowthModal, setShowRepGrowthModal] = useState(false);
  const [showCustomerGrowthModal, setShowCustomerGrowthModal] = useState(false);

  // Derived data
  const allSalesReps = useMemo(
    () => (masterData ? Array.from(new Set(masterData.map((d) => d.salesRepName))).sort() : []),
    [masterData]
  );

  const yoyClassSets = useMemo(() => {
    const currentTotals = totalsByRep(masterData ?? []);
    const prevTotals = totalsByRep(previousYearData ?? []);
    const growth = new Set<string>();
    const loss = new Set<string>();
    const reps = new Set([...Object.keys(currentTotals), ...Object.keys(prevTotals)]);
    for (const rep of reps) {
      const prev = prevTotals[rep] || 0;
      const curr = currentTotals[rep] || 0;
      if (prev <= 0) continue;
      if (curr > prev) growth.add(rep);
      else if (curr < prev) loss.add(rep);
    }
    return { growth, loss };
  }, [masterData, previousYearData]);

  // Filtering
  const recordPassesBasicFilters = useCallback(
    (d: SalesRecord) => {
      const repSelected = filters.salesReps.length === 0 || filters.salesReps.includes(d.salesRepName);
      const itemSelected = filters.itemCodes.length === 0 || filters.itemCodes.includes(d.itemCode);
      const customerSelected = filters.customers.length === 0 || filters.customers.includes(d.customerName);
      return repSelected && itemSelected && customerSelected;
    },
    [filters]
  );

  const filteredData = useMemo(() => {
    if (!masterData) return [];
    return masterData.filter((d) => {
      if (!recordPassesBasicFilters(d)) return false;
      if (filters.salesReps.length === 0) {
        if (yoyFilter === "growth") return yoyClassSets.growth.has(d.salesRepName);
        if (yoyFilter === "loss") return yoyClassSets.loss.has(d.salesRepName);
      }
      return true;
    });
  }, [masterData, filters, yoyFilter, yoyClassSets, recordPassesBasicFilters]);

  const filteredPreviousData = useMemo(() => {
    if (!previousYearData) return [];
    return previousYearData.filter((d) => {
      if (!recordPassesBasicFilters(d)) return false;
      if (filters.salesReps.length === 0) {
        if (yoyFilter === "growth") return yoyClassSets.growth.has(d.salesRepName);
        if (yoyFilter === "loss") return yoyClassSets.loss.has(d.salesRepName);
      }
      return true;
    });
  }, [previousYearData, filters, yoyFilter, yoyClassSets, recordPassesBasicFilters]);

  const filteredDataNoYoy = useMemo(
    () => (masterData ? masterData.filter(recordPassesBasicFilters) : []),
    [masterData, recordPassesBasicFilters]
  );

  const filteredPreviousDataNoYoy = useMemo(
    () => (previousYearData ? previousYearData.filter(recordPassesBasicFilters) : []),
    [previousYearData, recordPassesBasicFilters]
  );

  // Actions
  const applyFilters = () => {
    setActiveDateRange(stagedDateRange);
    setFilters((prev) => ({
      ...prev,
      itemCodes: [],
      customers: [],
      salesReps: stagedSelectedRep ? [stagedSelectedRep] : [],
    }));
  };

  const handleSelect = (category: keyof FilterState, value: string, isShiftClick = false) => {
    setFilters((prev) => {
      const existing = prev[category];
      const isSelected = existing.includes(value);
      const newValues = isShiftClick
        ? isSelected
          ? existing.filter((v) => v !== value)
          : [...existing, value]
        : isSelected && existing.length === 1
        ? []
        : [value];
      if (category === "salesReps" && !isShiftClick) {
        setStagedSelectedRep(newValues.length === 1 ? newValues[0] : "");
      }
      return { ...prev, [category]: newValues };
    });
  };

  const resetFilters = () => {
    setStagedDateRange(defaultDateRange);
    setStagedSelectedRep("");
    setActiveDateRange(defaultDateRange);
    setFilters({ salesReps: [], itemCodes: [], customers: [] });
    setYoyFilter("all");
  };

  const hasActiveFilters =
    filters.salesReps.length > 0 ||
    filters.itemCodes.length > 0 ||
    filters.customers.length > 0 ||
    JSON.stringify(activeDateRange) !== JSON.stringify(defaultDateRange) ||
    yoyFilter !== "all";

  // KPIs
  const totalSales = useMemo(() => filteredData.reduce((s, d) => s + d.salesValue, 0), [filteredData]);
  const transactionCount = useMemo(() => filteredData.reduce((s, d) => s + d.txCount, 0), [filteredData]);
  const previousTotalSales = useMemo(() => filteredPreviousData.reduce((s, d) => s + d.salesValue, 0), [filteredPreviousData]);
  const previousTransactionCount = useMemo(() => filteredPreviousData.reduce((s, d) => s + d.txCount, 0), [filteredPreviousData]);

  // Rep color map
  const salesRepColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const reps = masterData ? Array.from(new Set(masterData.map((d) => d.salesRepName))).sort() : [];
    reps.forEach((rep, idx) => (map[rep] = chartColors[idx % chartColors.length]));
    map["Autres"] = t.textMuted;
    return map;
  }, [masterData, chartColors, t]);

  // Retention calculations
  const retentionByRep = useMemo(() => {
    const prev = totalsByRepCustomer(previousYearData ?? []);
    const curr = totalsByRepCustomer(masterData ?? []);
    const result: Record<string, { eligible: number; retained: number; rate: number | null }> = {};
    const reps = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    reps.forEach((rep) => {
      const prevCusts = prev[rep] || {};
      const currCusts = curr[rep] || {};
      let eligible = 0;
      let retained = 0;
      for (const [cust, prevSpend] of Object.entries(prevCusts)) {
        if (prevSpend >= RETENTION_THRESHOLD) {
          eligible += 1;
          if ((currCusts[cust] || 0) >= RETENTION_THRESHOLD) retained += 1;
        }
      }
      result[rep] = { eligible, retained, rate: eligible > 0 ? retained / eligible : null };
    });
    return result;
  }, [masterData, previousYearData]);

  const visibleRepsForRetention = useMemo(() => {
    if (filters.salesReps.length > 0) return new Set(filters.salesReps);
    if (yoyFilter === "growth") return new Set(yoyClassSets.growth);
    if (yoyFilter === "loss") return new Set(yoyClassSets.loss);
    return new Set(allSalesReps);
  }, [filters.salesReps, yoyFilter, yoyClassSets, allSalesReps]);

  const retentionAverage = useMemo(() => {
    const rates: number[] = [];
    visibleRepsForRetention.forEach((rep) => {
      const r = retentionByRep[rep];
      if (r?.rate !== null) rates.push(r.rate!);
    });
    return {
      avg: rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null,
      eligibleReps: rates.length,
    };
  }, [retentionByRep, visibleRepsForRetention]);

  // New customers
  const prevCustomersSet = useMemo(() => new Set(history3yData ?? []), [history3yData]);

  const currentCustomerAgg = useMemo(() => {
    type Agg = { total: number; orders: number; firstDate: string; firstRep: string };
    const map = new Map<string, Agg>();
    for (const r of filteredData) {
      const a = map.get(r.customerName);
      if (!a) {
        map.set(r.customerName, { total: r.salesValue, orders: r.txCount, firstDate: r.firstDate, firstRep: r.salesRepName });
      } else {
        a.total += r.salesValue;
        a.orders += r.txCount;
        if (r.firstDate < a.firstDate) {
          a.firstDate = r.firstDate;
          a.firstRep = r.salesRepName;
        }
      }
    }
    return map;
  }, [filteredData]);

  const newCustomersList = useMemo(() => {
    const rows: { customer: string; rep: string; spend: number; orders: number; firstDate: string }[] = [];
    currentCustomerAgg.forEach((agg, cust) => {
      if (!prevCustomersSet.has(cust) && agg.total >= NEW_CUSTOMER_MIN_SPEND) {
        rows.push({ customer: cust, rep: agg.firstRep, spend: agg.total, orders: agg.orders, firstDate: agg.firstDate });
      }
    });
    rows.sort((a, b) => b.spend - a.spend);
    return rows;
  }, [currentCustomerAgg, prevCustomersSet]);

  const newCustomersCount = newCustomersList.length;

  const newCustomersByRep = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of newCustomersList) m.set(row.rep, (m.get(row.rep) || 0) + 1);
    return Array.from(m.entries())
      .map(([rep, count]) => ({ rep, count }))
      .sort((a, b) => b.count - a.count);
  }, [newCustomersList]);

  // Performance calculations
  const repsPerf = useMemo(() => {
    const prev = totalsByKey(filteredPreviousDataNoYoy, "salesRepName");
    const curr = totalsByKey(filteredDataNoYoy, "salesRepName");
    const union = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    const growth: PerfRow[] = [];
    const loss: PerfRow[] = [];
    let eligible = 0;
    union.forEach((rep) => {
      const p = prev[rep] || 0;
      const c = curr[rep] || 0;
      if (p > 0) {
        eligible += 1;
        const rate = (c - p) / p;
        const delta = c - p;
        if (rate > 0) growth.push({ key: rep, prev: p, curr: c, rate, delta });
        else if (rate < 0) loss.push({ key: rep, prev: p, curr: c, rate, delta });
      }
    });
    growth.sort((a, b) => b.rate - a.rate);
    loss.sort((a, b) => a.rate - b.rate);
    return { growth, loss, eligible, pct: eligible > 0 ? growth.length / eligible : null };
  }, [filteredDataNoYoy, filteredPreviousDataNoYoy]);

  const customersPerf = useMemo(() => {
    const prev = totalsByKey(filteredPreviousDataNoYoy, "customerName");
    const curr = totalsByKey(filteredDataNoYoy, "customerName");
    const union = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    const growth: PerfRow[] = [];
    const loss: PerfRow[] = [];
    let eligible = 0;
    union.forEach((cust) => {
      const p = prev[cust] || 0;
      const c = curr[cust] || 0;
      if (p > 0) {
        eligible += 1;
        const rate = (c - p) / p;
        const delta = c - p;
        if (rate > 0) growth.push({ key: cust, prev: p, curr: c, rate, delta });
        else if (rate < 0) loss.push({ key: cust, prev: p, curr: c, rate, delta });
      }
    });
    growth.sort((a, b) => b.rate - a.rate);
    loss.sort((a, b) => a.rate - b.rate);
    return { growth, loss, eligible, pct: eligible > 0 ? growth.length / eligible : null };
  }, [filteredDataNoYoy, filteredPreviousDataNoYoy]);

  // Modal drill-down callbacks
  const handleSelectRep = (rep: string) => {
    setFilters((prev) => ({ ...prev, salesReps: [rep], itemCodes: [], customers: [] }));
    setStagedSelectedRep(rep);
  };

  const handleSelectRepAndCustomer = (rep: string, customer: string) => {
    setFilters((prev) => ({ ...prev, salesReps: [rep], customers: [customer] }));
    setStagedSelectedRep(rep);
  };

  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header
        className="pb-6 animate-slide-up"
        style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-headline">
              Analyse des ventes
              <span style={{ color: t.accent }}>.</span>
            </h1>
            <p className="text-caption mt-1" style={{ color: t.textMuted }}>
              Intelligence d&apos;affaires avec comparaison YOY
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-5 lg:mt-0">
            <button
              onClick={() => setShowYOYComparison(!showYOYComparison)}
              className="px-4 py-2 rounded-full text-[0.875rem] font-medium transition-all duration-200"
              style={{
                background: showYOYComparison ? `${t.accent}20` : t.surface2,
                color: showYOYComparison ? t.accent : t.textSecondary,
                border: `1px solid ${showYOYComparison ? `${t.accent}40` : t.borderSubtle}`,
              }}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              YOY
            </button>

            <SegmentedControl
              options={[
                { key: "all", label: "Tous", color: t.textTertiary },
                { key: "growth", label: "Croissance", color: t.success },
                { key: "loss", label: "Baisse", color: t.danger },
              ]}
              value={yoyFilter}
              onChange={(k) => setYoyFilter(k as YoyFilter)}
              t={t}
            />

            <select
              value={stagedSelectedRep}
              onChange={(e) => setStagedSelectedRep(e.target.value)}
              className="rounded-full px-3 py-2 text-[0.875rem] transition-all focus:outline-none"
              style={{
                background: t.surface2,
                border: `1px solid ${t.borderSubtle}`,
                color: t.textPrimary,
              }}
            >
              <option value="">Tous les experts</option>
              {allSalesReps.map((rep) => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={stagedDateRange.start}
                onChange={(e) => setStagedDateRange((p) => ({ ...p, start: e.target.value }))}
                className="rounded-full px-3 py-2 text-[0.875rem] focus:outline-none"
                style={{
                  background: t.surface2,
                  border: `1px solid ${t.borderSubtle}`,
                  color: t.textPrimary,
                }}
              />
              <span className="text-caption">à</span>
              <input
                type="date"
                value={stagedDateRange.end}
                onChange={(e) => setStagedDateRange((p) => ({ ...p, end: e.target.value }))}
                className="rounded-full px-3 py-2 text-[0.875rem] focus:outline-none"
                style={{
                  background: t.surface2,
                  border: `1px solid ${t.borderSubtle}`,
                  color: t.textPrimary,
                }}
              />
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => {
                  const today = new Date();
                  const yearStart = new Date(today.getFullYear(), 0, 1);
                  setStagedDateRange({
                    start: yearStart.toISOString().slice(0, 10),
                    end: today.toISOString().slice(0, 10),
                  });
                }}
                className="px-2 py-1.5 rounded-full text-[0.8125rem] font-medium transition-all"
                style={{ background: t.surface2, color: t.textTertiary }}
              >
                YTD
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const yearAgo = new Date(today);
                  yearAgo.setDate(yearAgo.getDate() - 365);
                  setStagedDateRange({
                    start: yearAgo.toISOString().slice(0, 10),
                    end: today.toISOString().slice(0, 10),
                  });
                }}
                className="px-2 py-1.5 rounded-full text-[0.8125rem] font-medium transition-all"
                style={{ background: t.surface2, color: t.textTertiary }}
              >
                TTM
              </button>
            </div>

            <button
              onClick={applyFilters}
              className="px-5 py-2 rounded-full text-[0.875rem] font-semibold transition-all duration-200 hover:opacity-90"
              style={{
                background: t.accent,
                color: t.void,
              }}
            >
              Appliquer
            </button>

            <button
              onClick={() => fetchDashboardData(true)}
              disabled={isLoading}
              className="px-4 py-2 rounded-full text-[0.875rem] font-medium transition-all duration-200 disabled:opacity-50"
              style={{
                background: t.surface2,
                color: t.textSecondary,
                border: `1px solid ${t.borderSubtle}`,
              }}
              title="Actualiser les données"
            >
              <RotateCcw className={`w-4 h-4 inline mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="p-2 rounded-lg transition-all"
                style={{ color: t.textTertiary }}
                title="Réinitialiser"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        <KpiCard title="Chiffre d'affaires" t={t} className="animate-slide-up stagger-1" isLoading={isLoading}>
          <p className="text-[2rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            <AnimatedNumber value={totalSales} format={currency} />
          </p>
          {showYOYComparison && previousTotalSales > 0 && <YOYBadge current={totalSales} previous={previousTotalSales} />}
        </KpiCard>

        <KpiCard title="Transactions" t={t} className="animate-slide-up stagger-2" isLoading={isLoading}>
          <p className="text-[2rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            <AnimatedNumber value={transactionCount} format={formatNumber} />
          </p>
          {showYOYComparison && previousTransactionCount > 0 && <YOYBadge current={transactionCount} previous={previousTransactionCount} />}
        </KpiCard>

        <KpiCard title="% Reps croissance" t={t} onClick={isLoading ? undefined : () => setShowRepGrowthModal(true)} className="animate-slide-up stagger-3" isLoading={isLoading}>
          <p className="text-[2rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            {repsPerf.pct === null ? "—" : percentage(repsPerf.pct)}
          </p>
          <p className="text-[0.75rem] mt-2" style={{ color: t.textMuted }}>{repsPerf.growth.length}/{repsPerf.eligible} reps</p>
        </KpiCard>

        <KpiCard title="% Clients croissance" t={t} onClick={isLoading ? undefined : () => setShowCustomerGrowthModal(true)} className="animate-slide-up stagger-4" isLoading={isLoading}>
          <p className="text-[2rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            {customersPerf.pct === null ? "—" : percentage(customersPerf.pct)}
          </p>
          <p className="text-[0.75rem] mt-2" style={{ color: t.textMuted }}>{customersPerf.growth.length}/{customersPerf.eligible} clients</p>
        </KpiCard>

        <KpiCard title="Taux rétention" t={t} onClick={isLoading ? undefined : () => setShowRetentionTable(true)} className="animate-slide-up stagger-5" isLoading={isLoading}>
          <p className="text-[2rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            {retentionAverage.avg === null ? "—" : percentage(retentionAverage.avg)}
          </p>
          <p className="text-[0.75rem] mt-2" style={{ color: t.textMuted }}>Moy. {retentionAverage.eligibleReps} reps</p>
        </KpiCard>

        <KpiCard title="Nouveaux clients" t={t} onClick={isLoading ? undefined : () => setShowNewCustomersModal(true)} className="animate-slide-up stagger-6" isLoading={isLoading}>
          <p className="text-[2rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            {formatNumber(newCustomersCount)}
          </p>
          <p className="text-[0.75rem] mt-2" style={{ color: t.textMuted }}>Aucun achat 3 ans</p>
        </KpiCard>
      </div>

      {/* Charts */}
      <DashboardCharts
        t={t}
        chartColors={chartColors}
        filteredData={filteredData}
        filteredPreviousData={filteredPreviousData}
        salesRepColorMap={salesRepColorMap}
        filters={filters}
        totalSales={totalSales}
        previousTotalSales={previousTotalSales}
        showYOYComparison={showYOYComparison}
        isLoading={isLoading}
        onSelect={handleSelect}
      />

      {/* Modals */}
      <DashboardModals
        t={t}
        showRetentionTable={showRetentionTable}
        onCloseRetention={() => setShowRetentionTable(false)}
        retentionByRep={retentionByRep}
        visibleRepsForRetention={visibleRepsForRetention}
        retentionAverage={retentionAverage}
        showNewCustomersModal={showNewCustomersModal}
        onCloseNewCustomers={() => setShowNewCustomersModal(false)}
        newCustomersList={newCustomersList}
        newCustomersByRep={newCustomersByRep}
        showRepGrowthModal={showRepGrowthModal}
        onCloseRepGrowth={() => setShowRepGrowthModal(false)}
        repsPerf={repsPerf}
        showCustomerGrowthModal={showCustomerGrowthModal}
        onCloseCustomerGrowth={() => setShowCustomerGrowthModal(false)}
        customersPerf={customersPerf}
        onSelectRep={handleSelectRep}
        onSelectRepAndCustomer={handleSelectRepAndCustomer}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Page Export
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const userRole = (session as any)?.user?.role;
  const userEmail = session?.user?.email;

  useEffect(() => setMounted(true), []);

  // Redirect expert role users to pricelist
  useEffect(() => {
    if (mounted && status === "authenticated" && userRole?.toLowerCase() === "expert") {
      router.replace("/dashboard/pricelist");
    }
  }, [mounted, status, userRole, router]);

  if (!mounted || status === "loading") {
    return null;
  }

  // Expert users are always redirected to pricelist, regardless of bypass emails
  if (userRole?.toLowerCase() === "expert") {
    return null;
  }

  // Use the centralized authorization check
  const isAuthorized = isUserAuthorized(userRole, userEmail);

  if (status === "unauthenticated" || !isAuthorized) {
    return <AccessDenied role={userRole} email={userEmail} />;
  }

  return (
    <main className="min-h-[100svh]">
      <div className="px-4 md:px-8 lg:px-10 py-8 md:py-10">
        <div className="mx-auto w-full max-w-[1920px]">
          <DashboardContent />
        </div>
      </div>
    </main>
  );
}
