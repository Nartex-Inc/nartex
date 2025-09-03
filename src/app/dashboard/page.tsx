// src/app/(dashboard)/page.tsx  (adjust path to your app route)
/* =============================================================================
   Dashboard Page (Light/Dark fixed)
============================================================================= */
"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Inter } from "next/font/google";
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
  LineChart,
  Line,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Users,
  Package,
  DollarSign,
  ChevronRight,
  Activity,
  Zap,
  BarChart3,
} from "lucide-react";
import { THEME, PIE_COLORS_DARK, PIE_COLORS_LIGHT } from "@/lib/theme-tokens";

/* =============================================================================
   Font
============================================================================= */
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

/* =============================================================================
   Types & helpers
============================================================================= */
type SalesRecord = {
  salesRepName: string;
  customerName: string;
  itemCode: string;
  itemDescription: string;
  invoiceDate: string;
  salesValue: number;
};

type FilterState = {
  salesReps: string[];
  itemCodes: string[];
  customers: string[];
};

const currency = (n: number) =>
  new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);

const compactCurrency = (n: number) =>
  new Intl.NumberFormat("fr-CA", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
    style: "currency",
    currency: "CAD",
  }).format(n);

const percentage = (n: number) =>
  new Intl.NumberFormat("fr-CA", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n);

const formatNumber = (n: number) => new Intl.NumberFormat("fr-CA").format(Math.round(n));

/* =============================================================================
   Animated components
============================================================================= */
const AnimatedNumber = ({
  value,
  format,
  duration = 700,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(0);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const endValue = value;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * eased;
      setDisplayValue(currentValue);
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        previousValueRef.current = endValue;
      }
    };

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      previousValueRef.current = value;
    };
  }, [value, duration]);

  return <>{format(displayValue)}</>;
};

