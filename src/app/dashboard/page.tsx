// src/app/(dashboard)/page.tsx
"use client";

import LoadingAnimation from "@/components/LoadingAnimation";
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
   Animated Number
   ═══════════════════════════════════════════════════════════════════════════════ */
const AnimatedNumber = ({
  value,
  format,
  duration = 500,
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
   YOY Badge
   ═══════════════════════════════════════════════════════════════════════════════ */
const YOYBadge = ({ current, previous }: { current: number; previous: number }) => {
  const change = previous > 0 ? (current - previous) / previous : 0;
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 0.001;

  return (
    <div className="flex items-center gap-2 mt-3">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
          isNeutral
            ? "badge-neutral"
            : isPositive
            ? "badge-positive"
            : "badge-negative"
        }`}
      >
        {isNeutral ? (
          <Minus className="w-3.5 h-3.5" />
        ) : isPositive ? (
          <TrendingUp className="w-3.5 h-3.5" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5" />
        )}
        <span className="font-mono-data">{percentage(Math.abs(change))}</span>
      </div>
      <span className="text-[11px] font-medium text-[hsl(var(--text-muted))]">vs N-1</span>
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
      className="rounded-xl px-4 py-3 text-sm animate-scale-in shadow-xl"
      style={{
        background: t.bgElevated,
        border: `1px solid ${t.borderDefault}`,
      }}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>
        {label}
      </p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 py-1">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs font-medium" style={{ color: t.textSecondary }}>
            {entry.name}:
          </span>
          <span className="text-xs font-bold font-mono-data" style={{ color: t.textPrimary }}>
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
const CustomLegend = ({ payload, onLegendClick, selectedItems = [], t }: any) => {
  return (
    <ul className="flex flex-col gap-1 text-xs">
      {(payload || []).map((entry: any) => {
        const isSelected = selectedItems.length === 0 || selectedItems.includes(entry.value);
        return (
          <li
            key={entry.value}
            className={`flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg transition-all duration-150 ${
              isSelected ? "opacity-100" : "opacity-30"
            }`}
            onClick={() => onLegendClick?.(entry.value)}
            style={{ background: isSelected ? t.bgElevated : "transparent" }}
          >
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-semibold" style={{ color: t.textSecondary }}>
              {entry.value}
            </span>
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
    out[r.salesRepName][r.customerName] =
      (out[r.salesRepName][r.customerName] || 0) + r.salesValue;
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

const LoadingState = () => <LoadingAnimation />;

const ErrorState = ({ message }: { message: string }) => (
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <div className="surface-card p-8 max-w-md text-center animate-scale-in">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center badge-negative">
        <TrendingDown className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold mb-2">Erreur de chargement</h3>
      <p className="text-sm text-[hsl(var(--text-tertiary))] mb-6">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="btn-primary px-6 py-2.5"
      >
        Recharger
      </button>
    </div>
  </div>
);

const AccessDenied = () => (
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <div className="surface-card p-10 max-w-lg text-center animate-scale-in">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center surface-inset">
        <Users className="w-10 h-10 text-[hsl(var(--text-tertiary))]" />
      </div>
      <h3 className="text-2xl font-bold mb-3">Accès restreint</h3>
      <p className="text-sm text-[hsl(var(--text-tertiary))] leading-relaxed">
        Vous ne disposez pas des autorisations nécessaires pour consulter ces données.
      </p>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   KPI Card
   ═══════════════════════════════════════════════════════════════════════════════ */
function KpiCard({
  title,
  icon: Icon,
  children,
  className = "",
  t,
  onClick,
  accentColor,
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
  className?: string;
  t: ThemeTokens;
  onClick?: () => void;
  accentColor?: string;
}) {
  const isClickable = typeof onClick === "function";

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => isClickable && (e.key === "Enter" || e.key === " ") && onClick?.()}
      className={`
        relative rounded-2xl p-5 transition-all duration-200
        ${isClickable ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]" : ""}
        ${className}
      `}
      style={{
        background: t.bgSurface,
        border: `1px solid ${t.borderSubtle}`,
      }}
    >
      {/* Top accent bar */}
      {accentColor && (
        <div
          className="absolute top-0 left-6 right-6 h-0.5 rounded-b-full"
          style={{ background: accentColor }}
        />
      )}

      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--text-muted))]">
          {title}
        </span>
        {Icon && (
          <div
            className="p-2 rounded-xl"
            style={{
              background: accentColor ? `${accentColor}20` : t.bgMuted,
              color: accentColor || t.textTertiary,
            }}
          >
            <Icon className="w-4 h-4" strokeWidth={2.5} />
          </div>
        )}
      </div>

      <div>{children}</div>

      {isClickable && (
        <p className="text-[10px] font-medium mt-3 text-[hsl(var(--text-muted))]">
          Cliquer pour détails →
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Chart Card
   ═══════════════════════════════════════════════════════════════════════════════ */
function ChartCard({
  title,
  children,
  className = "",
  t,
  action,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  t: ThemeTokens;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl p-5 h-full flex flex-col animate-fade-in ${className}`}
      style={{
        background: t.bgSurface,
        border: `1px solid ${t.borderSubtle}`,
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>
          {title}
        </h3>
        {action}
      </div>
      <div className="flex-grow">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Segmented Control
   ═══════════════════════════════════════════════════════════════════════════════ */
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
      className="inline-flex rounded-xl p-1"
      style={{ background: t.bgMuted, border: `1px solid ${t.borderSubtle}` }}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
            style={{
              background: active ? (opt.color || t.accent) : "transparent",
              color: active ? t.bgBase : t.textTertiary,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Modal
   ═══════════════════════════════════════════════════════════════════════════════ */
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
        style={{ background: "rgba(0,0,0,0.75)" }}
        onClick={onClose}
      />
      <div
        className={`relative w-full ${width} rounded-2xl overflow-hidden animate-scale-in shadow-2xl`}
        style={{ background: t.bgSurface, border: `1px solid ${t.borderSubtle}` }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
        >
          <div>
            <h3 className="text-lg font-bold" style={{ color: t.textPrimary }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs font-medium mt-0.5" style={{ color: t.textTertiary }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-[hsl(var(--bg-elevated))]"
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
  const [filters, setFilters] = useState<FilterState>({
    salesReps: [],
    itemCodes: [],
    customers: [],
  });
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
          fetch(
            `/api/dashboard-data?startDate=${activeDateRange.start}&endDate=${activeDateRange.end}`
          ),
          fetch(
            `/api/dashboard-data?startDate=${previousYearDateRange.start}&endDate=${previousYearDateRange.end}`
          ),
          fetch(
            `/api/dashboard-data?startDate=${lookback3y.start}&endDate=${lookback3y.end}`
          ),
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
    () =>
      masterData
        ? Array.from(new Set(masterData.map((d) => d.salesRepName))).sort()
        : [],
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
      const repSelected =
        filters.salesReps.length === 0 || filters.salesReps.includes(d.salesRepName);
      const itemSelected =
        filters.itemCodes.length === 0 || filters.itemCodes.includes(d.itemCode);
      const customerSelected =
        filters.customers.length === 0 || filters.customers.includes(d.customerName);
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
    () =>
      previousYearData ? previousYearData.filter(recordPassesBasicFilters) : [],
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

  const handleSelect = (
    category: keyof FilterState,
    value: string,
    isShiftClick = false
  ) => {
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
  const totalSales = useMemo(
    () => filteredData.reduce((s, d) => s + d.salesValue, 0),
    [filteredData]
  );
  const transactionCount = filteredData.length;
  const previousTotalSales = useMemo(
    () => filteredPreviousData.reduce((s, d) => s + d.salesValue, 0),
    [filteredPreviousData]
  );
  const previousTransactionCount = filteredPreviousData.length;

  // Rep color map
  const salesRepColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const reps = masterData
      ? Array.from(new Set(masterData.map((d) => d.salesRepName))).sort()
      : [];
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
    () =>
      aggregateData(filteredData, "customerName", showAllCustomers ? undefined : 10),
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

    const allMonths = Array.from(
      new Set([...Object.keys(current), ...Object.keys(previous)])
    ).sort();
    return allMonths.map((m) => ({
      name: m,
      current: current[m] || 0,
      previous: previous[m] || 0,
    }));
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

    const allMonths = Array.from(
      new Set([...Object.keys(current), ...Object.keys(previous)])
    ).sort();
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
    const result: Record<
      string,
      { eligible: number; retained: number; rate: number | null }
    > = {};
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
      result[rep] = {
        eligible,
        retained,
        rate: eligible > 0 ? retained / eligible : null,
      };
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
  const prevCustomersSet = useMemo(
    () => new Set((history3yData ?? []).map((d) => d.customerName)),
    [history3yData]
  );

  const currentCustomerAgg = useMemo(() => {
    type Agg = {
      total: number;
      orders: number;
      firstDate: string;
      firstRep: string;
    };
    const map = new Map<string, Agg>();
    for (const r of filteredData) {
      const a = map.get(r.customerName);
      if (!a) {
        map.set(r.customerName, {
          total: r.salesValue,
          orders: 1,
          firstDate: r.invoiceDate,
          firstRep: r.salesRepName,
        });
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
    const rows: {
      customer: string;
      rep: string;
      spend: number;
      orders: number;
      firstDate: string;
    }[] = [];
    currentCustomerAgg.forEach((agg, cust) => {
      if (!prevCustomersSet.has(cust) && agg.total >= NEW_CUSTOMER_MIN_SPEND) {
        rows.push({
          customer: cust,
          rep: agg.firstRep,
          spend: agg.total,
          orders: agg.orders,
          firstDate: agg.firstDate,
        });
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
    return {
      growth,
      loss,
      eligible,
      pct: eligible > 0 ? growth.length / eligible : null,
    };
  }, [filteredDataNoYoy, filteredPreviousDataNoYoy]);

  // Guard rails
  if (error) return <ErrorState message={error.message} />;
  if (!mounted || isLoading) return <LoadingState />;

  return (
    <div className="p-6 space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════════
         Header
         ═══════════════════════════════════════════════════════════════════════════ */}
      <header
        className="rounded-2xl p-6 animate-slide-up"
        style={{ background: t.bgSurface, border: `1px solid ${t.borderSubtle}` }}
      >
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          {/* Title */}
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{ background: `${t.accent}20`, color: t.accent }}
            >
              <BarChart3 className="w-7 h-7" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: t.textPrimary }}>
                Analyse des ventes
                <span style={{ color: t.accent }}>.</span>
              </h1>
              <p className="text-sm font-medium mt-1" style={{ color: t.textTertiary }}>
                Intelligence d&apos;affaires avec comparaison YOY
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* YOY Toggle */}
            <button
              onClick={() => setShowYOYComparison(!showYOYComparison)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150"
              style={{
                background: showYOYComparison ? `${t.accent}20` : t.bgMuted,
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
              className="rounded-xl px-4 py-2.5 text-xs font-semibold transition-all focus:outline-none"
              style={{
                background: t.bgMuted,
                border: `1px solid ${t.borderSubtle}`,
                color: t.textPrimary,
              }}
            >
              <option value="">Tous les experts</option>
              {allSalesReps.map((rep) => (
                <option key={rep} value={rep}>
                  {rep}
                </option>
              ))}
            </select>

            {/* Date Inputs */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={stagedDateRange.start}
                onChange={(e) =>
                  setStagedDateRange((p) => ({ ...p, start: e.target.value }))
                }
                className="rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none"
                style={{
                  background: t.bgMuted,
                  border: `1px solid ${t.borderSubtle}`,
                  color: t.textPrimary,
                }}
              />
              <span className="text-xs font-medium" style={{ color: t.textMuted }}>
                à
              </span>
              <input
                type="date"
                value={stagedDateRange.end}
                onChange={(e) =>
                  setStagedDateRange((p) => ({ ...p, end: e.target.value }))
                }
                className="rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none"
                style={{
                  background: t.bgMuted,
                  border: `1px solid ${t.borderSubtle}`,
                  color: t.textPrimary,
                }}
              />
            </div>

            {/* Quick dates */}
            <div className="flex gap-1">
              {[
                {
                  label: "YTD",
                  fn: () => {
                    const today = new Date();
                    const yearStart = new Date(today.getFullYear(), 0, 1);
                    setStagedDateRange({
                      start: yearStart.toISOString().slice(0, 10),
                      end: today.toISOString().slice(0, 10),
                    });
                  },
                },
                {
                  label: "TTM",
                  fn: () => {
                    const today = new Date();
                    const yearAgo = new Date(today);
                    yearAgo.setDate(yearAgo.getDate() - 365);
                    setStagedDateRange({
                      start: yearAgo.toISOString().slice(0, 10),
                      end: today.toISOString().slice(0, 10),
                    });
                  },
                },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.fn}
                  className="px-3 py-2 rounded-lg text-[10px] font-bold transition-all"
                  style={{ background: t.bgMuted, color: t.textTertiary }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Apply */}
            <button onClick={applyFilters} className="btn-primary px-5 py-2.5 text-xs">
              Appliquer
            </button>

            {/* Reset */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="p-2.5 rounded-xl transition-all"
                style={{ color: t.textTertiary, background: t.bgMuted }}
                title="Réinitialiser"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════════
         KPI Grid
         ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          title="Chiffre d'affaires"
          icon={DollarSign}
          t={t}
          accentColor={t.accent}
          className="animate-slide-up stagger-1"
        >
          <p
            className="text-2xl font-extrabold font-mono-data tracking-tight"
            style={{ color: t.textPrimary }}
          >
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
        >
          <p
            className="text-2xl font-extrabold font-mono-data tracking-tight"
            style={{ color: t.textPrimary }}
          >
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
          onClick={() => setShowRepGrowthModal(true)}
          className="animate-slide-up stagger-3"
        >
          <p
            className="text-2xl font-extrabold font-mono-data tracking-tight"
            style={{ color: t.textPrimary }}
          >
            {repsPerf.pct === null ? "—" : percentage(repsPerf.pct)}
          </p>
          <p className="text-xs font-semibold mt-2" style={{ color: t.textTertiary }}>
            {repsPerf.growth.length}/{repsPerf.eligible} reps
          </p>
        </KpiCard>

        <KpiCard
          title="% Clients croissance"
          icon={Users}
          t={t}
          accentColor={chartColors[5]}
          onClick={() => setShowCustomerGrowthModal(true)}
          className="animate-slide-up stagger-4"
        >
          <p
            className="text-2xl font-extrabold font-mono-data tracking-tight"
            style={{ color: t.textPrimary }}
          >
            {customersPerf.pct === null ? "—" : percentage(customersPerf.pct)}
          </p>
          <p className="text-xs font-semibold mt-2" style={{ color: t.textTertiary }}>
            {customersPerf.growth.length}/{customersPerf.eligible} clients
          </p>
        </KpiCard>

        <KpiCard
          title="Taux rétention"
          icon={Target}
          t={t}
          accentColor={chartColors[3]}
          onClick={() => setShowRetentionTable(true)}
          className="animate-slide-up stagger-5"
        >
          <p
            className="text-2xl font-extrabold font-mono-data tracking-tight"
            style={{ color: t.textPrimary }}
          >
            {retentionAverage.avg === null ? "—" : percentage(retentionAverage.avg)}
          </p>
          <p className="text-xs font-semibold mt-2" style={{ color: t.textTertiary }}>
            Moy. {retentionAverage.eligibleReps} reps
          </p>
        </KpiCard>

        <KpiCard
          title="Nouveaux clients"
          icon={UserPlus}
          t={t}
          accentColor={chartColors[4]}
          onClick={() => setShowNewCustomersModal(true)}
          className="animate-slide-up stagger-6"
        >
          <p
            className="text-2xl font-extrabold font-mono-data tracking-tight"
            style={{ color: t.textPrimary }}
          >
            {formatNumber(newCustomersCount)}
          </p>
          <p className="text-xs font-semibold mt-2" style={{ color: t.textTertiary }}>
            Sans achat 3 ans
          </p>
        </KpiCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
         YOY Comparison Row
         ═══════════════════════════════════════════════════════════════════════════ */}
      {showYOYComparison && (
        <div className="grid grid-cols-12 gap-4">
          <ChartCard
            title="Comparaison YOY — Chiffre d'affaires"
            className="col-span-12 lg:col-span-8"
            t={t}
          >
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={salesComparisonByMonth}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={t.borderSubtle}
                  strokeOpacity={0.6}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: t.textTertiary, fontSize: 11, fontWeight: 600 }}
                  stroke={t.borderSubtle}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={compactCurrency}
                  tick={{ fill: t.textTertiary, fontSize: 11, fontWeight: 600 }}
                  stroke={t.borderSubtle}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={percentage}
                  tick={{ fill: t.textTertiary, fontSize: 11, fontWeight: 600 }}
                  stroke={t.borderSubtle}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip t={t} />} />
                <Legend
                  wrapperStyle={{ paddingTop: 16, fontSize: 11, fontWeight: 600 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="previous"
                  fill={t.textMuted}
                  name="N-1"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="current"
                  fill={t.accent}
                  name="Période actuelle"
                  radius={[6, 6, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="growth"
                  stroke={t.success}
                  strokeWidth={2.5}
                  dot={{ fill: t.success, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Croissance %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Performance comparative"
            className="col-span-12 lg:col-span-4"
            t={t}
          >
            <div className="space-y-4 h-full flex flex-col justify-between">
              <div
                className="p-4 rounded-xl"
                style={{ background: t.bgMuted, border: `1px solid ${t.borderSubtle}` }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                    Période actuelle
                  </span>
                  <Sparkles className="w-4 h-4" style={{ color: t.accent }} />
                </div>
                <div
                  className="text-xl font-extrabold font-mono-data"
                  style={{ color: t.textPrimary }}
                >
                  {currency(totalSales)}
                </div>
              </div>

              <div
                className="p-4 rounded-xl"
                style={{ background: t.bgMuted, border: `1px solid ${t.borderSubtle}` }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                    Année précédente
                  </span>
                  <Calendar className="w-4 h-4" style={{ color: t.textTertiary }} />
                </div>
                <div
                  className="text-xl font-extrabold font-mono-data"
                  style={{ color: t.textSecondary }}
                >
                  {currency(previousTotalSales)}
                </div>
              </div>

              <div
                className="p-4 rounded-xl"
                style={{
                  background: `${t.accent}15`,
                  border: `1px solid ${t.accent}30`,
                }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  Variation YOY
                </span>
                <div
                  className="text-2xl font-extrabold font-mono-data mt-1"
                  style={{ color: t.textPrimary }}
                >
                  {previousTotalSales > 0
                    ? percentage((totalSales - previousTotalSales) / previousTotalSales)
                    : "—"}
                </div>
                <div className="text-xs font-semibold mt-1" style={{ color: t.textTertiary }}>
                  Δ {currency(totalSales - previousTotalSales)}
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
         Main Charts
         ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-12 gap-4">
        {/* Pie Chart */}
        <ChartCard
          title="Répartition par expert"
          className="col-span-12 lg:col-span-5"
          t={t}
        >
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={salesByRep}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="90%"
                paddingAngle={2}
                animationDuration={600}
              >
                {salesByRep.map((entry) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={salesRepColorMap[entry.name]}
                    onClick={(e) =>
                      entry.name !== "Autres" &&
                      handleSelect("salesReps", entry.name, (e as any).shiftKey)
                    }
                    className={
                      entry.name === "Autres"
                        ? ""
                        : "cursor-pointer transition-opacity duration-150"
                    }
                    style={{
                      opacity:
                        filters.salesReps.length === 0 ||
                        filters.salesReps.includes(entry.name)
                          ? 1
                          : 0.25,
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
                      onLegendClick={(v: string) =>
                        v !== "Autres" && handleSelect("salesReps", v)
                      }
                      t={t}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Line Chart */}
        <ChartCard
          title="Évolution des transactions"
          className="col-span-12 lg:col-span-7"
          t={t}
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={transactionsByMonth}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.borderSubtle}
                strokeOpacity={0.6}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: t.textTertiary, fontSize: 11, fontWeight: 600 }}
                stroke={t.borderSubtle}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: t.textTertiary, fontSize: 11, fontWeight: 600 }}
                stroke={t.borderSubtle}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip format="number" t={t} />} />
              <Legend wrapperStyle={{ paddingTop: 16, fontSize: 11, fontWeight: 600 }} />
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
                strokeWidth={2.5}
                name="Période actuelle"
                dot={{ fill: chartColors[1], r: 4 }}
                activeDot={{ r: 6, fill: chartColors[1] }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Products Bar Chart */}
        <ChartCard
          title={`Top ${showAllProducts ? "" : "10 "}produits`}
          className="col-span-12 xl:col-span-6"
          t={t}
          action={
            <button
              onClick={() => setShowAllProducts(!showAllProducts)}
              className="text-xs font-bold flex items-center gap-1 transition-colors"
              style={{ color: t.accent }}
            >
              {showAllProducts ? "Moins" : "Tout voir"}
              <ChevronRight
                className={`w-4 h-4 transition-transform ${showAllProducts ? "rotate-90" : ""}`}
              />
            </button>
          }
        >
          <ResponsiveContainer
            width="100%"
            height={showAllProducts ? Math.max(360, salesByItem.length * 32) : 360}
          >
            <BarChart data={salesByItem} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.borderSubtle}
                strokeOpacity={0.6}
              />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fill: t.textTertiary, fontSize: 11, fontWeight: 600 }}
                stroke={t.borderSubtle}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fill: t.textSecondary, fontSize: 11, fontWeight: 600 }}
                stroke="none"
              />
              <Tooltip content={<CustomTooltip t={t} />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={500}>
                {salesByItem.map((entry, i) => (
                  <Cell
                    key={`item-${i}`}
                    fill={t.accent}
                    fillOpacity={1 - i * 0.06}
                    onClick={(e) =>
                      handleSelect("itemCodes", entry.name, (e as any).shiftKey)
                    }
                    className="cursor-pointer transition-opacity"
                    style={{
                      opacity:
                        filters.itemCodes.length === 0 ||
                        filters.itemCodes.includes(entry.name)
                          ? 1
                          : 0.25,
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
          action={
            <button
              onClick={() => setShowAllCustomers(!showAllCustomers)}
              className="text-xs font-bold flex items-center gap-1 transition-colors"
              style={{ color: t.accent }}
            >
              {showAllCustomers ? "Moins" : "Tout voir"}
              <ChevronRight
                className={`w-4 h-4 transition-transform ${showAllCustomers ? "rotate-90" : ""}`}
              />
            </button>
          }
        >
          <ResponsiveContainer
            width="100%"
            height={
              showAllCustomers ? Math.max(360, salesByCustomer.length * 32) : 360
            }
          >
            <BarChart data={salesByCustomer} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.borderSubtle}
                strokeOpacity={0.6}
              />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fill: t.textTertiary, fontSize: 11, fontWeight: 600 }}
                stroke={t.borderSubtle}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fill: t.textSecondary, fontSize: 11, fontWeight: 600 }}
                stroke="none"
              />
              <Tooltip content={<CustomTooltip t={t} />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={500}>
                {salesByCustomer.map((entry, i) => (
                  <Cell
                    key={`cust-${i}`}
                    fill={chartColors[1]}
                    fillOpacity={1 - i * 0.06}
                    onClick={(e) =>
                      handleSelect("customers", entry.name, (e as any).shiftKey)
                    }
                    className="cursor-pointer transition-opacity"
                    style={{
                      opacity:
                        filters.customers.length === 0 ||
                        filters.customers.includes(entry.name)
                          ? 1
                          : 0.25,
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
         Modals (keeping same structure but with updated styling)
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
          <table className="w-full text-sm">
            <thead className="sticky top-0" style={{ background: t.bgSurface }}>
              <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  Représentant
                </th>
                <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  Éligibles
                </th>
                <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  Retenus
                </th>
                <th className="text-right px-6 py-3">
                  <button
                    onClick={() => setRetentionSortAsc((s) => !s)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider hover:opacity-80"
                    style={{ color: t.textMuted }}
                  >
                    Taux <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from(visibleRepsForRetention)
                .map((rep) => ({
                  rep,
                  data: retentionByRep[rep] || { eligible: 0, retained: 0, rate: null },
                }))
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
                      setFilters((prev) => ({
                        ...prev,
                        salesReps: [rep],
                        itemCodes: [],
                        customers: [],
                      }));
                      setStagedSelectedRep(rep);
                      setShowRetentionTable(false);
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = t.bgElevated)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td className="px-6 py-3 font-semibold" style={{ color: t.textPrimary }}>
                      {rep}
                    </td>
                    <td
                      className="px-6 py-3 text-right font-mono-data font-semibold"
                      style={{ color: t.textSecondary }}
                    >
                      {formatNumber(data.eligible)}
                    </td>
                    <td
                      className="px-6 py-3 text-right font-mono-data font-semibold"
                      style={{ color: t.textSecondary }}
                    >
                      {formatNumber(data.retained)}
                    </td>
                    <td
                      className="px-6 py-3 text-right font-mono-data font-bold"
                      style={{ color: t.textPrimary }}
                    >
                      {data.rate === null ? "—" : percentage(data.rate)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div
          className="flex items-center justify-between px-6 py-4 text-xs font-semibold"
          style={{ borderTop: `1px solid ${t.borderSubtle}`, color: t.textTertiary }}
        >
          <span>
            Moyenne:{" "}
            {retentionAverage.avg === null ? "—" : percentage(retentionAverage.avg)}
          </span>
          <button
            onClick={() => setShowRetentionTable(false)}
            className="btn-secondary px-4 py-2 text-xs"
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
        <div
          className="flex items-center gap-2 px-6 py-3"
          style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
        >
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
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: t.bgSurface }}>
                <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                  <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                    Client
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                    Expert
                  </th>
                  <th className="text-right px-6 py-3">
                    <button
                      onClick={() => setNewSortAsc((s) => !s)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider hover:opacity-80"
                      style={{ color: t.textMuted }}
                    >
                      Total <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                    # cmd
                  </th>
                  <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                    1ère cmd
                  </th>
                </tr>
              </thead>
              <tbody>
                {newCustomersList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center font-medium"
                      style={{ color: t.textTertiary }}
                    >
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
                        setFilters((prev) => ({
                          ...prev,
                          salesReps: [row.rep],
                          customers: [row.customer],
                        }));
                        setStagedSelectedRep(row.rep);
                        setShowNewCustomersModal(false);
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = t.bgElevated)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td className="px-6 py-3 font-semibold" style={{ color: t.textPrimary }}>
                        {row.customer}
                      </td>
                      <td className="px-6 py-3 font-medium" style={{ color: t.textSecondary }}>
                        {row.rep}
                      </td>
                      <td
                        className="px-6 py-3 text-right font-mono-data font-bold"
                        style={{ color: t.textPrimary }}
                      >
                        {currency(row.spend)}
                      </td>
                      <td
                        className="px-6 py-3 text-right font-mono-data font-medium"
                        style={{ color: t.textSecondary }}
                      >
                        {row.orders}
                      </td>
                      <td
                        className="px-6 py-3 text-right font-mono-data font-medium"
                        style={{ color: t.textTertiary }}
                      >
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={t.borderSubtle}
                    strokeOpacity={0.6}
                  />
                  <XAxis
                    dataKey="rep"
                    tick={{ fill: t.textTertiary, fontSize: 11, fontWeight: 600 }}
                    stroke={t.borderSubtle}
                  />
                  <YAxis
                    tick={{ fill: t.textTertiary, fontSize: 11, fontWeight: 600 }}
                    stroke={t.borderSubtle}
                  />
                  <Tooltip content={<CustomTooltip format="number" t={t} />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill={t.accent} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                    <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                      Représentant
                    </th>
                    <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                      Nouveaux
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {newCustomersByRep.map((r) => (
                    <tr
                      key={r.rep}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
                      onClick={() => {
                        setFilters((prev) => ({
                          ...prev,
                          salesReps: [r.rep],
                          customers: [],
                        }));
                        setStagedSelectedRep(r.rep);
                        setShowNewCustomersModal(false);
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = t.bgElevated)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td className="px-4 py-2 font-semibold" style={{ color: t.textPrimary }}>
                        {r.rep}
                      </td>
                      <td
                        className="px-4 py-2 text-right font-mono-data font-bold"
                        style={{ color: t.textSecondary }}
                      >
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
            className="btn-secondary px-4 py-2 text-xs"
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
        <div
          className="flex items-center gap-2 px-6 py-3"
          style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
        >
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
          <table className="w-full text-sm">
            <thead className="sticky top-0" style={{ background: t.bgSurface }}>
              <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  Représentant
                </th>
                <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  N-1
                </th>
                <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  N
                </th>
                <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  Δ $
                </th>
                <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  Δ %
                </th>
              </tr>
            </thead>
            <tbody>
              {(repGrowthTab === "growth" ? repsPerf.growth : repsPerf.loss).map(
                (row) => (
                  <tr
                    key={row.key}
                    style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
                  >
                    <td className="px-6 py-3 font-semibold" style={{ color: t.textPrimary }}>
                      {row.key}
                    </td>
                    <td
                      className="px-6 py-3 text-right font-mono-data font-medium"
                      style={{ color: t.textSecondary }}
                    >
                      {currency(row.prev)}
                    </td>
                    <td
                      className="px-6 py-3 text-right font-mono-data font-bold"
                      style={{ color: t.textPrimary }}
                    >
                      {currency(row.curr)}
                    </td>
                    <td
                      className="px-6 py-3 text-right font-mono-data font-bold"
                      style={{ color: row.delta > 0 ? t.success : t.danger }}
                    >
                      {currency(row.delta)}
                    </td>
                    <td
                      className="px-6 py-3 text-right font-mono-data font-bold"
                      style={{ color: row.rate > 0 ? t.success : t.danger }}
                    >
                      {percentage(row.rate)}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <div
          className="flex justify-end px-6 py-4"
          style={{ borderTop: `1px solid ${t.borderSubtle}` }}
        >
          <button
            onClick={() => setShowRepGrowthModal(false)}
            className="btn-secondary px-4 py-2 text-xs"
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
        <div
          className="flex items-center gap-2 px-6 py-3"
          style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
        >
          <SegmentedControl
            options={[
              {
                key: "growth",
                label: `Croissance (${customersPerf.growth.length})`,
                color: t.success,
              },
              {
                key: "loss",
                label: `Baisse (${customersPerf.loss.length})`,
                color: t.danger,
              },
            ]}
            value={customerGrowthTab}
            onChange={(k) => setCustomerGrowthTab(k as "growth" | "loss")}
            t={t}
          />
        </div>

        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0" style={{ background: t.bgSurface }}>
              <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  Client
                </th>
                <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  N-1
                </th>
                <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  N
                </th>
                <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  Δ $
                </th>
                <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                  Δ %
                </th>
              </tr>
            </thead>
            <tbody>
              {(customerGrowthTab === "growth"
                ? customersPerf.growth
                : customersPerf.loss
              ).map((row) => (
                <tr
                  key={row.key}
                  style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
                >
                  <td className="px-6 py-3 font-semibold" style={{ color: t.textPrimary }}>
                    {row.key}
                  </td>
                  <td
                    className="px-6 py-3 text-right font-mono-data font-medium"
                    style={{ color: t.textSecondary }}
                  >
                    {currency(row.prev)}
                  </td>
                  <td
                    className="px-6 py-3 text-right font-mono-data font-bold"
                    style={{ color: t.textPrimary }}
                  >
                    {currency(row.curr)}
                  </td>
                  <td
                    className="px-6 py-3 text-right font-mono-data font-bold"
                    style={{ color: row.delta > 0 ? t.success : t.danger }}
                  >
                    {currency(row.delta)}
                  </td>
                  <td
                    className="px-6 py-3 text-right font-mono-data font-bold"
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
            className="btn-secondary px-4 py-2 text-xs"
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

  if (!mounted || status === "loading") return <LoadingState />;
  if (
    status === "unauthenticated" ||
    (session as any)?.user?.role !== "ventes-exec"
  ) {
    return <AccessDenied />;
  }

  return (
    <main className="min-h-[100svh] bg-[hsl(var(--bg-base))]">
      <DashboardContent />
    </main>
  );
}
