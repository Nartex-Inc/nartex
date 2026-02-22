"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { RotateCcw, X } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { THEME, CHART_COLORS } from "@/lib/theme-tokens";
import { useCurrentAccent } from "@/components/accent-color-provider";
import { formatNumber } from "@/lib/dashboard-formatters";
import { CAUSE_LABELS } from "@/types/returns";
import {
  KpiCard,
  ChartCard,
  AnimatedNumber,
  SegmentedControl,
  CustomTooltip,
  CustomLegend,
  ErrorState,
} from "@/components/dashboard/sales-ui";

// ── Types ───────────────────────────────────────────────────────────────────
type AnalyticsData = {
  counts: {
    total: number;
    drafts: number;
    active: number;
    finalized: number;
    standby: number;
    verified: number;
  };
  byCause: { name: string; count: number }[];
  byExpert: { name: string; count: number }[];
  topItems: { name: string; count: number }[];
  byMonth: { month: string; current: number; previous: number }[];
  experts: string[];
};

// ── Reverse lookup: French label → enum key ─────────────────────────────────
const CAUSE_LABEL_TO_KEY: Record<string, string> = {};
for (const [key, label] of Object.entries(CAUSE_LABELS)) {
  CAUSE_LABEL_TO_KEY[label] = key;
}

// ── Month label helper ──────────────────────────────────────────────────────
const MONTH_SHORT: Record<string, string> = {
  "01": "Jan",
  "02": "Fév",
  "03": "Mar",
  "04": "Avr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Aoû",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Déc",
};

function monthLabel(yyyymm: string) {
  const [, mm] = yyyymm.split("-");
  return MONTH_SHORT[mm] || mm;
}