const YOYIndicator = ({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) => {
  const change = previous > 0 ? (current - previous) / previous : 0;
  const isPositive = change >= 0;
  const isNeutral = Math.abs(change) < 0.001;

  return (
    <div className="flex items-center gap-2 mt-2">
      <div
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-xl ${
          isNeutral
            ? "bg-zinc-800/50 text-zinc-400 dark:bg-zinc-800/50"
            : isPositive
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/20 shadow-lg"
            : "bg-red-500/15 text-red-600 dark:text-red-400 shadow-red-500/20 shadow-lg"
        }`}
      >
        {isNeutral ? (
          <Minus className="w-3 h-3" />
        ) : isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        <span>{percentage(Math.abs(change))}</span>
      </div>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">vs année précédente</span>
    </div>
  );
};

/* =============================================================================
   Custom Recharts components
============================================================================= */
function CustomTooltip({
  active,
  payload,
  label,
  format = "currency",
  themeTokens,
  mode,
}: any) {
  if (active && payload?.length) {
    return (
      <div
        className="backdrop-blur-2xl border rounded-xl px-4 py-3 shadow-2xl"
        style={{
          background: themeTokens.tooltipBg,
          borderColor: themeTokens.cardBorder,
        }}
      >
        <p
          className="text-xs mb-2 font-medium"
          style={{ color: themeTokens.labelMuted }}
        >
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full shadow"
              style={{
                backgroundColor: entry.color,
                boxShadow: `0 0 10px ${entry.color}50`,
              }}
            />
            <p
              className="text-sm font-semibold"
              style={{ color: mode === "dark" ? "#ffffff" : "#111827" }}
            >
              {entry.name}:{" "}
              {format === "number"
                ? formatNumber(entry.value)
                : format === "percentage"
                ? percentage(entry.value)
                : currency(entry.value)}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

const CustomLegend = ({ payload, onLegendClick, selectedItems = [] as string[], themeTokens }: any) => {
  return (
    <ul className="flex flex-col space-y-2 text-xs">
      {(payload || []).map((entry: any) => {
        const isSelected = selectedItems.length === 0 || selectedItems.includes(entry.value);
        return (
          <li
            key={entry.value}
            className={`flex items-center space-x-2.5 cursor-pointer transition-all duration-300 px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${
              isSelected ? "opacity-100" : "opacity-35"
            }`}
            onClick={() => onLegendClick?.(entry.value)}
            style={{ color: themeTokens.label }}
          >
            <span
              className="w-3.5 h-3.5 rounded-md transition-all duration-300"
              style={{
                backgroundColor: entry.color,
                boxShadow: isSelected
                  ? `0 0 12px ${entry.color}60, 0 0 0 1px rgba(255,255,255,0.2) inset`
                  : "0 0 0 1px rgba(0,0,0,0.08) inset",
                transform: isSelected ? "scale(1.1)" : "scale(1)",
              }}
            />
            <span className="font-medium">{entry.value}</span>
          </li>
        );
      })}
    </ul>
  );
};

/* =============================================================================
   Aggregation helper
============================================================================= */
function aggregateData(data: SalesRecord[], key: keyof SalesRecord, topN?: number) {
  const aggregated = data.reduce((acc, d) => {
    const groupKey = d[key] as string;
    acc[groupKey] = (acc[groupKey] || 0) + d.salesValue;
    return acc;
  }, {} as Record<string, number>);
  const sorted = Object.entries(aggregated)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  return topN ? sorted.slice(0, topN) : sorted;
}

/* =============================================================================
   Simple loading & error states
============================================================================= */
const LoadingState = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="animate-pulse text-sm text-muted-foreground">Chargement…</div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <div className="rounded-2xl p-8 border max-w-md text-center backdrop-blur-xl bg-red-50/80 dark:bg-red-900/10 border-red-200 dark:border-red-900">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
        <TrendingDown className="w-8 h-8 text-red-500 dark:text-red-400" />
      </div>
      <h3 className="text-xl font-bold mb-2 text-red-700 dark:text-red-300">Erreur de chargement</h3>
      <p className="text-sm text-red-600/90 dark:text-red-300/80 mb-6">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-xl font-semibold border bg-red-600/10 text-red-700 dark:text-red-300 hover:bg-red-600/20 transition"
      >
        Recharger la page
      </button>
    </div>
  </div>
);

const AccessDenied = () => (
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <div className="rounded-2xl p-10 border max-w-lg text-center backdrop-blur-xl bg-white/90 dark:bg-zinc-900/95 border-zinc-200 dark:border-zinc-800">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/10 to-violet-500/10 flex items-center justify-center">
        <Users className="w-10 h-10 text-zinc-600 dark:text-zinc-400" />
      </div>
      <h3 className="text-2xl font-bold mb-3 text-zinc-800 dark:text-white">Accès restreint</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Vous ne disposez pas des autorisations nécessaires pour consulter ces données.
        Veuillez contacter votre département TI pour obtenir l'accès approprié.
      </p>
    </div>
  </div>
);

/* =============================================================================
   UI components
============================================================================= */
function KpiCard({
  title,
  icon,
  gradient,
  children,
  className,
  t,
  mode,
}: {
  title: string;
  icon?: React.ReactNode;
  gradient?: string;
  children: React.ReactNode;
  className?: string;
  t: typeof THEME.dark;
  mode: "dark" | "light";
}) {
  return (
    <div className={`group relative ${className ?? ""}`}>
      <div
        className="absolute -inset-0.5 rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition duration-700"
        style={{
          background: gradient
            ? `linear-gradient(135deg, ${gradient})`
            : t.gradientPrimary,
        }}
      />
      <div
        className="relative rounded-2xl p-6 h-full backdrop-blur-xl border transition-all duration-300 hover:border-white/10"
        style={{
          background: `linear-gradient(135deg, ${t.card} 0%, ${t.soft} 100%)`,
          borderColor: t.cardBorder,
          color: t.foreground,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-[10px] uppercase tracking-[0.2em] font-semibold"
            style={{ color: t.labelMuted }}
          >
            {title}
          </h3>
          {icon && (
            <div
              className="p-2 rounded-lg backdrop-blur-xl"
              style={{
                background: gradient
                  ? `linear-gradient(135deg, ${gradient})`
                  : "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(139,92,246,0.2))",
                color: t.foreground,
              }}
            >
              <div className="opacity-80">{icon}</div>
            </div>
          )}
        </div>
        <div style={{ color: mode === "dark" ? "#fff" : t.foreground }}>{children}</div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
  t,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  t: typeof THEME.dark;
}) {
  return (
    <div className={`group relative ${className ?? ""}`}>
      <div
        className="absolute -inset-0.5 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition duration-700"
        style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(139,92,246,0.15))" }}
      />
      <div
        className="relative rounded-2xl p-5 border h-full flex flex-col backdrop-blur-xl transition-all duration-300 hover:border-white/10"
        style={{
          background: `linear-gradient(135deg, ${t.card} 0%, ${t.soft} 100%)`,
          borderColor: t.cardBorder,
          color: t.foreground,
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: t.foreground }}>
            {title}
          </h3>
        </div>
        <div className="flex-grow">{children}</div>
      </div>
    </div>
  );
}

/* =============================================================================
   Main dashboard content
============================================================================= */
const DashboardContent = () => {
  // Theme (from next-themes)
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const mode: "dark" | "light" = mounted && resolvedTheme === "light" ? "light" : "dark";

  const t = THEME[mode];
  const pieColors = mode === "dark" ? PIE_COLORS_DARK : PIE_COLORS_LIGHT;

  const defaultDateRange = {
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  };

  const [activeDateRange, setActiveDateRange] = useState(defaultDateRange);
  const [stagedDateRange, setStagedDateRange] = useState(defaultDateRange);
  const [stagedSelectedRep, setStagedSelectedRep] = useState<string>("");
  const [showYOYComparison, setShowYOYComparison] = useState(true);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showAllCustomers, setShowAllCustomers] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    salesReps: [],
    itemCodes: [],
    customers: [],
  });
  const [animationKey, setAnimationKey] = useState(0);
  const [masterData, setMasterData] = useState<SalesRecord[] | null>(null);
  const [previousYearData, setPreviousYearData] = useState<SalesRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Calculate previous year date range
  const previousYearDateRange = useMemo(() => {
    const startDate = new Date(activeDateRange.start);
    const endDate = new Date(activeDateRange.end);
    startDate.setFullYear(startDate.getFullYear() - 1);
    endDate.setFullYear(endDate.getFullYear() - 1);
    return {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
    };
  }, [activeDateRange]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch current period data
        const currentResponse = await fetch(
          `/api/dashboard-data?startDate=${activeDateRange.start}&endDate=${activeDateRange.end}`
        );
        if (!currentResponse.ok) {
          const errorData = await currentResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Erreur HTTP: ${currentResponse.status}`);
        }
        const currentData = await currentResponse.json();
        setMasterData(currentData);

        // Fetch previous year data for YOY comparison
        if (showYOYComparison) {
          const prevResponse = await fetch(
            `/api/dashboard-data?startDate=${previousYearDateRange.start}&endDate=${previousYearDateRange.end}`
          );
          if (prevResponse.ok) {
            const prevData = await prevResponse.json();
            setPreviousYearData(prevData);
          } else {
            setPreviousYearData([]);
          }
        } else {
          setPreviousYearData([]);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeDateRange, previousYearDateRange, showYOYComparison]);

  const filteredData = useMemo(() => {
    if (!masterData) return [];
    return masterData.filter(
      (d) =>
        (filters.salesReps.length === 0 || filters.salesReps.includes(d.salesRepName)) &&
        (filters.itemCodes.length === 0 || filters.itemCodes.includes(d.itemCode)) &&
        (filters.customers.length === 0 || filters.customers.includes(d.customerName))
    );
  }, [masterData, filters]);

  const filteredPreviousData = useMemo(() => {
    if (!previousYearData) return [];
    return previousYearData.filter(
      (d) =>
        (filters.salesReps.length === 0 || filters.salesReps.includes(d.salesRepName)) &&
        (filters.itemCodes.length === 0 || filters.itemCodes.includes(d.itemCode)) &&
        (filters.customers.length === 0 || filters.customers.includes(d.customerName))
    );
  }, [previousYearData, filters]);

  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
  }, [filteredData]);

  const applyFilters = () => {
    setActiveDateRange(stagedDateRange);
    setFilters((prev) => ({
      ...prev,
      itemCodes: [],
      customers: [],
      salesReps: stagedSelectedRep ? [stagedSelectedRep] : [],
    }));
  };

  const handleSelect = (category: keyof FilterState, value: string, isShiftClick: boolean = false) => {
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
      if (category === "salesReps" && !isShiftClick)
        setStagedSelectedRep(newValues.length === 1 ? newValues[0] : "");
      return { ...prev, [category]: newValues };
    });
  };

  const resetFilters = () => {
    setStagedDateRange(defaultDateRange);
    setStagedSelectedRep("");
    setActiveDateRange(defaultDateRange);
    setFilters({ salesReps: [], itemCodes: [], customers: [] });
  };

  const hasActiveFilters =
    filters.salesReps.length > 0 ||
    filters.itemCodes.length > 0 ||
    filters.customers.length > 0 ||
    JSON.stringify(activeDateRange) !== JSON.stringify(defaultDateRange);

  const allSalesReps = useMemo(
    () => (masterData ? Array.from(new Set(masterData.map((d) => d.salesRepName))).sort() : []),
    [masterData]
  );

  // Count unique active sales reps in filtered data
  const activeExpertsCount = useMemo(() => {
    const uniqueReps = new Set(filteredData.map((d) => d.salesRepName));
    return uniqueReps.size;
  }, [filteredData]);

  // Current period metrics
  const totalSales = useMemo(
    () => filteredData.reduce((sum, d) => sum + d.salesValue, 0),
    [filteredData]
  );
  const transactionCount = useMemo(() => filteredData.length, [filteredData]);
  const averageTransactionValue = useMemo(
    () => (transactionCount > 0 ? totalSales / transactionCount : 0),
    [totalSales, transactionCount]
  );

  // Previous year metrics
  const previousTotalSales = useMemo(
    () => filteredPreviousData.reduce((sum, d) => sum + d.salesValue, 0),
    [filteredPreviousData]
  );
  const previousTransactionCount = useMemo(() => filteredPreviousData.length, [filteredPreviousData]);

  // Create fixed color mapping for sales reps
  const salesRepColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    allSalesReps.forEach((rep, index) => {
      map[rep] = pieColors[index % pieColors.length];
    });
    map["Autres"] = mode === "dark" ? "#303a47" : "#d1d5db";
    return map;
  }, [allSalesReps, pieColors, mode]);

  const salesByRep = useMemo(() => {
    const allReps = aggregateData(filteredData, "salesRepName");
    if (allReps.length <= 8) return allReps;
    const top = allReps.slice(0, 8);
    const othersValue = allReps.slice(8).reduce((s, r) => s + r.value, 0);
    return [...top, { name: "Autres", value: othersValue }];
  }, [filteredData]);

  const salesByItem = useMemo(
    () => aggregateData(filteredData, "itemCode", showAllProducts ? undefined : 10),
    [filteredData, showAllProducts]
  );

  const salesByCustomer = useMemo(
    () => aggregateData(filteredData, "customerName", showAllCustomers ? undefined : 10),
    [filteredData, showAllCustomers]
  );

  // Transaction count by month
  const transactionsByMonth = useMemo(() => {
    const current = filteredData.reduce((acc, d) => {
      const monthKey = d.invoiceDate.slice(0, 7);
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const previous = filteredPreviousData.reduce((acc, d) => {
      const monthKey = d.invoiceDate.slice(0, 7);
      const adjustedMonth = monthKey.replace(/^(\d{4})/, (match, year) => String(parseInt(year) + 1));
      acc[adjustedMonth] = (acc[adjustedMonth] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const allMonths = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)])).sort();

    return allMonths.map((month) => ({
      name: month,
      current: current[month] || 0,
      previous: previous[month] || 0,
    }));
  }, [filteredData, filteredPreviousData]);

  // Sales comparison by month
  const salesComparisonByMonth = useMemo(() => {
    const current = filteredData.reduce((acc, d) => {
      const monthKey = d.invoiceDate.slice(0, 7);
      acc[monthKey] = (acc[monthKey] || 0) + d.salesValue;
      return acc;
    }, {} as Record<string, number>);

    const previous = filteredPreviousData.reduce((acc, d) => {
      const monthKey = d.invoiceDate.slice(0, 7);
      const adjustedMonth = monthKey.replace(/^(\d{4})/, (match, year) => String(parseInt(year) + 1));
      acc[adjustedMonth] = (acc[adjustedMonth] || 0) + d.salesValue;
      return acc;
    }, {} as Record<string, number>);

    const allMonths = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)])).sort();

    return allMonths.map((month) => ({
      name: month.slice(5),
      current: current[month] || 0,
      previous: previous[month] || 0,
      growth: previous[month] > 0 ? ((current[month] || 0) - previous[month]) / previous[month] : 0,
    }));
  }, [filteredData, filteredPreviousData]);

  if (error) return <ErrorState message={error.message} />;
  if (!mounted) return <LoadingState />;
  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div
        className="rounded-3xl border backdrop-blur-2xl relative overflow-hidden"
        style={{
          borderColor: t.cardBorder,
          background: `linear-gradient(135deg, ${t.card} 0%, ${mode === "dark" ? "rgba(139,92,246,0.02)" : "rgba(124,58,237,0.04)"} 100%)`,
        }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl" style={{ background: `linear-gradient(to bottom right, ${t.haloCyan}, ${t.haloViolet})` }} />
        <div className="px-6 py-6 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl backdrop-blur-xl" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(139,92,246,0.2))" }}>
                  <BarChart3 className="w-6 h-6" style={{ color: t.accentPrimary }} />
                </div>
                <h1
                  className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight"
                  style={{ color: t.foreground }}
                >
                  SINTO Analytics<span style={{ color: t.accentPrimary }}>.</span>
                </h1>
              </div>
              <p className="text-sm ml-12" style={{ color: t.label }}>
                Intelligence d&apos;affaires en temps réel avec analyse comparative YOY
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-3">
              <button
                onClick={() => setShowYOYComparison(!showYOYComparison)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border"
                style={{
                  color: showYOYComparison ? t.accentPrimary : t.label,
                  background: showYOYComparison ? "linear-gradient(90deg, rgba(34,211,238,0.2), rgba(139,92,246,0.2))" : t.cardSoft,
                  borderColor: showYOYComparison ? "rgba(34,211,238,0.3)" : t.cardBorder,
                  boxShadow: showYOYComparison ? "0 6px 16px rgba(34,211,238,0.2)" : "none",
                }}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Comparaison YOY
              </button>

              <select
                value={stagedSelectedRep}
                onChange={(e) => setStagedSelectedRep(e.target.value)}
                className="appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none transition-all"
                style={{
                  background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                  border: `1px solid ${t.cardBorder}`,
                  color: t.foreground,
                  boxShadow: "0 0 0 2px transparent",
                }}
              >
                <option value="">Tous les experts</option>
                {allSalesReps.map((rep) => (
                  <option key={rep} value={rep}>
                    {rep}
                  </option>
                ))}
              </select>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={stagedDateRange.start}
                    onChange={(e) => setStagedDateRange((p) => ({ ...p, start: e.target.value }))}
                    className="rounded-xl px-3 py-2 text-sm focus:outline-none transition-all"
                    style={{
                      background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                      border: `1px solid ${t.cardBorder}`,
                      color: t.foreground,
                    }}
                  />
                  <span className="text-sm" style={{ color: t.label }}>
                    à
                  </span>
                  <input
                    type="date"
                    value={stagedDateRange.end}
                    onChange={(e) => setStagedDateRange((p) => ({ ...p, end: e.target.value }))}
                    className="rounded-xl px-3 py-2 text-sm focus:outline-none transition-all"
                    style={{
                      background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                      border: `1px solid ${t.cardBorder}`,
                      color: t.foreground,
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const today = new Date();
                      const yearStart = new Date(today.getFullYear(), 0, 1);
                      setStagedDateRange({
                        start: yearStart.toISOString().slice(0, 10),
                        end: today.toISOString().slice(0, 10),
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border"
                    style={{
                      background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                      color: t.label,
                      borderColor: t.cardBorder,
                    }}
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
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border"
                    style={{
                      background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                      color: t.label,
                      borderColor: t.cardBorder,
                    }}
                  >
                    TTM
                  </button>
                </div>
              </div>

              <button
                onClick={applyFilters}
                className="px-6 py-2.5 rounded-xl text-sm font-bold hover:scale-105 transition-all duration-300 shadow-2xl"
                style={{
                  color: "#000",
                  background: "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)",
                  boxShadow: "0 10px 30px rgba(34, 211, 238, 0.35)",
                }}
              >
                Appliquer
              </button>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 border backdrop-blur-xl"
                  style={{
                    color: t.foreground,
                    background: t.cardSoft,
                    borderColor: t.cardBorder,
                  }}
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards with YOY comparison */}
      <div className="grid grid-cols-12 gap-4">
        <KpiCard
          title="Chiffre d'affaires total"
          icon={<DollarSign className="w-5 h-5" />}
          gradient="rgba(34,211,238,0.2), rgba(59,130,246,0.2)"
          className="col-span-12 md:col-span-6 lg:col-span-3"
          t={t}
          mode={mode}
        >
          <p className="text-3xl font-bold tracking-tight" style={{ color: t.foreground }}>
            <AnimatedNumber value={totalSales} format={currency} />
          </p>
          {showYOYComparison && previousTotalSales > 0 && (
            <YOYIndicator current={totalSales} previous={previousTotalSales} />
          )}
        </KpiCard>

        <KpiCard
          title="Nombre de transactions"
          icon={<Package className="w-5 h-5" />}
          gradient="rgba(139,92,246,0.2), rgba(147,51,234,0.2)"
          className="col-span-12 md:col-span-6 lg:col-span-3"
          t={t}
          mode={mode}
        >
          <p className="text-3xl font-bold tracking-tight" style={{ color: t.foreground }}>
            <AnimatedNumber value={transactionCount} format={formatNumber} />
          </p>
          {showYOYComparison && previousTransactionCount > 0 && (
            <YOYIndicator current={transactionCount} previous={previousTransactionCount} />
          )}
        </KpiCard>

        <KpiCard
          title="Valeur moyenne/transaction"
          icon={<Activity className="w-5 h-5" />}
          gradient="rgba(16,185,129,0.2), rgba(13,148,136,0.2)"
          className="col-span-12 md:col-span-6 lg:col-span-3"
          t={t}
          mode={mode}
        >
          <p className="text-3xl font-bold tracking-tight" style={{ color: t.foreground }}>
            <AnimatedNumber value={averageTransactionValue} format={currency} />
          </p>
          {showYOYComparison && previousTransactionCount > 0 && (
            <YOYIndicator
              current={averageTransactionValue}
              previous={previousTransactionCount ? previousTotalSales / previousTransactionCount : 0}
            />
          )}
        </KpiCard>

        <KpiCard
          title="Experts actifs"
          icon={<Users className="w-5 h-5" />}
          gradient="rgba(245,158,11,0.2), rgba(234,88,12,0.2)"
          className="col-span-12 md:col-span-6 lg:col-span-3"
          t={t}
          mode={mode}
        >
          <p className="text-3xl font-bold tracking-tight" style={{ color: t.foreground }}>
            {activeExpertsCount}
          </p>
          <p className="text-sm mt-2" style={{ color: t.label }}>
            sur {allSalesReps.length} total
          </p>
        </KpiCard>
      </div>

      {/* YOY Comparison Section */}
      {showYOYComparison && (
        <div className="grid grid-cols-12 gap-4">
          <ChartCard title="Comparaison YOY - Chiffre d'affaires" className="col-span-12 lg:col-span-8" t={t}>
            <ResponsiveContainer key={`salesCompare-${mode}`} width="100%" height={300}>
              <ComposedChart data={salesComparisonByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.3} />
                <XAxis dataKey="name" tick={{ fill: t.labelMuted, fontSize: 11 }} stroke={t.grid} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={compactCurrency}
                  tick={{ fill: t.labelMuted, fontSize: 11 }}
                  stroke={t.grid}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={percentage}
                  tick={{ fill: t.labelMuted, fontSize: 11 }}
                  stroke={t.grid}
                />
                <Tooltip content={<CustomTooltip format="auto" themeTokens={t} mode={mode} />} />
                <Legend />
                <Bar yAxisId="left" dataKey="previous" fill={t.labelMuted} name="Année précédente" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="left" dataKey="current" fill={t.accentPrimary} name="Période actuelle" radius={[6, 6, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="growth"
                  stroke={t.success}
                  strokeWidth={3}
                  dot={{ fill: t.success, r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Croissance %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Performance comparative" className="col-span-12 lg:col-span-4" t={t}>
            <div className="space-y-4">
              <div className="p-4 rounded-xl backdrop-blur-xl border" style={{ background: t.cardSoft, borderColor: t.cardBorder }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs uppercase tracking-wider" style={{ color: t.label }}>
                    CA période actuelle
                  </span>
                  <Zap className="w-4 h-4" style={{ color: t.accentPrimary }} />
                </div>
                <div className="text-2xl font-bold" style={{ color: t.foreground }}>
                  {currency(totalSales)}
                </div>
              </div>

              <div className="p-4 rounded-xl backdrop-blur-xl border" style={{ background: t.cardSoft, borderColor: t.cardBorder }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs uppercase tracking-wider" style={{ color: t.label }}>
                    CA année précédente
                  </span>
                  <Calendar className="w-4 h-4" style={{ color: t.accentSecondary }} />
                </div>
                <div className="text-2xl font-bold" style={{ color: t.label }}>
                  {currency(previousTotalSales)}
                </div>
              </div>

              <div
                className="p-4 rounded-xl backdrop-blur-xl border"
                style={{
                  background: "linear-gradient(135deg, rgba(34,211,238,0.10), rgba(139,92,246,0.10))",
                  borderColor: "rgba(34,211,238,0.2)",
                }}
              >
                <div className="text-xs uppercase tracking-wider mb-2" style={{ color: t.label }}>
                  Variation YOY
                </div>
                <div className="text-3xl font-bold" style={{ color: t.foreground }}>
                  {previousTotalSales > 0 ? percentage((totalSales - previousTotalSales) / previousTotalSales) : "N/A"}
                </div>
                <div className="mt-2 text-xs" style={{ color: t.label }}>
                  Différence: {currency(totalSales - previousTotalSales)}
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      )}

      {/* Main Charts */}
      <div className="grid grid-cols-12 gap-4">
        <ChartCard title="Répartition par expert" className="col-span-12 lg:col-span-5" t={t}>
          <ResponsiveContainer key={`byRep-${mode}`} width="100%" height={350}>
            <PieChart>
              <Pie
                data={salesByRep}
                dataKey="value"
                nameKey="name"
                innerRadius="65%"
                outerRadius="95%"
                paddingAngle={3}
                animationBegin={0}
                animationDuration={1000}
              >
                {salesByRep.map((entry) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={salesRepColorMap[entry.name]}
                    onClick={(e) =>
                      entry.name !== "Autres" &&
                      handleSelect("salesReps", entry.name, (e as any).shiftKey)
                    }
                    className={entry.name === "Autres" ? "" : "cursor-pointer hover:opacity-85 transition-all duration-300"}
                    style={{
                      filter:
                        filters.salesReps.length === 0 || filters.salesReps.includes(entry.name)
                          ? "none"
                          : "grayscale(80%)",
                      opacity:
                        filters.salesReps.length === 0 || filters.salesReps.includes(entry.name)
                          ? 1
                          : 0.25,
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip themeTokens={t} mode={mode} />} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ paddingLeft: 20 }}
                content={(props: any) => {
                  const patchedPayload =
                    props?.payload?.map((p: any) => ({
                      ...p,
                      color: salesRepColorMap[p.value] || p.color,
                    })) ?? [];
                  return (
                    <CustomLegend
                      payload={patchedPayload}
                      selectedItems={filters.salesReps}
                      onLegendClick={(v: string) => v !== "Autres" && handleSelect("salesReps", v)}
                      themeTokens={t}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Évolution du nombre de transactions" className="col-span-12 lg:col-span-7" t={t}>
          <ResponsiveContainer key={`txByMonth-${mode}`} width="100%" height={350}>
            <LineChart data={transactionsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.3} />
              <XAxis dataKey="name" tick={{ fill: t.labelMuted, fontSize: 11 }} stroke={t.grid} />
              <YAxis tick={{ fill: t.labelMuted, fontSize: 11 }} stroke={t.grid} />
              <Tooltip content={<CustomTooltip format="number" themeTokens={t} mode={mode} />} />
              <Legend />
              {showYOYComparison && (
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke={t.labelMuted}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Année précédente"
                  dot={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="current"
                stroke={t.accentSecondary}
                strokeWidth={3}
                name="Période actuelle"
                dot={{ fill: t.accentSecondary, r: 5 }}
                activeDot={{ r: 8, fill: t.accentSecondary }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={
            <div className="flex items-center justify-between w-full">
              <span>Top {showAllProducts ? "produits" : "10 produits"}</span>
              <button
                onClick={() => setShowAllProducts(!showAllProducts)}
                className="text-xs transition-colors flex items-center gap-1"
                style={{ color: t.accentPrimary }}
              >
                {showAllProducts ? "Voir moins" : "Voir tout"}
                <ChevronRight className={`w-3 h-3 transition-transform ${showAllProducts ? "rotate-90" : ""}`} />
              </button>
            </div>
          }
          className="col-span-12 xl:col-span-6"
          t={t}
        >
          <ResponsiveContainer
            key={`topItems-${mode}-${animationKey}`}
            width="100%"
            height={showAllProducts ? Math.max(400, salesByItem.length * 35) : 400}
          >
            <BarChart data={salesByItem} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.3} />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fill: t.labelMuted, fontSize: 11 }}
                stroke={t.grid}
              />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: t.label, fontSize: 11 }} stroke="none" />
              <Tooltip content={<CustomTooltip themeTokens={t} mode={mode} />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={1000}>
                {salesByItem.map((entry, index) => (
                  <Cell
                    key={`cell-item-${index}-${animationKey}`}
                    fill={`${t.accentPrimary}${Math.round(255 * (1 - index / salesByItem.length))
                      .toString(16)
                      .padStart(2, "0")}`}
                    onClick={(e) => handleSelect("itemCodes", entry.name, (e as any).shiftKey)}
                    className="cursor-pointer hover:brightness-110 transition-all"
                    style={{
                      filter:
                        filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name)
                          ? "none"
                          : "grayscale(80%)",
                      opacity:
                        filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name) ? 1 : 0.3,
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={
            <div className="flex items-center justify-between w-full">
              <span>Top {showAllCustomers ? "clients" : "10 clients"}</span>
              <button
                onClick={() => setShowAllCustomers(!showAllCustomers)}
                className="text-xs transition-colors flex items-center gap-1"
                style={{ color: t.accentPrimary }}
              >
                {showAllCustomers ? "Voir moins" : "Voir tout"}
                <ChevronRight className={`w-3 h-3 transition-transform ${showAllCustomers ? "rotate-90" : ""}`} />
              </button>
            </div>
          }
          className="col-span-12 xl:col-span-6"
          t={t}
        >
          <ResponsiveContainer
            key={`topCustomers-${mode}-${animationKey}`}
            width="100%"
            height={showAllCustomers ? Math.max(400, salesByCustomer.length * 35) : 400}
          >
            <BarChart data={salesByCustomer} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.3} />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fill: t.labelMuted, fontSize: 11 }}
                stroke={t.grid}
              />
              <YAxis type="category" dataKey="name" width={160} tick={{ fill: t.label, fontSize: 11 }} stroke="none" />
              <Tooltip content={<CustomTooltip themeTokens={t} mode={mode} />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={1000}>
                {salesByCustomer.map((entry, index) => (
                  <Cell
                    key={`cell-cust-${index}-${animationKey}`}
                    fill={`${t.accentSecondary}${Math.round(255 * (1 - index / salesByCustomer.length))
                      .toString(16)
                      .padStart(2, "0")}`}
                    onClick={(e) => handleSelect("customers", entry.name, (e as any).shiftKey)}
                    className="cursor-pointer hover:brightness-110 transition-all"
                    style={{
                      filter:
                        filters.customers.length === 0 || filters.customers.includes(entry.name)
                          ? "none"
                          : "grayscale(80%)",
                      opacity:
                        filters.customers.length === 0 || filters.customers.includes(entry.name) ? 1 : 0.3,
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

/* =============================================================================
   Page wrapper
============================================================================= */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const mode: "dark" | "light" = mounted && resolvedTheme === "light" ? "light" : "dark";
  const t = THEME[mode];

  if (!mounted || status === "loading") return <LoadingState />;
  if (status === "unauthenticated" || session?.user?.role !== "ventes-exec") return <AccessDenied />;

  return (
    <main
      className={`min-h-screen ${inter.className}`}
      style={{
        background: `linear-gradient(180deg, ${t.bg} 0%, ${mode === "dark" ? "#050507" : "#ffffff"} 100%)`,
        color: t.foreground,
      }}
    >
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: t.haloCyan }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: t.haloViolet }} />
      </div>
      <div className="px-4 md:px-6 lg:px-8 py-6 md:py-8 relative z-10">
        <div className="mx-auto w-full max-w-[1920px]">
          <DashboardContent />
        </div>
      </div>
    </main>
  );
}
