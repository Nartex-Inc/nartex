// src/app/(dashboard)/page.tsx
"use client";

import LoadingAnimation from "@/components/LoadingAnimation";
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
  X as CloseIcon,
  ArrowUpDown,
  UserPlus,
} from "lucide-react";
import { THEME, PIE_COLORS_DARK, PIE_COLORS_LIGHT } from "@/lib/theme-tokens";

type ThemeTokens = (typeof THEME)[keyof typeof THEME];
type YoyFilter = "all" | "growth" | "loss";

const RETENTION_THRESHOLD = 300; // $ CAD both years
const NEW_CUSTOMER_MIN_SPEND = 30; // $ CAD this year to be listed

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
  invoiceDate: string; // YYYY-MM-DD
  salesValue: number;
};

type FilterState = {
  salesReps: string[];
  itemCodes: string[];
  customers: string[];
};

type PerfRow = { key: string; prev: number; curr: number; rate: number; delta: number };

const currency = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const compactCurrency = (n: number) =>
  new Intl.NumberFormat("fr-CA", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
    style: "currency",
    currency: "CAD",
  }).format(n);

const percentage = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

const formatNumber = (n: number) => new Intl.NumberFormat("fr-CA").format(Math.round(n));

/* =============================================================================
   Animated number
============================================================================= */
const AnimatedNumber = ({ value, format, duration = 700 }: { value: number; format: (n: number) => string; duration?: number }) => {
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
      if (progress < 1) animationFrameRef.current = requestAnimationFrame(animate);
      else {
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

const YOYIndicator = ({ current, previous }: { current: number; previous: number }) => {
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
        {isNeutral ? <Minus className="w-3 h-3" /> : isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{percentage(Math.abs(change))}</span>
      </div>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">vs année précédente</span>
    </div>
  );
};

/* =============================================================================
   Custom Recharts bits
============================================================================= */
function CustomTooltip({ active, payload, label, format = "currency", themeTokens, mode }: any) {
  if (active && payload?.length) {
    return (
      <div
        className="backdrop-blur-2xl border rounded-xl px-4 py-3 shadow-2xl"
        style={{ background: themeTokens.tooltipBg, borderColor: themeTokens.cardBorder }}
      >
        <p className="text-xs mb-2 font-medium" style={{ color: themeTokens.labelMuted }}>
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 mb-1">
            <div className="w-2.5 h-2.5 rounded-full shadow" style={{ backgroundColor: entry.color, boxShadow: `0 0 10px ${entry.color}50` }} />
            <p className="text-sm font-semibold" style={{ color: mode === "dark" ? "#ffffff" : "#111827" }}>
              {entry.name}:{" "}
              {format === "number" ? formatNumber(entry.value) : format === "percentage" ? percentage(entry.value) : currency(entry.value)}
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
                boxShadow: isSelected ? `0 0 12px ${entry.color}60, 0 0 0 1px rgba(255,255,255,0.2) inset` : "0 0 0 1px rgba(0,0,0,0.08) inset",
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
   Aggregation helpers
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
function totalsByRep(records: SalesRecord[]) {
  return records.reduce((acc, r) => {
    acc[r.salesRepName] = (acc[r.salesRepName] || 0) + r.salesValue;
    return acc;
  }, {} as Record<string, number>);
}
function totalsByRepCustomer(records: SalesRecord[]) {
  const out: Record<string, Record<string, number>> = {};
  for (const r of records) {
    out[r.salesRepName] ??= {};
    out[r.salesRepName][r.customerName] = (out[r.salesRepName][r.customerName] || 0) + r.salesValue;
  }
  return out;
}
// generic totals by key
function totalsByKey<T extends keyof SalesRecord>(records: SalesRecord[], key: T) {
  return records.reduce((acc, r) => {
    const k = r[key] as unknown as string;
    acc[k] = (acc[k] || 0) + r.salesValue;
    return acc;
  }, {} as Record<string, number>);
}

/* =============================================================================
   Simple states
============================================================================= */
const LoadingState = () => <LoadingAnimation />;

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
        Veuillez contacter votre département TI pour obtenir l&apos;accès approprié.
      </p>
    </div>
  </div>
);

/* =============================================================================
   UI primitives
============================================================================= */
function KpiCard({
  title,
  icon,
  gradient,
  children,
  className,
  t,
  mode,
  onClick,
}: {
  title: string;
  icon?: React.ReactNode;
  gradient?: string;
  children: React.ReactNode;
  className?: string;
  t: ThemeTokens;
  mode: "dark" | "light";
  onClick?: () => void;
}) {
  const clickable = typeof onClick === "function";
  return (
    <div className={`group relative ${className ?? ""}`}>
      <div
        className="absolute -inset-0.5 rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition duration-700"
        style={{ background: gradient ? `linear-gradient(135deg, ${gradient})` : t.gradientPrimary }}
      />
      <div
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => clickable && (e.key === "Enter" || e.key === " ") && onClick?.()}
        className={`relative rounded-2xl p-6 h-full backdrop-blur-xl border transition-all duration-300 hover:border-white/10 ${
          clickable ? "cursor-pointer focus:outline-none" : ""
        }`}
        style={{ background: `linear-gradient(135deg, ${t.card} 0%, ${t.soft} 100%)`, borderColor: t.cardBorder, color: t.foreground }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: t.labelMuted }}>
            {title}
          </h3>
          {icon && (
            <div
              className="p-2 rounded-lg backdrop-blur-xl"
              style={{
                background: gradient ? `linear-gradient(135deg, ${gradient})` : "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(139,92,246,0.2))",
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

function ChartCard({ title, children, className, t }: { title: React.ReactNode; children: React.ReactNode; className?: string; t: ThemeTokens }) {
  return (
    <div className={`group relative ${className ?? ""}`}>
      <div className="absolute -inset-0.5 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition duration-700" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(139,92,246,0.15))" }} />
      <div
        className="relative rounded-2xl p-5 border h-full flex flex-col backdrop-blur-xl transition-all duration-300 hover:border-white/10"
        style={{ background: `linear-gradient(135deg, ${t.card} 0%, ${t.soft} 100%)`, borderColor: t.cardBorder, color: t.foreground }}
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
   Main dashboard
============================================================================= */
const DashboardContent = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const mode: "dark" | "light" = mounted && resolvedTheme === "light" ? "light" : "dark";

  const t: ThemeTokens = THEME[mode];
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

  const [filters, setFilters] = useState<FilterState>({ salesReps: [], itemCodes: [], customers: [] });
  const [yoyFilter, setYoyFilter] = useState<YoyFilter>("all");

  const [animationKey, setAnimationKey] = useState(0);
  const [masterData, setMasterData] = useState<SalesRecord[] | null>(null);
  const [previousYearData, setPreviousYearData] = useState<SalesRecord[] | null>(null);

  // 7-year historical data (ending the day before the current period starts)
  const [history7yData, setHistory7yData] = useState<SalesRecord[] | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Modals
  const [showRetentionTable, setShowRetentionTable] = useState(false);
  const [retentionSortAsc, setRetentionSortAsc] = useState(false);

  const [showNewCustomersModal, setShowNewCustomersModal] = useState(false);
  const [newSortAsc, setNewSortAsc] = useState(false);
  const [newTab, setNewTab] = useState<"list" | "reps">("list");

  // Rep growth modal
  const [showRepGrowthModal, setShowRepGrowthModal] = useState(false);
  const [repGrowthTab, setRepGrowthTab] = useState<"growth" | "loss">("growth");

  // Customer growth modal
  const [showCustomerGrowthModal, setShowCustomerGrowthModal] = useState(false);
  const [customerGrowthTab, setCustomerGrowthTab] = useState<"growth" | "loss">("growth");

  // Previous-period range
  const previousYearDateRange = useMemo(() => {
    const startDate = new Date(activeDateRange.start);
    const endDate = new Date(activeDateRange.end);
    startDate.setFullYear(startDate.getFullYear() - 1);
    endDate.setFullYear(endDate.getFullYear() - 1);
    return { start: startDate.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) };
  }, [activeDateRange]);

  // 7-year lookback window (company-wide), ending the day before the current period starts
  const lookback7y = useMemo(() => {
    const start = new Date(activeDateRange.start);
    const end = new Date(activeDateRange.start);
    start.setFullYear(start.getFullYear() - 7);
    end.setDate(end.getDate() - 1); // exclude the current period
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, [activeDateRange.start]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // current period
        const currentResponse = await fetch(`/api/dashboard-data?startDate=${activeDateRange.start}&endDate=${activeDateRange.end}`);
        if (!currentResponse.ok) {
          const errorData = await currentResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Erreur HTTP: ${currentResponse.status}`);
        }
        const currentData = await currentResponse.json();
        setMasterData(currentData);

        // previous-year period (keep for YOY & retention)
        const prevResponse = await fetch(`/api/dashboard-data?startDate=${previousYearDateRange.start}&endDate=${previousYearDateRange.end}`);
        setPreviousYearData(prevResponse.ok ? await prevResponse.json() : []);

        // 7-year lookback history (company-wide)
        const histResp = await fetch(`/api/dashboard-data?startDate=${lookback7y.start}&endDate=${lookback7y.end}`);
        setHistory7yData(histResp.ok ? await histResp.json() : []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeDateRange, previousYearDateRange, lookback7y]);

  const allSalesReps = useMemo(() => (masterData ? Array.from(new Set(masterData.map((d) => d.salesRepName))).sort() : []), [masterData]);

  // YOY class per rep (for charts)
  const yoyClassSets = useMemo(() => {
    const currentTotals = totalsByRep(masterData ?? []);
    const prevTotals = totalsByRep(previousYearData ?? []);
    const growth = new Set<string>();
    const loss = new Set<string>();
    const reps = new Set<string>([...Object.keys(currentTotals), ...Object.keys(prevTotals)]);
    for (const rep of reps) {
      const prev = prevTotals[rep] || 0;
      const curr = currentTotals[rep] || 0;
      if (prev <= 0) continue;
      const delta = curr - prev;
      if (delta > 0) growth.add(rep);
      else if (delta < 0) loss.add(rep);
    }
    return { growth, loss };
  }, [masterData, previousYearData]);

  // ---- Filter helpers
  const recordPassesBasicFilters = (d: SalesRecord) => {
    const repSelected = filters.salesReps.length === 0 || filters.salesReps.includes(d.salesRepName);
    const itemSelected = filters.itemCodes.length === 0 || filters.itemCodes.includes(d.itemCode);
    const customerSelected = filters.customers.length === 0 || filters.customers.includes(d.customerName);
    return repSelected && itemSelected && customerSelected;
  };

  // Filtered datasets (respect YOY segmented filter if no rep selected)
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
  }, [masterData, filters, yoyFilter, yoyClassSets]);

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
  }, [previousYearData, filters, yoyFilter, yoyClassSets]);

  // Filtered datasets but IGNORING the YOY segmented control (for the new % KPIs)
  const filteredDataNoYoy = useMemo(() => (masterData ? masterData.filter(recordPassesBasicFilters) : []), [masterData, filters]);
  const filteredPreviousDataNoYoy = useMemo(
    () => (previousYearData ? previousYearData.filter(recordPassesBasicFilters) : []),
    [previousYearData, filters]
  );

  useEffect(() => setAnimationKey((prev) => prev + 1), [filteredData]);

  const applyFilters = () => {
    setActiveDateRange(stagedDateRange);
    setFilters((prev) => ({ ...prev, itemCodes: [], customers: [], salesReps: stagedSelectedRep ? [stagedSelectedRep] : [] }));
  };

  const handleSelect = (category: keyof FilterState, value: string, isShiftClick = false) => {
    setFilters((prev) => {
      const existing = prev[category];
      const isSelected = existing.includes(value);
      const newValues = isShiftClick ? (isSelected ? existing.filter((v) => v !== value) : [...existing, value]) : isSelected && existing.length === 1 ? [] : [value];
      if (category === "salesReps" && !isShiftClick) setStagedSelectedRep(newValues.length === 1 ? newValues[0] : "");
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

  // ----- KPIs -----
  const totalSales = useMemo(() => filteredData.reduce((s, d) => s + d.salesValue, 0), [filteredData]);
  const transactionCount = useMemo(() => filteredData.length, [filteredData]);
  const averageTransactionValue = useMemo(() => (transactionCount > 0 ? totalSales / transactionCount : 0), [totalSales, transactionCount]);

  const previousTotalSales = useMemo(() => filteredPreviousData.reduce((s, d) => s + d.salesValue, 0), [filteredPreviousData]);
  const previousTransactionCount = useMemo(() => filteredPreviousData.length, [filteredPreviousData]);

  // Colors for reps
  const salesRepColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const reps = masterData ? Array.from(new Set(masterData.map((d) => d.salesRepName))).sort() : [];
    reps.forEach((rep, idx) => (map[rep] = pieColors[idx % pieColors.length]));
    map["Autres"] = mode === "dark" ? "#303a47" : "#d1d5db";
    return map;
  }, [masterData, pieColors, mode]);

  // Charts data
  const salesByRep = useMemo(() => {
    const allReps = aggregateData(filteredData, "salesRepName");
    if (allReps.length <= 8) return allReps;
    const top = allReps.slice(0, 8);
    const othersValue = allReps.slice(8).reduce((s, r) => s + r.value, 0);
    return [...top, { name: "Autres", value: othersValue }];
  }, [filteredData]);

  const salesByItem = useMemo(() => aggregateData(filteredData, "itemCode", showAllProducts ? undefined : 10), [filteredData, showAllProducts]);
  const salesByCustomer = useMemo(
    () => aggregateData(filteredData, "customerName", showAllCustomers ? undefined : 10),
    [filteredData, showAllCustomers]
  );

  const transactionsByMonth = useMemo(() => {
    const current = filteredData.reduce((acc, d) => {
      const m = d.invoiceDate.slice(0, 7);
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const previous = filteredPreviousData.reduce((acc, d) => {
      const m = d.invoiceDate.slice(0, 7);
      const adjusted = m.replace(/^(\d{4})/, (match, y) => String(parseInt(y) + 1));
      acc[adjusted] = (acc[adjusted] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const allMonths = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)])).sort();
    return allMonths.map((m) => ({ name: m, current: current[m] || 0, previous: previous[m] || 0 }));
  }, [filteredData, filteredPreviousData]);

  const salesComparisonByMonth = useMemo(() => {
    const current = filteredData.reduce((acc, d) => {
      const m = d.invoiceDate.slice(0, 7);
      acc[m] = (acc[m] || 0) + d.salesValue;
      return acc;
    }, {} as Record<string, number>);
    const previous = filteredPreviousData.reduce((acc, d) => {
      const m = d.invoiceDate.slice(0, 7);
      const adjusted = m.replace(/^(\d{4})/, (match, y) => String(parseInt(y) + 1));
      acc[adjusted] = (acc[adjusted] || 0) + d.salesValue;
      return acc;
    }, {} as Record<string, number>);
    const allMonths = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)])).sort();
    return allMonths.map((m) => ({
      name: m.slice(5),
      current: current[m] || 0,
      previous: previous[m] || 0,
      growth: previous[m] > 0 ? ((current[m] || 0) - previous[m]) / previous[m] : 0,
    }));
  }, [filteredData, filteredPreviousData]);

  // ----- Retention calculations -----
  const retentionByRep = useMemo(() => {
    const prev = totalsByRepCustomer(previousYearData ?? []);
    const curr = totalsByRepCustomer(masterData ?? []);
    const result: Record<string, { eligible: number; retained: number; rate: number | null }> = {};
    const reps = new Set<string>([...Object.keys(prev), ...Object.keys(curr)]);
    reps.forEach((rep) => {
      const prevCusts = prev[rep] || {};
      const currCusts = curr[rep] || {};
      let eligible = 0;
      let retained = 0;
      for (const [cust, prevSpend] of Object.entries(prevCusts)) {
        if (prevSpend >= RETENTION_THRESHOLD) {
          eligible += 1;
          const currSpend = currCusts[cust] || 0;
          if (currSpend >= RETENTION_THRESHOLD) retained += 1;
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
      if (r && r.rate !== null) rates.push(r.rate);
    });
    const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
    return { avg, eligibleReps: rates.length, totalReps: visibleRepsForRetention.size };
  }, [retentionByRep, visibleRepsForRetention]);

  // ----- New Customers calculations -----
  // Set of ALL customers that bought at any point in last 7y (any rep)
  const prevCustomersSet = useMemo(() => new Set((history7yData ?? []).map((d) => d.customerName)), [history7yData]);

  // Current period: aggregate per customer and track first order's rep & date
  const currentCustomerAgg = useMemo(() => {
    type Agg = { total: number; orders: number; firstDate: string; firstRep: string };
    const map = new Map<string, Agg>();
    for (const r of filteredData) {
      const a = map.get(r.customerName);
      if (!a) {
        map.set(r.customerName, { total: r.salesValue, orders: 1, firstDate: r.invoiceDate, firstRep: r.salesRepName });
      } else {
        a.total += r.salesValue;
        a.orders += 1;
        if (r.invoiceDate < a.firstDate) {
          a.firstDate = r.invoiceDate;
          a.firstRep = r.salesRepName;
        }
      }
    }
    return map;
  }, [filteredData]);

  const newCustomersList = useMemo(() => {
    const rows: { customer: string; rep: string; spend: number; orders: number; firstDate: string }[] = [];
    currentCustomerAgg.forEach((agg, cust) => {
      const isPrevBuyer = prevCustomersSet.has(cust);
      if (!isPrevBuyer && agg.total >= NEW_CUSTOMER_MIN_SPEND) {
        rows.push({ customer: cust, rep: agg.firstRep, spend: agg.total, orders: agg.orders, firstDate: agg.firstDate });
      }
    });
    rows.sort((a, b) => (newSortAsc ? a.spend - b.spend : b.spend - a.spend));
    return rows;
  }, [currentCustomerAgg, prevCustomersSet, newSortAsc]);

  const newCustomersCount = newCustomersList.length;

  const newCustomersByRep = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of newCustomersList) m.set(row.rep, (m.get(row.rep) || 0) + 1);
    return Array.from(m.entries())
      .map(([rep, count]) => ({ rep, count }))
      .sort((a, b) => b.count - a.count);
  }, [newCustomersList]);

  // ----- NEW: % in growth KPIs (computed WITHOUT the YOY segmented filter) -----
  const repsPerf = useMemo(() => {
    const prev = totalsByKey(filteredPreviousDataNoYoy, "salesRepName");
    const curr = totalsByKey(filteredDataNoYoy, "salesRepName");
    const union = new Set<string>([...Object.keys(prev), ...Object.keys(curr)]);
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
    // Sort growth descending, loss ascending
    growth.sort((a, b) => b.rate - a.rate);
    loss.sort((a, b) => a.rate - b.rate);
    const pct = eligible > 0 ? growth.length / eligible : null;
    return { growth, loss, eligible, pct };
  }, [filteredDataNoYoy, filteredPreviousDataNoYoy]);

  const customersPerf = useMemo(() => {
    const prev = totalsByKey(filteredPreviousDataNoYoy, "customerName");
    const curr = totalsByKey(filteredDataNoYoy, "customerName");
    const union = new Set<string>([...Object.keys(prev), ...Object.keys(curr)]);
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
    // Sort growth descending, loss ascending
    growth.sort((a, b) => b.rate - a.rate);
    loss.sort((a, b) => a.rate - b.rate);
    const pct = eligible > 0 ? growth.length / eligible : null;
    return { growth, loss, eligible, pct };
  }, [filteredDataNoYoy, filteredPreviousDataNoYoy]);

  // Guard rails
  if (error) return <ErrorState message={error.message} />;
  if (!mounted) return <LoadingState />;
  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-3xl border backdrop-blur-2xl relative overflow-hidden"
        style={{ borderColor: t.cardBorder, background: `linear-gradient(135deg, ${t.card} 0%, ${mode === "dark" ? "rgba(139,92,246,0.02)" : "rgba(124,58,237,0.04)"} 100%)` }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl" style={{ background: `linear-gradient(to bottom right, ${t.haloCyan}, ${t.haloViolet})` }} />
        <div className="px-6 py-6 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl backdrop-blur-xl" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(139,92,246,0.2))" }}>
                  <BarChart3 className="w-6 h-6" style={{ color: t.accentPrimary }} />
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight" style={{ color: t.foreground }}>
                  Analyse des performances de ventes<span style={{ color: t.accentPrimary }}>.</span>
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

              {/* YOY segmented control */}
              <div className="flex rounded-xl overflow-hidden border" title="Filtrer les représentants par variation YOY" style={{ borderColor: t.cardBorder, background: t.cardSoft }}>
                {([
                  { key: "all", label: "Tous" },
                  { key: "growth", label: "Croissance" },
                  { key: "loss", label: "Baisse" },
                ] as { key: YoyFilter; label: string }[]).map((opt, idx) => {
                  const active = yoyFilter === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setYoyFilter(opt.key)}
                      className={`px-3 py-2 text-xs font-semibold transition-all ${idx !== 0 ? "border-l" : ""}`}
                      style={{
                        borderColor: t.cardBorder,
                        color: active ? "#000" : t.label,
                        background: active
                          ? opt.key === "growth"
                            ? "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(34,211,238,0.3))"
                            : opt.key === "loss"
                            ? "linear-gradient(135deg, rgba(239,68,68,0.3), rgba(234,179,8,0.25))"
                            : "linear-gradient(135deg, rgba(148,163,184,0.25), rgba(148,163,184,0.15))"
                          : "transparent",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <select
                value={stagedSelectedRep}
                onChange={(e) => setStagedSelectedRep(e.target.value)}
                className="appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none transition-all"
                style={{ background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)", border: `1px solid ${t.cardBorder}`, color: t.foreground }}
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
                    style={{ background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)", border: `1px solid ${t.cardBorder}`, color: t.foreground }}
                  />
                  <span className="text-sm" style={{ color: t.label }}>
                    à
                  </span>
                  <input
                    type="date"
                    value={stagedDateRange.end}
                    onChange={(e) => setStagedDateRange((p) => ({ ...p, end: e.target.value }))}
                    className="rounded-xl px-3 py-2 text-sm focus:outline-none transition-all"
                    style={{ background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)", border: `1px solid ${t.cardBorder}`, color: t.foreground }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const today = new Date();
                      const yearStart = new Date(today.getFullYear(), 0, 1);
                      setStagedDateRange({ start: yearStart.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) });
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border"
                    style={{ background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)", color: t.label, borderColor: t.cardBorder }}
                  >
                    YTD
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const yearAgo = new Date(today);
                      yearAgo.setDate(yearAgo.getDate() - 365);
                      setStagedDateRange({ start: yearAgo.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) });
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border"
                    style={{ background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)", color: t.label, borderColor: t.cardBorder }}
                  >
                    TTM
                  </button>
                </div>
              </div>

              <button
                onClick={applyFilters}
                className="px-6 py-2.5 rounded-xl text-sm font-bold hover:scale-105 transition-all duration-300 shadow-2xl"
                style={{ color: "#000", background: "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)", boxShadow: "0 10px 30px rgba(34, 211, 238, 0.35)" }}
              >
                Appliquer
              </button>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 border backdrop-blur-xl"
                  style={{ color: t.foreground, background: t.cardSoft, borderColor: t.cardBorder }}
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI rows */}
      <div className="grid grid-cols-12 gap-4">
        <KpiCard title="Chiffre d'affaires total" icon={<DollarSign className="w-5 h-5" />} gradient="rgba(34,211,238,0.2), rgba(59,130,246,0.2)" className="col-span-12 md:col-span-6 lg:col-span-2" t={t} mode={mode}>
          <p className="text-3xl font-bold tracking-tight" style={{ color: t.foreground }}>
            <AnimatedNumber value={totalSales} format={currency} />
          </p>
          {showYOYComparison && previousTotalSales > 0 && <YOYIndicator current={totalSales} previous={previousTotalSales} />}
        </KpiCard>

        <KpiCard title="Nombre de transactions" icon={<Package className="w-5 h-5" />} gradient="rgba(139,92,246,0.2), rgba(147,51,234,0.2)" className="col-span-12 md:col-span-6 lg:col-span-2" t={t} mode={mode}>
          <p className="text-3xl font-bold tracking-tight" style={{ color: t.foreground }}>
            <AnimatedNumber value={transactionCount} format={formatNumber} />
          </p>
          {showYOYComparison && previousTransactionCount > 0 && <YOYIndicator current={transactionCount} previous={previousTransactionCount} />}
        </KpiCard>

        <KpiCard
          title="% Reps en croissance"
          icon={<TrendingUp className="w-5 h-5" />}
          gradient="rgba(16,185,129,0.2), rgba(13,148,136,0.2)"
          className="col-span-12 md:col-span-6 lg:col-span-2"
          t={t}
          mode={mode}
          onClick={() => setShowRepGrowthModal(true)}
        >
          <p className="text-3xl font-bold tracking-tight" style={{ color: t.foreground }}>
            {repsPerf.pct === null ? "N/A" : percentage(repsPerf.pct)}
          </p>
          <p className="text-xs mt-2" style={{ color: t.label }}>
            {repsPerf.pct === null ? "Aucun rep. éligible" : `${repsPerf.growth.length} sur ${repsPerf.eligible} rep${repsPerf.eligible > 1 ? "s" : ""} éligible${repsPerf.eligible > 1 ? "s" : ""}`}
          </p>
          <p className="text-[10px] mt-2 opacity-70" style={{ color: t.label }}>
            Cliquer pour voir le détail
          </p>
        </KpiCard>

        <KpiCard
          title="% Clients en croissance"
          icon={<Users className="w-5 h-5" />}
          gradient="rgba(34,211,238,0.2), rgba(16,185,129,0.2)"
          className="col-span-12 md:col-span-6 lg:col-span-2"
          t={t}
          mode={mode}
          onClick={() => setShowCustomerGrowthModal(true)}
        >
          <p className="text-3xl font-bold tracking-tight" style={{ color: t.foreground }}>
            {customersPerf.pct === null ? "N/A" : percentage(customersPerf.pct)}
          </p>
          <p className="text-xs mt-2" style={{ color: t.label }}>
            {customersPerf.pct === null ? "Aucun client éligible" : `${customersPerf.growth.length} sur ${customersPerf.eligible} clients`}
          </p>
          <p className="text-[10px] mt-2 opacity-70" style={{ color: t.label }}>
            Cliquer pour voir le détail
          </p>
        </KpiCard>

        <KpiCard
          title="Taux de rétention"
          icon={<Users className="w-5 h-5" />}
          gradient="rgba(245,158,11,0.2), rgba(234,88,12,0.2)"
          className="col-span-12 md:col-span-6 lg:col-span-2"
          t={t}
          mode={mode}
          onClick={() => setShowRetentionTable(true)}
        >
          <p className="text-3xl font-bold tracking-tight" style={{ color: t.foreground }}>
            {retentionAverage.avg === null ? "N/A" : percentage(retentionAverage.avg)}
          </p>
          <p className="text-xs mt-2" style={{ color: t.label }}>
            {`Moyenne sur ${retentionAverage.eligibleReps} rep${retentionAverage.eligibleReps > 1 ? "s" : ""}`}
          </p>
          <p className="text-[10px] mt-2 opacity-70" style={{ color: t.label }}>
            Seuil: {currency(RETENTION_THRESHOLD)}
          </p>
        </KpiCard>

        <KpiCard
          title="Nouveaux clients"
          icon={<UserPlus className="w-5 h-5" />}
          gradient="rgba(59,130,246,0.2), rgba(16,185,129,0.2)"
          className="col-span-12 md:col-span-6 lg:col-span-2"
          t={t}
          mode={mode}
          onClick={() => setShowNewCustomersModal(true)}
        >
          <p className="text-3xl font-bold tracking-tight" style={{ color: t.foreground }}>
            {formatNumber(newCustomersCount)}
          </p>
          <p className="text-xs mt-2" style={{ color: t.label }}>
            Dépense ≥ {currency(NEW_CUSTOMER_MIN_SPEND)}
          </p>
           <p className="text-[10px] mt-2 opacity-70" style={{ color: t.label }}>
            Aucun achat depuis 7 ans
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
                <YAxis yAxisId="left" tickFormatter={compactCurrency} tick={{ fill: t.labelMuted, fontSize: 11 }} stroke={t.grid} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={percentage} tick={{ fill: t.labelMuted, fontSize: 11 }} stroke={t.grid} />
                <Tooltip content={<CustomTooltip format="auto" themeTokens={t} mode={mode} />} />
                <Legend />
                <Bar yAxisId="left" dataKey="previous" fill={t.labelMuted} name="Année précédente" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="left" dataKey="current" fill={t.accentPrimary} name="Période actuelle" radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="growth" stroke={t.success} strokeWidth={3} dot={{ fill: t.success, r: 5 }} activeDot={{ r: 7 }} name="Croissance %" />
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

              <div className="p-4 rounded-xl backdrop-blur-xl border" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.10), rgba(139,92,246,0.10))", borderColor: "rgba(34,211,238,0.2)" }}>
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
              <Pie data={salesByRep} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="95%" paddingAngle={3} animationBegin={0} animationDuration={1000}>
                {salesByRep.map((entry) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={salesRepColorMap[entry.name]}
                    onClick={(e) => entry.name !== "Autres" && handleSelect("salesReps", entry.name, (e as any).shiftKey)}
                    className={entry.name === "Autres" ? "" : "cursor-pointer hover:opacity-85 transition-all duration-300"}
                    style={{
                      filter: filters.salesReps.length === 0 || filters.salesReps.includes(entry.name) ? "none" : "grayscale(80%)",
                      opacity: filters.salesReps.length === 0 || filters.salesReps.includes(entry.name) ? 1 : 0.25,
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
                  const patchedPayload = props?.payload?.map((p: any) => ({ ...p, color: salesRepColorMap[p.value] || p.color })) ?? [];
                  return <CustomLegend payload={patchedPayload} selectedItems={filters.salesReps} onLegendClick={(v: string) => v !== "Autres" && handleSelect("salesReps", v)} themeTokens={t} />;
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
              {showYOYComparison && <Line type="monotone" dataKey="previous" stroke={t.labelMuted} strokeWidth={2} strokeDasharray="5 5" name="Année précédente" dot={false} />}
              <Line type="monotone" dataKey="current" stroke={t.accentSecondary} strokeWidth={3} name="Période actuelle" dot={{ fill: t.accentSecondary, r: 5 }} activeDot={{ r: 8, fill: t.accentSecondary }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={
            <div className="flex items-center justify-between w-full">
              <span>Top {showAllProducts ? "produits" : "10 produits"}</span>
              <button onClick={() => setShowAllProducts(!showAllProducts)} className="text-xs transition-colors flex items-center gap-1" style={{ color: t.accentPrimary }}>
                {showAllProducts ? "Voir moins" : "Voir tout"}
                <ChevronRight className={`w-3 h-3 transition-transform ${showAllProducts ? "rotate-90" : ""}`} />
              </button>
            </div>
          }
          className="col-span-12 xl:col-span-6"
          t={t}
        >
          <ResponsiveContainer key={`topItems-${mode}-${animationKey}`} width="100%" height={showAllProducts ? Math.max(400, salesByItem.length * 35) : 400}>
            <BarChart data={salesByItem} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.3} />
              <XAxis type="number" tickFormatter={compactCurrency} tick={{ fill: t.labelMuted, fontSize: 11 }} stroke={t.grid} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: t.label, fontSize: 11 }} stroke="none" />
              <Tooltip content={<CustomTooltip themeTokens={t} mode={mode} />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={1000}>
                {salesByItem.map((entry, i) => (
                  <Cell
                    key={`cell-item-${i}-${animationKey}`}
                    fill={`${t.accentPrimary}${Math.round(255 * (1 - i / salesByItem.length)).toString(16).padStart(2, "0")}`}
                    onClick={(e) => handleSelect("itemCodes", entry.name, (e as any).shiftKey)}
                    className="cursor-pointer hover:brightness-110 transition-all"
                    style={{ filter: filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name) ? "none" : "grayscale(80%)", opacity: filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name) ? 1 : 0.3 }}
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
              <button onClick={() => setShowAllCustomers(!showAllCustomers)} className="text-xs transition-colors flex items-center gap-1" style={{ color: t.accentPrimary }}>
                {showAllCustomers ? "Voir moins" : "Voir tout"}
                <ChevronRight className={`w-3 h-3 transition-transform ${showAllCustomers ? "rotate-90" : ""}`} />
              </button>
            </div>
          }
          className="col-span-12 xl:col-span-6"
          t={t}
        >
          <ResponsiveContainer key={`topCustomers-${mode}-${animationKey}`} width="100%" height={showAllCustomers ? Math.max(400, salesByCustomer.length * 35) : 400}>
            <BarChart data={salesByCustomer} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.3} />
              <XAxis type="number" tickFormatter={compactCurrency} tick={{ fill: t.labelMuted, fontSize: 11 }} stroke={t.grid} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fill: t.label, fontSize: 11 }} stroke="none" />
              <Tooltip content={<CustomTooltip themeTokens={t} mode={mode} />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={1000}>
                {salesByCustomer.map((entry, i) => (
                  <Cell
                    key={`cell-cust-${i}-${animationKey}`}
                    fill={`${t.accentSecondary}${Math.round(255 * (1 - i / salesByCustomer.length)).toString(16).padStart(2, "0")}`}
                    onClick={(e) => handleSelect("customers", entry.name, (e as any).shiftKey)}
                    className="cursor-pointer hover:brightness-110 transition-all"
                    style={{ filter: filters.customers.length === 0 || filters.customers.includes(entry.name) ? "none" : "grayscale(80%)", opacity: filters.customers.length === 0 || filters.customers.includes(entry.name) ? 1 : 0.3 }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ======================= Modals Section ======================= */}

      {/* Retention Modal */}
      {showRetentionTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: mode === "dark" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.25)" }} onClick={() => setShowRetentionTable(false)} />
          <div className="relative w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden" style={{ background: t.card, borderColor: t.cardBorder, color: t.foreground }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: t.cardBorder }}>
              <div>
                <h3 className="text-lg font-bold">Taux de rétention par représentant</h3>
                <p className="text-xs opacity-70" style={{ color: t.label }}>
                  Seuil d&apos;éligibilité: {currency(RETENTION_THRESHOLD)} les deux années. Cliquez une ligne pour filtrer.
                </p>
              </div>
              <button onClick={() => setShowRetentionTable(false)} className="rounded-lg p-2 hover:opacity-80" aria-label="Fermer">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 backdrop-blur-xl" style={{ background: t.card }}>
                  <tr className="border-b" style={{ borderColor: t.cardBorder }}>
                    <th className="text-left px-6 py-3">Représentant</th>
                    <th className="text-right px-6 py-3">Clients éligibles</th>
                    <th className="text-right px-6 py-3">Clients retenus</th>
                    <th className="text-right px-6 py-3">
                      <button onClick={() => setRetentionSortAsc((s) => !s)} className="inline-flex items-center gap-1 font-semibold hover:opacity-80">
                        Taux de rétention <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(visibleRepsForRetention)
                    .map((rep) => ({
                      rep,
                      data: retentionByRep[rep] || { eligible: 0, retained: 0, rate: null }
                    }))
                    .sort((a, b) => {
                      const aRate = a.data.rate ?? -1;
                      const bRate = b.data.rate ?? -1;
                      return retentionSortAsc ? aRate - bRate : bRate - aRate;
                    })
                    .map(({ rep, data }) => (
                      <tr
                        key={rep}
                        className="border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ borderColor: t.cardBorder, cursor: "pointer" }}
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, salesReps: [rep], itemCodes: [], customers: [] }));
                          setStagedSelectedRep(rep);
                          setShowRetentionTable(false);
                        }}
                      >
                        <td className="px-6 py-3">{rep}</td>
                        <td className="px-6 py-3 text-right">{formatNumber(data.eligible)}</td>
                        <td className="px-6 py-3 text-right">{formatNumber(data.retained)}</td>
                        <td className="px-6 py-3 text-right">{data.rate === null ? "N/A" : percentage(data.rate)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t text-xs" style={{ borderColor: t.cardBorder, color: t.label }}>
              <span>
                {visibleRepsForRetention.size} rep{visibleRepsForRetention.size > 1 ? "s" : ""} affiché{visibleRepsForRetention.size > 1 ? "s" : ""} · moyenne simple:{" "}
                {retentionAverage.avg === null ? "N/A" : percentage(retentionAverage.avg)}
              </span>
              <button onClick={() => setShowRetentionTable(false)} className="px-3 py-1.5 rounded-lg border" style={{ borderColor: t.cardBorder }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Customers Modal */}
      {showNewCustomersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: mode === "dark" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.25)" }} onClick={() => setShowNewCustomersModal(false)} />
          <div className="relative w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden" style={{ background: t.card, borderColor: t.cardBorder, color: t.foreground }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: t.cardBorder }}>
              <div>
                <h3 className="text-lg font-bold">Nouveaux clients (≥ {currency(NEW_CUSTOMER_MIN_SPEND)})</h3>
                <p className="text-xs opacity-70" style={{ color: t.label }}>
                  Un « nouveau client » n&apos;a aucun achat au cours des 7 dernières années (avant le début de la période) et a dépensé ≥ {currency(NEW_CUSTOMER_MIN_SPEND)} sur la période courante.
                </p>
              </div>
              <button onClick={() => setShowNewCustomersModal(false)} className="rounded-lg p-2 hover:opacity-80" aria-label="Fermer">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-6 py-3 border-b" style={{ borderColor: t.cardBorder }}>
              {[
                { key: "list", label: "Liste des nouveaux clients" },
                { key: "reps", label: "Répartition par représentant" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setNewTab(tab.key as "list" | "reps")}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                  style={{
                    color: newTab === tab.key ? "#000" : t.label,
                    background:
                      newTab === tab.key ? "linear-gradient(135deg, rgba(34,211,238,0.25), rgba(139,92,246,0.25))" : t.cardSoft,
                    border: `1px solid ${t.cardBorder}`,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {newTab === "list" ? (
              <div className="max-h-[70vh] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 backdrop-blur-xl" style={{ background: t.card }}>
                    <tr className="border-b" style={{ borderColor: t.cardBorder }}>
                      <th className="text-left px-6 py-3">Client</th>
                      <th className="text-left px-6 py-3">Expert (1ère commande)</th>
                      <th className="text-right px-6 py-3">
                        <button onClick={() => setNewSortAsc((s) => !s)} className="inline-flex items-center gap-1 font-semibold hover:opacity-80">
                          Total dépensé <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="text-right px-6 py-3"># commandes</th>
                      <th className="text-right px-6 py-3">1ère commande</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newCustomersList.length === 0 ? (
                      <tr>
                        <td className="px-6 py-6 text-center text-zinc-500" colSpan={5}>
                          Aucun nouveau client pour les filtres sélectionnés.
                        </td>
                      </tr>
                    ) : (
                      newCustomersList.map((row) => (
                        <tr
                          key={`${row.customer}-${row.firstDate}`}
                          className="border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ borderColor: t.cardBorder, cursor: "pointer" }}
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, salesReps: [row.rep], customers: [row.customer] }));
                            setStagedSelectedRep(row.rep);
                            setShowNewCustomersModal(false);
                          }}
                        >
                          <td className="px-6 py-3">{row.customer}</td>
                          <td className="px-6 py-3">{row.rep}</td>
                          <td className="px-6 py-3 text-right">{currency(row.spend)}</td>
                          <td className="px-6 py-3 text-right">{formatNumber(row.orders)}</td>
                          <td className="px-6 py-3 text-right">{row.firstDate}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-4 p-6">
                <div className="col-span-12 lg:col-span-6">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={newCustomersByRep}>
                      <CartesianGrid strokeDasharray="3 3" stroke={t.grid} strokeOpacity={0.3} />
                      <XAxis dataKey="rep" tick={{ fill: t.labelMuted, fontSize: 11 }} stroke={t.grid} />
                      <YAxis tick={{ fill: t.labelMuted, fontSize: 11 }} stroke={t.grid} />
                      <Tooltip content={<CustomTooltip format="number" themeTokens={t} mode={mode} />} />
                      <Bar
                        dataKey="count"
                        radius={[6, 6, 0, 0]}
                        onClick={(_, idx) => {
                          const target = newCustomersByRep[idx];
                          if (target) {
                            setFilters((prev) => ({ ...prev, salesReps: [target.rep], customers: [] }));
                            setStagedSelectedRep(target.rep);
                            setShowNewCustomersModal(false);
                          }
                        }}
                      >
                        {newCustomersByRep.map((_, i) => (
                          <Cell key={`nc-rep-${i}`} fill={t.accentPrimary} className="cursor-pointer hover:brightness-110" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="col-span-12 lg:col-span-6">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: t.cardBorder }}>
                        <th className="text-left px-4 py-2">Représentant</th>
                        <th className="text-right px-4 py-2">Nouveaux clients</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newCustomersByRep.map((r) => (
                        <tr
                          key={r.rep}
                          className="border-b hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                          style={{ borderColor: t.cardBorder }}
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, salesReps: [r.rep], customers: [] }));
                            setStagedSelectedRep(r.rep);
                            setShowNewCustomersModal(false);
                          }}
                        >
                          <td className="px-4 py-2">{r.rep}</td>
                          <td className="px-4 py-2 text-right">{formatNumber(r.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end px-6 py-4 border-t text-xs" style={{ borderColor: t.cardBorder, color: t.label }}>
              <button onClick={() => setShowNewCustomersModal(false)} className="px-3 py-1.5 rounded-lg border" style={{ borderColor: t.cardBorder }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rep Growth/Loss Modal */}
      {showRepGrowthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: mode === "dark" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.25)" }} onClick={() => setShowRepGrowthModal(false)} />
          <div className="relative w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden" style={{ background: t.card, borderColor: t.cardBorder, color: t.foreground }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: t.cardBorder }}>
                <h3 className="text-lg font-bold">Performance YOY des représentants</h3>
              <button onClick={() => setShowRepGrowthModal(false)} className="rounded-lg p-2 hover:opacity-80" aria-label="Fermer">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 px-6 py-3 border-b" style={{ borderColor: t.cardBorder }}>
                <button
                  onClick={() => setRepGrowthTab('growth')}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                  style={{
                    color: repGrowthTab === 'growth' ? "#000" : t.label,
                    background: repGrowthTab === 'growth' ? "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(34,211,238,0.3))" : t.cardSoft,
                    border: `1px solid ${t.cardBorder}`,
                  }}
                >
                  Croissance ({repsPerf.growth.length})
                </button>
                <button
                  onClick={() => setRepGrowthTab('loss')}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                  style={{
                    color: repGrowthTab === 'loss' ? "#000" : t.label,
                    background: repGrowthTab === 'loss' ? "linear-gradient(135deg, rgba(239,68,68,0.3), rgba(234,179,8,0.25))" : t.cardSoft,
                    border: `1px solid ${t.cardBorder}`,
                  }}
                >
                  Décroissance ({repsPerf.loss.length})
                </button>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 backdrop-blur-xl" style={{ background: t.card }}>
                  <tr className="border-b" style={{ borderColor: t.cardBorder }}>
                    <th className="text-left px-6 py-3">Représentant</th>
                    <th className="text-right px-6 py-3">Ventes N-1</th>
                    <th className="text-right px-6 py-3">Ventes N</th>
                    <th className="text-right px-6 py-3">Variation ($)</th>
                    <th className="text-right px-6 py-3">Variation (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {(repGrowthTab === 'growth' ? repsPerf.growth : repsPerf.loss).map((row) => (
                    <tr key={row.key} className="border-b" style={{ borderColor: t.cardBorder }}>
                      <td className="px-6 py-3">{row.key}</td>
                      <td className="px-6 py-3 text-right">{currency(row.prev)}</td>
                      <td className="px-6 py-3 text-right">{currency(row.curr)}</td>
                      <td className={`px-6 py-3 text-right font-semibold ${row.delta > 0 ? "text-emerald-500" : "text-red-500"}`}>{currency(row.delta)}</td>
                      <td className={`px-6 py-3 text-right font-semibold ${row.rate > 0 ? "text-emerald-500" : "text-red-500"}`}>{percentage(row.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t text-xs" style={{ borderColor: t.cardBorder, color: t.label }}>
              <button onClick={() => setShowRepGrowthModal(false)} className="px-3 py-1.5 rounded-lg border" style={{ borderColor: t.cardBorder }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Growth/Loss Modal */}
      {showCustomerGrowthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: mode === "dark" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.25)" }} onClick={() => setShowCustomerGrowthModal(false)} />
          <div className="relative w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden" style={{ background: t.card, borderColor: t.cardBorder, color: t.foreground }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: t.cardBorder }}>
                <h3 className="text-lg font-bold">Performance YOY des clients</h3>
              <button onClick={() => setShowCustomerGrowthModal(false)} className="rounded-lg p-2 hover:opacity-80" aria-label="Fermer">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 px-6 py-3 border-b" style={{ borderColor: t.cardBorder }}>
                <button
                  onClick={() => setCustomerGrowthTab('growth')}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                  style={{
                    color: customerGrowthTab === 'growth' ? "#000" : t.label,
                    background: customerGrowthTab === 'growth' ? "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(34,211,238,0.3))" : t.cardSoft,
                    border: `1px solid ${t.cardBorder}`,
                  }}
                >
                  Croissance ({customersPerf.growth.length})
                </button>
                <button
                  onClick={() => setCustomerGrowthTab('loss')}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                  style={{
                    color: customerGrowthTab === 'loss' ? "#000" : t.label,
                    background: customerGrowthTab === 'loss' ? "linear-gradient(135deg, rgba(239,68,68,0.3), rgba(234,179,8,0.25))" : t.cardSoft,
                    border: `1px solid ${t.cardBorder}`,
                  }}
                >
                  Décroissance ({customersPerf.loss.length})
                </button>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 backdrop-blur-xl" style={{ background: t.card }}>
                  <tr className="border-b" style={{ borderColor: t.cardBorder }}>
                    <th className="text-left px-6 py-3">Client</th>
                    <th className="text-right px-6 py-3">Ventes N-1</th>
                    <th className="text-right px-6 py-3">Ventes N</th>
                    <th className="text-right px-6 py-3">Variation ($)</th>
                    <th className="text-right px-6 py-3">Variation (%)</th>
                  </tr>
                </thead>
                <tbody>
                   {(customerGrowthTab === 'growth' ? customersPerf.growth : customersPerf.loss).map((row) => (
                    <tr key={row.key} className="border-b" style={{ borderColor: t.cardBorder }}>
                      <td className="px-6 py-3">{row.key}</td>
                      <td className="px-6 py-3 text-right">{currency(row.prev)}</td>
                      <td className="px-6 py-3 text-right">{currency(row.curr)}</td>
                      <td className={`px-6 py-3 text-right font-semibold ${row.delta > 0 ? "text-emerald-500" : "text-red-500"}`}>{currency(row.delta)}</td>
                      <td className={`px-6 py-3 text-right font-semibold ${row.rate > 0 ? "text-emerald-500" : "text-red-500"}`}>{percentage(row.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t text-xs" style={{ borderColor: t.cardBorder, color: t.label }}>
              <button onClick={() => setShowCustomerGrowthModal(false)} className="px-3 py-1.5 rounded-lg border" style={{ borderColor: t.cardBorder }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== /Modals Section =================== */}
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
  const t: ThemeTokens = THEME[mode];

  if (!mounted || status === "loading") return <LoadingState />;
  if (status === "unauthenticated" || (session as any)?.user?.role !== "ventes-exec") return <AccessDenied />;

  return (
    <main
      className={`min-h-[100svh] ${inter.className} bg-white dark:bg-[#050507]`}
      style={{ background: mode === "dark" ? `linear-gradient(180deg, ${t.bg} 0%, #050507 100%)` : undefined, color: t.foreground }}
    >
      {mode === "dark" && (
        <div className="fixed inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: t.haloCyan }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: t.haloViolet }} />
        </div>
      )}
      <div className="px-4 md:px-6 lg:px-8 py-6 md:py-8 relative z-10">
        <div className="mx-auto w-full max-w-[1920px]">
          <DashboardContent />
        </div>
      </div>
    </main>
  );
}