// ═════════════════════════════════════════════════════════════════════════════
export function ReturnsDashboard() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { color: accentColor, muted: accentMuted } = useCurrentAccent();
  const mode = mounted && resolvedTheme === "light" ? "light" : "dark";

  const t = useMemo(
    () => ({
      ...THEME[mode],
      accent: accentColor,
      accentMuted: accentMuted || (mode === "dark" ? "#1A2A3D" : "#DBEAFE"),
    }),
    [mode, accentColor, accentMuted]
  );

  const chartColors = useMemo(() => {
    const base = CHART_COLORS[mode];
    return [accentColor, ...base.filter((c) => c !== accentColor)];
  }, [mode, accentColor]);

  // ── Filters ──
  const [cause, setCause] = useState("");
  const [expert, setExpert] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  // ── Data ──
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (bustCache = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (cause) params.set("cause", cause);
        if (expert) params.set("expert", expert);
        if (bustCache) params.set("noCache", "1");

        const res = await fetch(`/api/returns/analytics?${params}`);
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    },
    [dateFrom, dateTo, cause, expert]
  );

  // Fetch on mount + when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Pie view toggle ──
  const [pieView, setPieView] = useState<"cause" | "expert">("cause");

  const pieData = useMemo(() => {
    if (!data) return [];
    if (pieView === "cause") {
      return data.byCause.map((d) => ({
        name: CAUSE_LABELS[d.name] || d.name,
        key: d.name, // raw enum key for drilldown
        value: d.count,
      }));
    }
    return data.byExpert.map((d) => ({
      name: d.name,
      key: d.name, // expert name is the key
      value: d.count,
    }));
  }, [data, pieView]);

  // ── Pie chart drilldown click handler ──
  const handlePieClick = useCallback(
    (_entry: unknown, index: number) => {
      const item = pieData[index];
      if (!item) return;

      if (pieView === "cause") {
        // Toggle: click again to clear
        setCause((prev) => (prev === item.key ? "" : item.key));
      } else {
        setExpert((prev) => (prev === item.key ? "" : item.key));
      }
    },
    [pieView, pieData]
  );

  // ── Legend click handler (same drilldown behavior) ──
  const handleLegendClick = useCallback(
    (legendLabel: string) => {
      if (pieView === "cause") {
        const enumKey = CAUSE_LABEL_TO_KEY[legendLabel] || legendLabel;
        setCause((prev) => (prev === enumKey ? "" : enumKey));
      } else {
        setExpert((prev) => (prev === legendLabel ? "" : legendLabel));
      }
    },
    [pieView]
  );

  // Active selection for legend highlighting
  const selectedLegendItems = useMemo(() => {
    if (pieView === "cause" && cause) {
      return [CAUSE_LABELS[cause] || cause];
    }
    if (pieView === "expert" && expert) {
      return [expert];
    }
    return [];
  }, [pieView, cause, expert]);

  // ── Month chart data ──
  const monthData = useMemo(() => {
    if (!data) return [];
    return data.byMonth.map((m) => ({
      month: monthLabel(m.month),
      "Période actuelle": m.current,
      "N-1": m.previous,
    }));
  }, [data]);

  // ── Distinct causes for filter dropdown ──
  const causeOptions = useMemo(() => {
    return Object.entries(CAUSE_LABELS).map(([key, label]) => ({ key, label }));
  }, []);

  // ── Active filters for badge display ──
  const hasActiveFilters = cause || expert;

  if (error && !data) return <ErrorState message={error} />;

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header
        className="pb-6 animate-slide-up"
        style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-headline">
              Analyse des retours
              <span style={{ color: t.accent }}>.</span>
            </h1>
            <p className="text-caption mt-1" style={{ color: t.textMuted }}>
              Indicateurs et tendances des retours
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-5 lg:mt-0">
            {/* Cause filter */}
            <select
              value={cause}
              onChange={(e) => setCause(e.target.value)}
              className="rounded-full px-3 py-2 text-[0.875rem] transition-all focus:outline-none"
              style={{
                background: cause ? t.accentMuted : t.surface2,
                border: `1px solid ${cause ? t.accent : t.borderSubtle}`,
                color: t.textPrimary,
              }}
            >
              <option value="">Toutes les causes</option>
              {causeOptions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Expert filter */}
            <select
              value={expert}
              onChange={(e) => setExpert(e.target.value)}
              className="rounded-full px-3 py-2 text-[0.875rem] transition-all focus:outline-none"
              style={{
                background: expert ? t.accentMuted : t.surface2,
                border: `1px solid ${expert ? t.accent : t.borderSubtle}`,
                color: t.textPrimary,
              }}
            >
              <option value="">Tous les experts</option>
              {(data?.experts ?? []).map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
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
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-full px-3 py-2 text-[0.875rem] focus:outline-none"
                style={{
                  background: t.surface2,
                  border: `1px solid ${t.borderSubtle}`,
                  color: t.textPrimary,
                }}
              />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setCause("");
                  setExpert("");
                }}
                className="px-3 py-2 rounded-full text-[0.875rem] font-medium transition-all duration-200 flex items-center gap-1.5"
                style={{
                  background: t.accentMuted,
                  color: t.accent,
                  border: `1px solid ${t.accent}`,
                }}
                title="Effacer les filtres"
              >
                <X className="w-3.5 h-3.5" />
                Effacer
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={() => fetchData(true)}
              disabled={isLoading}
              className="px-4 py-2 rounded-full text-[0.875rem] font-medium transition-all duration-200 disabled:opacity-50"
              style={{
                background: t.surface2,
                color: t.textSecondary,
                border: `1px solid ${t.borderSubtle}`,
              }}
              title="Actualiser les données"
            >
              <RotateCcw
                className={`w-4 h-4 inline mr-1.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Actualiser
            </button>
          </div>
        </div>

        {/* Active filter badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs" style={{ color: t.textMuted }}>
              Filtres actifs :
            </span>
            {cause && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:opacity-80"
                style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.accent}` }}
                onClick={() => setCause("")}
              >
                {CAUSE_LABELS[cause] || cause}
                <X className="w-3 h-3" />
              </span>
            )}
            {expert && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:opacity-80"
                style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.accent}` }}
                onClick={() => setExpert("")}
              >
                {expert}
                <X className="w-3 h-3" />
              </span>
            )}
          </div>
        )}
      </header>

      {/* ── KPI Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        <KpiCard title="Total retours" t={t} className="animate-slide-up stagger-1" isLoading={isLoading}>
          <p className="text-[2rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            <AnimatedNumber value={data?.counts.total ?? 0} format={formatNumber} />
          </p>
        </KpiCard>

        <KpiCard title="Actifs" t={t} className="animate-slide-up stagger-2" isLoading={isLoading}>
          <p className="text-[2rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            <AnimatedNumber value={data?.counts.active ?? 0} format={formatNumber} />
          </p>
        </KpiCard>

        <KpiCard title="Brouillons" t={t} className="animate-slide-up stagger-3" isLoading={isLoading}>
          <p className="text-[2rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            <AnimatedNumber value={data?.counts.drafts ?? 0} format={formatNumber} />
          </p>
        </KpiCard>

        <KpiCard title="Finalisés" t={t} className="animate-slide-up stagger-4" isLoading={isLoading}>
          <p className="text-[2rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            <AnimatedNumber value={data?.counts.finalized ?? 0} format={formatNumber} />
          </p>
        </KpiCard>

        <KpiCard title="Standby" t={t} className="animate-slide-up stagger-5" isLoading={isLoading}>
          <p className="text-[2rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            <AnimatedNumber value={data?.counts.standby ?? 0} format={formatNumber} />
          </p>
        </KpiCard>

        <KpiCard title="Vérifiés" t={t} className="animate-slide-up stagger-6" isLoading={isLoading}>
          <p className="text-[2rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            <AnimatedNumber value={data?.counts.verified ?? 0} format={formatNumber} />
          </p>
        </KpiCard>
      </div>

      {/* ── Charts Row 1: Pie + YOY Bar ───────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5">
        {/* Donut chart — cause / expert toggle with drilldown */}
        <div className="col-span-12 lg:col-span-5">
          <ChartCard
            title={
              <SegmentedControl
                options={[
                  { key: "cause", label: "Par cause" },
                  { key: "expert", label: "Par expert" },
                ]}
                value={pieView}
                onChange={(k) => setPieView(k as "cause" | "expert")}
                t={t}
              />
            }
            t={t}
            isLoading={isLoading}
            height={320}
          >
            <p className="text-[0.65rem] mb-1 text-center" style={{ color: t.textMuted }}>
              Cliquez sur une section pour filtrer
            </p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="92%"
                    paddingAngle={2}
                    stroke="none"
                    style={{ cursor: "pointer" }}
                    onClick={handlePieClick}
                  >
                    {pieData.map((entry, i) => {
                      const isActive =
                        selectedLegendItems.length === 0 ||
                        selectedLegendItems.includes(entry.name);
                      return (
                        <Cell
                          key={i}
                          fill={chartColors[i % chartColors.length]}
                          fillOpacity={isActive ? 1 : 0.25}
                          stroke={isActive && selectedLegendItems.length > 0 ? t.textPrimary : "none"}
                          strokeWidth={isActive && selectedLegendItems.length > 0 ? 2 : 0}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    content={<CustomTooltip format="number" t={t} />}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-[40%] overflow-y-auto max-h-[300px]">
                <CustomLegend
                  payload={pieData.map((d, i) => ({
                    value: d.name,
                    color: chartColors[i % chartColors.length],
                  }))}
                  onLegendClick={handleLegendClick}
                  selectedItems={selectedLegendItems}
                  t={t}
                />
              </div>
            </div>
          </ChartCard>
        </div>

        {/* YOY vertical bar chart */}
        <div className="col-span-12 lg:col-span-7">
          <ChartCard
            title="Retours par mois (YOY)"
            t={t}
            isLoading={isLoading}
            height={320}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthData} barGap={4}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={t.borderSubtle}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: t.textMuted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: t.textMuted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip format="number" t={t} />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: t.textMuted }}
                />
                <Bar
                  dataKey="N-1"
                  fill={t.textMuted}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="Période actuelle"
                  fill={accentColor}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* ── Charts Row 2: Top 10 items (horizontal bar) ───────────────────── */}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12">
          <ChartCard
            title="Top 10 produits en retour"
            t={t}
            isLoading={isLoading}
            height={400}
          >
            <ResponsiveContainer width="100%" height={380}>
              <BarChart
                data={data?.topItems ?? []}
                layout="vertical"
                margin={{ left: 20, right: 30 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={t.borderSubtle}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: t.textMuted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: t.textSecondary, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip content={<CustomTooltip format="number" t={t} />} />
                <Bar
                  dataKey="count"
                  name="Retours"
                  fill={accentColor}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                  fillOpacity={0.85}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
