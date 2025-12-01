// src/app/(dashboard)/page.tsx
"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
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
  BarChart3,
  X as CloseIcon,
  ArrowUpDown,
  UserPlus,
  Sparkles,
  Target,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { THEME, CHART_COLORS, ThemeTokens } from "@/lib/theme-tokens";

/* ═══════════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════════════ */
const RETENTION_THRESHOLD = 300;
const NEW_CUSTOMER_MIN_SPEND = 30;

type YoyFilter = "all" | "growth" | "loss";

/* ═══════════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════════ */
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

type PerfRow = { 
  key: string; 
  prev: number; 
  curr: number; 
  rate: number; 
  delta: number;
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Formatters
   ═══════════════════════════════════════════════════════════════════════════════ */
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

const formatNumber = (n: number) =>
  new Intl.NumberFormat("fr-CA").format(Math.round(n));

/* ═══════════════════════════════════════════════════════════════════════════════
   Skeleton Components — For loading states inside cards
   ═══════════════════════════════════════════════════════════════════════════════ */
const SkeletonPulse = ({ className = "" }: { className?: string }) => (
  <div 
    className={`animate-pulse rounded bg-[hsl(var(--bg-muted))] ${className}`}
  />
);

const KpiSkeleton = ({ t }: { t: ThemeTokens }) => (
  <div className="space-y-3">
    <SkeletonPulse className="h-8 w-24" />
    <div className="flex items-center gap-2 mt-3">
      <SkeletonPulse className="h-6 w-16 rounded-md" />
      <SkeletonPulse className="h-4 w-12" />
    </div>
  </div>
);

const ChartSkeleton = ({ height = 280 }: { height?: number }) => (
  <div className="flex items-center justify-center" style={{ height }}>
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
      <span className="text-sm text-[hsl(var(--text-muted))]">Chargement...</span>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   Animated Number Component
   ═══════════════════════════════════════════════════════════════════════════════ */
const AnimatedNumber = ({
  value,
  format,
  duration = 600,
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
      const eased = 1 - Math.pow(1 - progress, 4);
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

/* ═══════════════════════════════════════════════════════════════════════════════
   YOY Change Badge
   ═══════════════════════════════════════════════════════════════════════════════ */
const YOYBadge = ({ current, previous }: { current: number; previous: number }) => {
  const change = previous > 0 ? (current - previous) / previous : 0;
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 0.001;

  const badgeClass = isNeutral
    ? "badge-neutral"
    : isPositive
    ? "badge-positive"
    : "badge-negative";

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-2 mt-3">
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${badgeClass}`}>
        <Icon className="w-3 h-3" />
        <span className="font-mono-data">{percentage(Math.abs(change))}</span>
      </div>
      <span className="text-caption">vs N-1</span>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Custom Tooltip
   ═══════════════════════════════════════════════════════════════════════════════ */
function CustomTooltip({ active, payload, label, format = "currency", t }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-lg px-3 py-2 text-sm animate-scale-in"
      style={{
        background: t.tooltipBg,
        border: `1px solid ${t.borderDefault}`,
      }}
    >
      <p className="text-label mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 py-0.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span style={{ color: t.textSecondary }}>{entry.name}:</span>
          <span className="font-mono-data font-medium" style={{ color: t.textPrimary }}>
            {format === "number"
              ? formatNumber(entry.value)
              : format === "percentage"
              ? percentage(entry.value)
              : currency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Custom Legend
   ═══════════════════════════════════════════════════════════════════════════════ */
const CustomLegend = ({
  payload,
  onLegendClick,
  selectedItems = [],
  t,
}: any) => {
  return (
    <ul className="flex flex-col gap-1.5 text-xs">
      {(payload || []).map((entry: any) => {
        const isSelected = selectedItems.length === 0 || selectedItems.includes(entry.value);
        return (
          <li
            key={entry.value}
            className={`flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-md transition-all duration-200 ${
              isSelected ? "opacity-100" : "opacity-30"
            }`}
            onClick={() => onLegendClick?.(entry.value)}
            style={{
              background: isSelected ? t.surface3 : "transparent",
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span style={{ color: t.textSecondary }}>{entry.value}</span>
          </li>
        );
      })}
    </ul>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Aggregation Helpers
   ═══════════════════════════════════════════════════════════════════════════════ */
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

function totalsByKey<T extends keyof SalesRecord>(records: SalesRecord[], key: T) {
  return records.reduce((acc, r) => {
    const k = r[key] as unknown as string;
    acc[k] = (acc[k] || 0) + r.salesValue;
    return acc;
  }, {} as Record<string, number>);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   UI Components
   ═══════════════════════════════════════════════════════════════════════════════ */

// Error State
const ErrorState = ({ message }: { message: string }) => (
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <div className="surface-card p-8 max-w-md text-center animate-scale-in">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center badge-negative">
        <TrendingDown className="w-8 h-8" />
      </div>
      <h3 className="text-title mb-2">Erreur de chargement</h3>
      <p className="text-caption mb-6">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2.5 rounded-lg font-medium transition-all badge-negative hover:opacity-80"
      >
        Recharger
      </button>
    </div>
  </div>
);

// Access Denied
const AccessDenied = () => (
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <div className="surface-card p-10 max-w-lg text-center animate-scale-in">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center surface-inset">
        <Users className="w-10 h-10" style={{ color: "hsl(var(--text-tertiary))" }} />
      </div>
      <h3 className="text-headline mb-3">Accès restreint</h3>
      <p className="text-caption leading-relaxed">
        Vous ne disposez pas des autorisations nécessaires pour consulter ces données.
        Veuillez contacter votre département TI pour obtenir l&apos;accès approprié.
      </p>
    </div>
  </div>
);

// KPI Card — Now with loading state support
function KpiCard({
  title,
  icon: Icon,
  children,
  className = "",
  t,
  onClick,
  accentColor,
  isLoading = false,
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
  className?: string;
  t: ThemeTokens;
  onClick?: () => void;
  accentColor?: string;
  isLoading?: boolean;
}) {
  const isClickable = typeof onClick === "function";
  
  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => isClickable && (e.key === "Enter" || e.key === " ") && onClick?.()}
      className={`
        relative rounded-xl p-5 transition-all duration-200
        ${isClickable ? "cursor-pointer hover:scale-[1.02]" : ""}
        ${className}
      `}
      style={{
        background: t.surface1,
        border: `1px solid ${t.borderSubtle}`,
      }}
    >
      {/* Accent line */}
      {accentColor && (
        <div
          className="absolute top-0 left-4 right-4 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
        />
      )}
      
      <div className="flex items-start justify-between mb-4">
        <span className="text-label">{title}</span>
        {Icon && (
          <div
            className="p-2 rounded-lg"
            style={{
              background: accentColor ? `${accentColor}15` : t.surface2,
              color: accentColor || t.textTertiary,
            }}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      
      <div>{isLoading ? <KpiSkeleton t={t} /> : children}</div>
      
      {isClickable && !isLoading && (
        <p className="text-[11px] mt-3 opacity-50" style={{ color: t.textTertiary }}>
          Cliquer pour détails
        </p>
      )}
    </div>
  );
}

// Chart Card — Now with loading state support
function ChartCard({
  title,
  children,
  className = "",
  t,
  action,
  isLoading = false,
  height = 320,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  t: ThemeTokens;
  action?: React.ReactNode;
  isLoading?: boolean;
  height?: number;
}) {
  return (
    <div
      className={`rounded-xl p-5 h-full flex flex-col animate-fade-in ${className}`}
      style={{
        background: t.surface1,
        border: `1px solid ${t.borderSubtle}`,
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[0.9375rem] font-semibold tracking-tight" style={{ color: t.textPrimary }}>
          {title}
        </h3>
        {action}
      </div>
      <div className="flex-grow">
        {isLoading ? <ChartSkeleton height={height} /> : children}
      </div>
    </div>
  );
}

// Segmented Control
function SegmentedControl({
  options,
  value,
  onChange,
  t,
}: {
  options: { key: string; label: string; color?: string }[];
  value: string;
  onChange: (key: string) => void;
  t: ThemeTokens;
}) {
  return (
    <div
      className="inline-flex rounded-lg p-1"
      style={{ background: t.surface2, border: `1px solid ${t.borderSubtle}` }}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="px-3 py-1.5 rounded-md text-[0.8125rem] font-medium transition-all duration-200"
            style={{
              background: active ? (opt.color || t.accent) : "transparent",
              color: active ? t.void : t.textTertiary,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// Modal Base
function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  t,
  width = "max-w-4xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  t: ThemeTokens;
  width?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog">
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: "hsl(0, 0%, 0% / 0.7)" }}
        onClick={onClose}
      />
      <div
        className={`relative w-full ${width} rounded-xl overflow-hidden animate-scale-in`}
        style={{ background: t.surface1, border: `1px solid ${t.borderSubtle}` }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
        >
          <div>
            <h3 className="text-title">{title}</h3>
            {subtitle && <p className="text-caption mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: t.textTertiary }}
            aria-label="Fermer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Dashboard Content
   ═══════════════════════════════════════════════════════════════════════════════ */
const DashboardContent = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);
  
  const mode = mounted && resolvedTheme === "light" ? "light" : "dark";
  const t = THEME[mode];
  const chartColors = CHART_COLORS[mode];

  // Date ranges
  const defaultDateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, []);

  // State
  const [activeDateRange, setActiveDateRange] = useState(defaultDateRange);
  const [stagedDateRange, setStagedDateRange] = useState(defaultDateRange);
  const [stagedSelectedRep, setStagedSelectedRep] = useState("");
  const [showYOYComparison, setShowYOYComparison] = useState(true);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ salesReps: [], itemCodes: [], customers: [] });
  const [yoyFilter, setYoyFilter] = useState<YoyFilter>("all");

  // Data state
  const [masterData, setMasterData] = useState<SalesRecord[] | null>(null);
  const [previousYearData, setPreviousYearData] = useState<SalesRecord[] | null>(null);
  const [history3yData, setHistory3yData] = useState<SalesRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Modal states
  const [showRetentionTable, setShowRetentionTable] = useState(false);
  const [retentionSortAsc, setRetentionSortAsc] = useState(false);
  const [showNewCustomersModal, setShowNewCustomersModal] = useState(false);
  const [newSortAsc, setNewSortAsc] = useState(false);
  const [newTab, setNewTab] = useState<"list" | "reps">("list");
  const [showRepGrowthModal, setShowRepGrowthModal] = useState(false);
  const [repGrowthTab, setRepGrowthTab] = useState<"growth" | "loss">("growth");
  const [showCustomerGrowthModal, setShowCustomerGrowthModal] = useState(false);
  const [customerGrowthTab, setCustomerGrowthTab] = useState<"growth" | "loss">("growth");

  // Derived date ranges
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

  const lookback3y = useMemo(() => {
    const start = new Date(activeDateRange.start);
    const end = new Date(activeDateRange.start);
    start.setFullYear(start.getFullYear() - 3);
    end.setDate(end.getDate() - 1);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, [activeDateRange.start]);

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [currentRes, prevRes, histRes] = await Promise.all([
          fetch(`/api/dashboard-data?startDate=${activeDateRange.start}&endDate=${activeDateRange.end}`),
          fetch(`/api/dashboard-data?startDate=${previousYearDateRange.start}&endDate=${previousYearDateRange.end}`),
          fetch(`/api/dashboard-data?startDate=${lookback3y.start}&endDate=${lookback3y.end}`),
        ]);

        if (!currentRes.ok) {
          const errorData = await currentRes.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${currentRes.status}`);
        }

        setMasterData(await currentRes.json());
        setPreviousYearData(prevRes.ok ? await prevRes.json() : []);
        setHistory3yData(histRes.ok ? await histRes.json() : []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeDateRange, previousYearDateRange, lookback3y]);

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
  const transactionCount = filteredData.length;
  const previousTotalSales = useMemo(() => filteredPreviousData.reduce((s, d) => s + d.salesValue, 0), [filteredPreviousData]);
  const previousTransactionCount = filteredPreviousData.length;

  // Rep color map
  const salesRepColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const reps = masterData ? Array.from(new Set(masterData.map((d) => d.salesRepName))).sort() : [];
    reps.forEach((rep, idx) => (map[rep] = chartColors[idx % chartColors.length]));
    map["Autres"] = t.textMuted;
    return map;
  }, [masterData, chartColors, t]);

  // Chart data
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

  const transactionsByMonth = useMemo(() => {
    const current = filteredData.reduce((acc, d) => {
      const m = d.invoiceDate.slice(0, 7);
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const previous = filteredPreviousData.reduce((acc, d) => {
      const m = d.invoiceDate.slice(0, 7);
      const adjusted = m.replace(/^(\d{4})/, (_, y) => String(parseInt(y) + 1));
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
      const adjusted = m.replace(/^(\d{4})/, (_, y) => String(parseInt(y) + 1));
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
  const prevCustomersSet = useMemo(() => new Set((history3yData ?? []).map((d) => d.customerName)), [history3yData]);

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
      if (!prevCustomersSet.has(cust) && agg.total >= NEW_CUSTOMER_MIN_SPEND) {
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

  // Error state only
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════════
         Header
         ═══════════════════════════════════════════════════════════════════════════ */}
      <header
        className="rounded-xl p-6 animate-slide-up"
        style={{ background: t.surface1, border: `1px solid ${t.borderSubtle}` }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Title */}
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{ background: `${t.accent}15`, color: t.accent }}
            >
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-headline">
                Analyse des ventes
                <span style={{ color: t.accent }}>.</span>
              </h1>
              <p className="text-caption mt-1">
                Intelligence d&apos;affaires avec comparaison YOY
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* YOY Toggle */}
            <button
              onClick={() => setShowYOYComparison(!showYOYComparison)}
              className="px-4 py-2 rounded-lg text-[0.875rem] font-medium transition-all duration-200"
              style={{
                background: showYOYComparison ? `${t.accent}20` : t.surface2,
                color: showYOYComparison ? t.accent : t.textSecondary,
                border: `1px solid ${showYOYComparison ? `${t.accent}40` : t.borderSubtle}`,
              }}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              YOY
            </button>

            {/* YOY Segment */}
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

            {/* Rep Select */}
            <select
              value={stagedSelectedRep}
              onChange={(e) => setStagedSelectedRep(e.target.value)}
              className="rounded-lg px-3 py-2 text-[0.875rem] transition-all focus:outline-none"
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

            {/* Date Inputs */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={stagedDateRange.start}
                onChange={(e) => setStagedDateRange((p) => ({ ...p, start: e.target.value }))}
                className="rounded-lg px-3 py-2 text-[0.875rem] focus:outline-none"
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
                className="rounded-lg px-3 py-2 text-[0.875rem] focus:outline-none"
                style={{
                  background: t.surface2,
                  border: `1px solid ${t.borderSubtle}`,
                  color: t.textPrimary,
                }}
              />
            </div>

            {/* Quick date buttons */}
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
                className="px-2 py-1.5 rounded text-[0.8125rem] font-medium transition-all"
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
                className="px-2 py-1.5 rounded text-[0.8125rem] font-medium transition-all"
                style={{ background: t.surface2, color: t.textTertiary }}
              >
                TTM
              </button>
            </div>

            {/* Apply */}
            <button
              onClick={applyFilters}
              className="px-5 py-2 rounded-lg text-[0.875rem] font-semibold transition-all duration-200 hover:scale-105"
              style={{
                background: t.accent,
                color: t.void,
              }}
            >
              Appliquer
            </button>

            {/* Reset */}
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

      {/* ═══════════════════════════════════════════════════════════════════════════
         KPI Grid — Cards always visible, content shows skeleton when loading
         ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          title="Chiffre d'affaires"
          icon={DollarSign}
          t={t}
          accentColor={t.accent}
          className="animate-slide-up stagger-1"
          isLoading={isLoading}
        >
          <p className="text-[1.625rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            <AnimatedNumber value={totalSales} format={currency} />
          </p>
          {showYOYComparison && previousTotalSales > 0 && (
            <YOYBadge current={totalSales} previous={previousTotalSales} />
          )}
        </KpiCard>

        <KpiCard
          title="Transactions"
          icon={Package}
          t={t}
          accentColor={chartColors[1]}
          className="animate-slide-up stagger-2"
          isLoading={isLoading}
        >
          <p className="text-[1.625rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            <AnimatedNumber value={transactionCount} format={formatNumber} />
          </p>
          {showYOYComparison && previousTransactionCount > 0 && (
            <YOYBadge current={transactionCount} previous={previousTransactionCount} />
          )}
        </KpiCard>

        <KpiCard
          title="% Reps croissance"
          icon={TrendingUp}
          t={t}
          accentColor={t.success}
          onClick={isLoading ? undefined : () => setShowRepGrowthModal(true)}
          className="animate-slide-up stagger-3"
          isLoading={isLoading}
        >
          <p className="text-[1.625rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            {repsPerf.pct === null ? "—" : percentage(repsPerf.pct)}
          </p>
          <p className="text-caption mt-2">
            {repsPerf.growth.length}/{repsPerf.eligible} reps
          </p>
        </KpiCard>

        <KpiCard
          title="% Clients croissance"
          icon={Users}
          t={t}
          accentColor={chartColors[5]}
          onClick={isLoading ? undefined : () => setShowCustomerGrowthModal(true)}
          className="animate-slide-up stagger-4"
          isLoading={isLoading}
        >
          <p className="text-[1.625rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            {customersPerf.pct === null ? "—" : percentage(customersPerf.pct)}
          </p>
          <p className="text-caption mt-2">
            {customersPerf.growth.length}/{customersPerf.eligible} clients
          </p>
        </KpiCard>

        <KpiCard
          title="Taux rétention"
          icon={Target}
          t={t}
          accentColor={chartColors[3]}
          onClick={isLoading ? undefined : () => setShowRetentionTable(true)}
          className="animate-slide-up stagger-5"
          isLoading={isLoading}
        >
          <p className="text-[1.625rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            {retentionAverage.avg === null ? "—" : percentage(retentionAverage.avg)}
          </p>
          <p className="text-caption mt-2">
            Moy. {retentionAverage.eligibleReps} reps
          </p>
        </KpiCard>

        <KpiCard
          title="Nouveaux clients"
          icon={UserPlus}
          t={t}
          accentColor={chartColors[4]}
          onClick={isLoading ? undefined : () => setShowNewCustomersModal(true)}
          className="animate-slide-up stagger-6"
          isLoading={isLoading}
        >
          <p className="text-[1.625rem] font-bold font-mono-data tracking-tight" style={{ color: t.textPrimary }}>
            {formatNumber(newCustomersCount)}
          </p>
          <p className="text-caption mt-2">
            Aucun achat 3 ans
          </p>
        </KpiCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
         YOY Comparison Row — Charts show skeleton when loading
         ═══════════════════════════════════════════════════════════════════════════ */}
      {showYOYComparison && (
        <div className="grid grid-cols-12 gap-4">
          <ChartCard title="Comparaison YOY — Chiffre d'affaires" className="col-span-12 lg:col-span-8" t={t} isLoading={isLoading} height={280}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={salesComparisonByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.borderSubtle} strokeOpacity={0.5} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: t.textTertiary, fontSize: 12 }}
                  stroke={t.borderSubtle}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={compactCurrency}
                  tick={{ fill: t.textTertiary, fontSize: 12 }}
                  stroke={t.borderSubtle}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={percentage}
                  tick={{ fill: t.textTertiary, fontSize: 12 }}
                  stroke={t.borderSubtle}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip t={t} />} />
                <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
                <Bar
                  yAxisId="left"
                  dataKey="previous"
                  fill={t.textMuted}
                  name="N-1"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="current"
                  fill={t.accent}
                  name="Période actuelle"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="growth"
                  stroke={t.success}
                  strokeWidth={2}
                  dot={{ fill: t.success, r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Croissance %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Performance comparative" className="col-span-12 lg:col-span-4" t={t} isLoading={isLoading}>
            <div className="space-y-4 h-full flex flex-col justify-between">
              <div
                className="p-4 rounded-lg"
                style={{ background: t.surface2, border: `1px solid ${t.borderSubtle}` }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-label">Période actuelle</span>
                  <Sparkles className="w-4 h-4" style={{ color: t.accent }} />
                </div>
                <div className="text-[1.25rem] font-bold font-mono-data" style={{ color: t.textPrimary }}>
                  {currency(totalSales)}
                </div>
              </div>

              <div
                className="p-4 rounded-lg"
                style={{ background: t.surface2, border: `1px solid ${t.borderSubtle}` }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-label">Année précédente</span>
                  <Calendar className="w-4 h-4" style={{ color: t.textTertiary }} />
                </div>
                <div className="text-[1.25rem] font-bold font-mono-data" style={{ color: t.textSecondary }}>
                  {currency(previousTotalSales)}
                </div>
              </div>

              <div
                className="p-4 rounded-lg border-glow"
                style={{ background: `${t.accent}10`, border: `1px solid ${t.accent}30` }}
              >
                <span className="text-label">Variation YOY</span>
                <div className="text-[1.625rem] font-bold font-mono-data mt-1" style={{ color: t.textPrimary }}>
                  {previousTotalSales > 0
                    ? percentage((totalSales - previousTotalSales) / previousTotalSales)
                    : "—"}
                </div>
                <div className="text-caption mt-1">
                  Δ {currency(totalSales - previousTotalSales)}
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
         Main Charts — Show skeleton when loading
         ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-12 gap-4">
        {/* Pie Chart */}
        <ChartCard title="Répartition par expert" className="col-span-12 lg:col-span-5" t={t} isLoading={isLoading}>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={salesByRep}
                dataKey="value"
                nameKey="name"
                innerRadius="60%"
                outerRadius="90%"
                paddingAngle={2}
                animationDuration={800}
              >
                {salesByRep.map((entry) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={salesRepColorMap[entry.name]}
                    onClick={(e) =>
                      entry.name !== "Autres" && handleSelect("salesReps", entry.name, (e as any).shiftKey)
                    }
                    className={entry.name === "Autres" ? "" : "cursor-pointer transition-opacity duration-200"}
                    style={{
                      opacity:
                        filters.salesReps.length === 0 || filters.salesReps.includes(entry.name) ? 1 : 0.25,
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip t={t} />} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ paddingLeft: 16 }}
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
                      t={t}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Line Chart */}
        <ChartCard title="Évolution des transactions" className="col-span-12 lg:col-span-7" t={t} isLoading={isLoading}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={transactionsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.borderSubtle} strokeOpacity={0.5} />
              <XAxis
                dataKey="name"
                tick={{ fill: t.textTertiary, fontSize: 12 }}
                stroke={t.borderSubtle}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: t.textTertiary, fontSize: 12 }}
                stroke={t.borderSubtle}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip format="number" t={t} />} />
              <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
              {showYOYComparison && (
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke={t.textMuted}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="N-1"
                  dot={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="current"
                stroke={chartColors[1]}
                strokeWidth={2}
                name="Période actuelle"
                dot={{ fill: chartColors[1], r: 3 }}
                activeDot={{ r: 5, fill: chartColors[1] }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Products Bar Chart */}
        <ChartCard
          title={`Top ${showAllProducts ? "" : "10 "}produits`}
          className="col-span-12 xl:col-span-6"
          t={t}
          isLoading={isLoading}
          height={360}
          action={
            <button
              onClick={() => setShowAllProducts(!showAllProducts)}
              className="text-[0.8125rem] flex items-center gap-1 transition-colors"
              style={{ color: t.accent }}
            >
              {showAllProducts ? "Moins" : "Tout voir"}
              <ChevronRight className={`w-3 h-3 transition-transform ${showAllProducts ? "rotate-90" : ""}`} />
            </button>
          }
        >
          <ResponsiveContainer
            width="100%"
            height={showAllProducts ? Math.max(360, salesByItem.length * 32) : 360}
          >
            <BarChart data={salesByItem} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.borderSubtle} strokeOpacity={0.5} />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fill: t.textTertiary, fontSize: 12 }}
                stroke={t.borderSubtle}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fill: t.textSecondary, fontSize: 12 }}
                stroke="none"
              />
              <Tooltip content={<CustomTooltip t={t} />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={600}>
                {salesByItem.map((entry, i) => (
                  <Cell
                    key={`item-${i}`}
                    fill={t.accent}
                    fillOpacity={1 - i * 0.07}
                    onClick={(e) => handleSelect("itemCodes", entry.name, (e as any).shiftKey)}
                    className="cursor-pointer transition-opacity"
                    style={{
                      opacity:
                        filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name) ? 1 : 0.25,
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Customers Bar Chart */}
        <ChartCard
          title={`Top ${showAllCustomers ? "" : "10 "}clients`}
          className="col-span-12 xl:col-span-6"
          t={t}
          isLoading={isLoading}
          height={360}
          action={
            <button
              onClick={() => setShowAllCustomers(!showAllCustomers)}
              className="text-[0.8125rem] flex items-center gap-1 transition-colors"
              style={{ color: t.accent }}
            >
              {showAllCustomers ? "Moins" : "Tout voir"}
              <ChevronRight className={`w-3 h-3 transition-transform ${showAllCustomers ? "rotate-90" : ""}`} />
            </button>
          }
        >
          <ResponsiveContainer
            width="100%"
            height={showAllCustomers ? Math.max(360, salesByCustomer.length * 32) : 360}
          >
            <BarChart data={salesByCustomer} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.borderSubtle} strokeOpacity={0.5} />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fill: t.textTertiary, fontSize: 12 }}
                stroke={t.borderSubtle}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fill: t.textSecondary, fontSize: 12 }}
                stroke="none"
              />
              <Tooltip content={<CustomTooltip t={t} />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={600}>
                {salesByCustomer.map((entry, i) => (
                  <Cell
                    key={`cust-${i}`}
                    fill={chartColors[1]}
                    fillOpacity={1 - i * 0.07}
                    onClick={(e) => handleSelect("customers", entry.name, (e as any).shiftKey)}
                    className="cursor-pointer transition-opacity"
                    style={{
                      opacity:
                        filters.customers.length === 0 || filters.customers.includes(entry.name) ? 1 : 0.25,
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
         Modals (unchanged, just show when data is loaded)
         ═══════════════════════════════════════════════════════════════════════════ */}

      {/* Retention Modal */}
      <Modal
        open={showRetentionTable}
        onClose={() => setShowRetentionTable(false)}
        title="Taux de rétention par représentant"
        subtitle={`Seuil: ${currency(RETENTION_THRESHOLD)} les deux années`}
        t={t}
      >
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-[0.875rem]">
            <thead className="sticky top-0" style={{ background: t.surface1 }}>
              <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                <th className="text-left px-6 py-3 text-label">Représentant</th>
                <th className="text-right px-6 py-3 text-label">Éligibles</th>
                <th className="text-right px-6 py-3 text-label">Retenus</th>
                <th className="text-right px-6 py-3">
                  <button
                    onClick={() => setRetentionSortAsc((s) => !s)}
                    className="inline-flex items-center gap-1 text-label hover:opacity-80"
                  >
                    Taux <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from(visibleRepsForRetention)
                .map((rep) => ({ rep, data: retentionByRep[rep] || { eligible: 0, retained: 0, rate: null } }))
                .sort((a, b) => {
                  const aRate = a.data.rate ?? -1;
                  const bRate = b.data.rate ?? -1;
                  return retentionSortAsc ? aRate - bRate : bRate - aRate;
                })
                .map(({ rep, data }) => (
                  <tr
                    key={rep}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, salesReps: [rep], itemCodes: [], customers: [] }));
                      setStagedSelectedRep(rep);
                      setShowRetentionTable(false);
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = t.surface2)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-6 py-3" style={{ color: t.textPrimary }}>{rep}</td>
                    <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textSecondary }}>
                      {formatNumber(data.eligible)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textSecondary }}>
                      {formatNumber(data.retained)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono-data font-medium" style={{ color: t.textPrimary }}>
                      {data.rate === null ? "—" : percentage(data.rate)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div
          className="flex items-center justify-between px-6 py-4 text-[0.8125rem]"
          style={{ borderTop: `1px solid ${t.borderSubtle}`, color: t.textTertiary }}
        >
          <span>
            Moyenne: {retentionAverage.avg === null ? "—" : percentage(retentionAverage.avg)}
          </span>
          <button
            onClick={() => setShowRetentionTable(false)}
            className="px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: t.surface2, color: t.textSecondary }}
          >
            Fermer
          </button>
        </div>
      </Modal>

      {/* New Customers Modal */}
      <Modal
        open={showNewCustomersModal}
        onClose={() => setShowNewCustomersModal(false)}
        title={`Nouveaux clients (≥ ${currency(NEW_CUSTOMER_MIN_SPEND)})`}
        subtitle="Aucun achat au cours des 3 dernières années"
        t={t}
        width="max-w-5xl"
      >
        <div className="flex items-center gap-2 px-6 py-3" style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
          <SegmentedControl
            options={[
              { key: "list", label: "Liste" },
              { key: "reps", label: "Par représentant" },
            ]}
            value={newTab}
            onChange={(k) => setNewTab(k as "list" | "reps")}
            t={t}
          />
        </div>

        {newTab === "list" ? (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-[0.875rem]">
              <thead className="sticky top-0" style={{ background: t.surface1 }}>
                <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                  <th className="text-left px-6 py-3 text-label">Client</th>
                  <th className="text-left px-6 py-3 text-label">Expert</th>
                  <th className="text-right px-6 py-3">
                    <button
                      onClick={() => setNewSortAsc((s) => !s)}
                      className="inline-flex items-center gap-1 text-label hover:opacity-80"
                    >
                      Total <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-right px-6 py-3 text-label"># cmd</th>
                  <th className="text-right px-6 py-3 text-label">1ère cmd</th>
                </tr>
              </thead>
              <tbody>
                {newCustomersList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center" style={{ color: t.textTertiary }}>
                      Aucun nouveau client trouvé.
                    </td>
                  </tr>
                ) : (
                  newCustomersList.map((row) => (
                    <tr
                      key={`${row.customer}-${row.firstDate}`}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, salesReps: [row.rep], customers: [row.customer] }));
                        setStagedSelectedRep(row.rep);
                        setShowNewCustomersModal(false);
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.surface2)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-6 py-3" style={{ color: t.textPrimary }}>{row.customer}</td>
                      <td className="px-6 py-3" style={{ color: t.textSecondary }}>{row.rep}</td>
                      <td className="px-6 py-3 text-right font-mono-data font-medium" style={{ color: t.textPrimary }}>
                        {currency(row.spend)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textSecondary }}>
                        {row.orders}
                      </td>
                      <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textTertiary }}>
                        {row.firstDate}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 p-6">
            <div className="col-span-12 lg:col-span-7">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={newCustomersByRep}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.borderSubtle} strokeOpacity={0.5} />
                  <XAxis dataKey="rep" tick={{ fill: t.textTertiary, fontSize: 12 }} stroke={t.borderSubtle} />
                  <YAxis tick={{ fill: t.textTertiary, fontSize: 12 }} stroke={t.borderSubtle} />
                  <Tooltip content={<CustomTooltip format="number" t={t} />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={t.accent} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <table className="w-full text-[0.875rem]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                    <th className="text-left px-4 py-2 text-label">Représentant</th>
                    <th className="text-right px-4 py-2 text-label">Nouveaux</th>
                  </tr>
                </thead>
                <tbody>
                  {newCustomersByRep.map((r) => (
                    <tr
                      key={r.rep}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, salesReps: [r.rep], customers: [] }));
                        setStagedSelectedRep(r.rep);
                        setShowNewCustomersModal(false);
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.surface2)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-4 py-2" style={{ color: t.textPrimary }}>{r.rep}</td>
                      <td className="px-4 py-2 text-right font-mono-data" style={{ color: t.textSecondary }}>
                        {r.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div
          className="flex justify-end px-6 py-4"
          style={{ borderTop: `1px solid ${t.borderSubtle}` }}
        >
          <button
            onClick={() => setShowNewCustomersModal(false)}
            className="px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: t.surface2, color: t.textSecondary }}
          >
            Fermer
          </button>
        </div>
      </Modal>

      {/* Rep Growth Modal */}
      <Modal
        open={showRepGrowthModal}
        onClose={() => setShowRepGrowthModal(false)}
        title="Performance YOY des représentants"
        t={t}
        width="max-w-5xl"
      >
        <div className="flex items-center gap-2 px-6 py-3" style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
          <SegmentedControl
            options={[
              { key: "growth", label: `Croissance (${repsPerf.growth.length})`, color: t.success },
              { key: "loss", label: `Baisse (${repsPerf.loss.length})`, color: t.danger },
            ]}
            value={repGrowthTab}
            onChange={(k) => setRepGrowthTab(k as "growth" | "loss")}
            t={t}
          />
        </div>

        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-[0.875rem]">
            <thead className="sticky top-0" style={{ background: t.surface1 }}>
              <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                <th className="text-left px-6 py-3 text-label">Représentant</th>
                <th className="text-right px-6 py-3 text-label">N-1</th>
                <th className="text-right px-6 py-3 text-label">N</th>
                <th className="text-right px-6 py-3 text-label">Δ $</th>
                <th className="text-right px-6 py-3 text-label">Δ %</th>
              </tr>
            </thead>
            <tbody>
              {(repGrowthTab === "growth" ? repsPerf.growth : repsPerf.loss).map((row) => (
                <tr key={row.key} style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                  <td className="px-6 py-3" style={{ color: t.textPrimary }}>{row.key}</td>
                  <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textSecondary }}>
                    {currency(row.prev)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textPrimary }}>
                    {currency(row.curr)}
                  </td>
                  <td
                    className="px-6 py-3 text-right font-mono-data font-medium"
                    style={{ color: row.delta > 0 ? t.success : t.danger }}
                  >
                    {currency(row.delta)}
                  </td>
                  <td
                    className="px-6 py-3 text-right font-mono-data font-medium"
                    style={{ color: row.rate > 0 ? t.success : t.danger }}
                  >
                    {percentage(row.rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="flex justify-end px-6 py-4"
          style={{ borderTop: `1px solid ${t.borderSubtle}` }}
        >
          <button
            onClick={() => setShowRepGrowthModal(false)}
            className="px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: t.surface2, color: t.textSecondary }}
          >
            Fermer
          </button>
        </div>
      </Modal>

      {/* Customer Growth Modal */}
      <Modal
        open={showCustomerGrowthModal}
        onClose={() => setShowCustomerGrowthModal(false)}
        title="Performance YOY des clients"
        t={t}
        width="max-w-5xl"
      >
        <div className="flex items-center gap-2 px-6 py-3" style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
          <SegmentedControl
            options={[
              { key: "growth", label: `Croissance (${customersPerf.growth.length})`, color: t.success },
              { key: "loss", label: `Baisse (${customersPerf.loss.length})`, color: t.danger },
            ]}
            value={customerGrowthTab}
            onChange={(k) => setCustomerGrowthTab(k as "growth" | "loss")}
            t={t}
          />
        </div>

        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-[0.875rem]">
            <thead className="sticky top-0" style={{ background: t.surface1 }}>
              <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                <th className="text-left px-6 py-3 text-label">Client</th>
                <th className="text-right px-6 py-3 text-label">N-1</th>
                <th className="text-right px-6 py-3 text-label">N</th>
                <th className="text-right px-6 py-3 text-label">Δ $</th>
                <th className="text-right px-6 py-3 text-label">Δ %</th>
              </tr>
            </thead>
            <tbody>
              {(customerGrowthTab === "growth" ? customersPerf.growth : customersPerf.loss).map((row) => (
                <tr key={row.key} style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                  <td className="px-6 py-3" style={{ color: t.textPrimary }}>{row.key}</td>
                  <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textSecondary }}>
                    {currency(row.prev)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textPrimary }}>
                    {currency(row.curr)}
                  </td>
                  <td
                    className="px-6 py-3 text-right font-mono-data font-medium"
                    style={{ color: row.delta > 0 ? t.success : t.danger }}
                  >
                    {currency(row.delta)}
                  </td>
                  <td
                    className="px-6 py-3 text-right font-mono-data font-medium"
                    style={{ color: row.rate > 0 ? t.success : t.danger }}
                  >
                    {percentage(row.rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="flex justify-end px-6 py-4"
          style={{ borderTop: `1px solid ${t.borderSubtle}` }}
        >
          <button
            onClick={() => setShowCustomerGrowthModal(false)}
            className="px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: t.surface2, color: t.textSecondary }}
          >
            Fermer
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Page Export
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || status === "loading") {
    return null; 
  }
  
  const userRole = (session as any)?.user?.role;
  
  // Allow multiple roles
  const ALLOWED_ROLES = ["ventes-exec", "Gestionnaire", "Expert", "admin"];

  if (status === "unauthenticated" || !ALLOWED_ROLES.includes(userRole)) {
    return <AccessDenied />;
  }

  return (
    <main className="min-h-[100svh]">
      <div className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="mx-auto w-full max-w-[1920px]">
          <DashboardContent />
        </div>
      </div>
    </main>
  );
}
