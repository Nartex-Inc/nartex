"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
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
  AreaChart,
  Area,
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
  BarChart3
} from "lucide-react";

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

/** Premium color palette with gradients */
const COLORS = {
  bg: "#000000",
  card: "rgba(5,7,10,0.92)",
  cardBorder: "rgba(120, 120, 130, 0.08)",
  grid: "#0f1419",
  label: "#9aa2af",
  labelMuted: "#737a86",
  accentPrimary: "#22d3ee",
  accentSecondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  gradientPrimary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  gradientSuccess: "linear-gradient(135deg, #667eea 0%, #22d3ee 100%)",
  gradientDanger: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
};

/** Fixed categorical colors for consistency */
const PIE_COLORS = [
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f59e0b", // amber
  "#22d3ee", // cyan
  "#ef4444", // red
  "#a3e635", // lime
  "#f472b6", // pink
  "#6366f1", // indigo
  "#14b8a6", // teal
];

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
  format = "percentage" 
}: { 
  current: number; 
  previous: number;
  format?: "percentage" | "number";
}) => {
  const change = previous > 0 ? (current - previous) / previous : 0;
  const isPositive = change >= 0;
  const isNeutral = Math.abs(change) < 0.001;

  return (
    <div className="flex items-center gap-2 mt-2">
      <div
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-xl ${
          isNeutral
            ? "bg-zinc-800/50 text-zinc-400"
            : isPositive
            ? "bg-emerald-500/15 text-emerald-400 shadow-emerald-500/20 shadow-lg"
            : "bg-red-500/15 text-red-400 shadow-red-500/20 shadow-lg"
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
      <span className="text-xs text-zinc-500">vs année précédente</span>
    </div>
  );
};

/* =============================================================================
   Custom Recharts components
============================================================================= */
const CustomTooltip = ({ active, payload, label, format = "currency" }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-black/95 backdrop-blur-2xl border border-white/15 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-xs text-zinc-400 mb-2 font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full shadow-lg"
              style={{ 
                backgroundColor: entry.color,
                boxShadow: `0 0 10px ${entry.color}50`
              }}
            />
            <p className="text-sm font-semibold text-white">
              {entry.name}: {
                format === "number" 
                  ? formatNumber(entry.value)
                  : format === "percentage"
                  ? percentage(entry.value)
                  : currency(entry.value)
              }
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload, onLegendClick, selectedItems = [] }: any) => {
  return (
    <ul className="flex flex-col space-y-2 text-xs">
      {(payload || []).map((entry: any) => {
        const isSelected = selectedItems.length === 0 || selectedItems.includes(entry.value);
        return (
          <li
            key={entry.value}
            className={`flex items-center space-x-2.5 cursor-pointer transition-all duration-300 px-2 py-1 rounded-lg hover:bg-white/5 ${
              isSelected ? "opacity-100" : "opacity-35"
            }`}
            onClick={() => onLegendClick?.(entry.value)}
          >
            <span
              className="w-3.5 h-3.5 rounded-md transition-all duration-300"
              style={{
                backgroundColor: entry.color,
                boxShadow: isSelected 
                  ? `0 0 12px ${entry.color}60, 0 0 0 1px rgba(255,255,255,0.2) inset`
                  : "0 0 0 1px rgba(255,255,255,0.08) inset",
                transform: isSelected ? "scale(1.1)" : "scale(1)",
              }}
            />
            <span className="text-zinc-300 font-medium">{entry.value}</span>
          </li>
        );
      })}
    </ul>
  );
};

/* =============================================================================
   Main dashboard content
============================================================================= */
const DashboardContent = () => {
  const defaultDateRange = {
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
      .toISOString()
      .slice(0, 10),
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
          const errorData = await currentResponse.json();
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
          }
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

  const handleSelect = (
    category: keyof FilterState,
    value: string,
    isShiftClick: boolean = false
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
    const uniqueReps = new Set(filteredData.map(d => d.salesRepName));
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
      map[rep] = PIE_COLORS[index % PIE_COLORS.length];
    });
    map["Autres"] = "#303a47";
    return map;
  }, [allSalesReps]);

  const salesByRep = useMemo(() => {
    const allReps = aggregateData(filteredData, "salesRepName");
    if (allReps.length <= 8) return allReps;
    const top = allReps.slice(0, 8);
    const othersValue = allReps.slice(8).reduce((s, r) => s + r.value, 0);
    return [...top, { name: "Autres", value: othersValue }];
  }, [filteredData]);

  const salesByItem = useMemo(() => 
    aggregateData(filteredData, "itemCode", showAllProducts ? undefined : 10), 
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
      const adjustedMonth = monthKey.replace(/^(\d{4})/, (match, year) => 
        String(parseInt(year) + 1)
      );
      acc[adjustedMonth] = (acc[adjustedMonth] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const allMonths = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)])).sort();
    
    return allMonths.map(month => ({
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
      const adjustedMonth = monthKey.replace(/^(\d{4})/, (match, year) => 
        String(parseInt(year) + 1)
      );
      acc[adjustedMonth] = (acc[adjustedMonth] || 0) + d.salesValue;
      return acc;
    }, {} as Record<string, number>);

    const allMonths = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)])).sort();
    
    return allMonths.map(month => ({
      name: month.slice(5),
      current: current[month] || 0,
      previous: previous[month] || 0,
      growth: previous[month] > 0 ? ((current[month] || 0) - previous[month]) / previous[month] : 0,
    }));
  }, [filteredData, filteredPreviousData]);

  if (error) return <ErrorState message={error.message} />;
  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div 
        className="rounded-3xl border backdrop-blur-2xl relative overflow-hidden" 
        style={{ 
          borderColor: COLORS.cardBorder, 
          background: `linear-gradient(135deg, ${COLORS.card} 0%, rgba(139,92,246,0.02) 100%)`
        }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/5 to-violet-500/5 rounded-full blur-3xl" />
        <div className="px-6 py-6 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 backdrop-blur-xl">
                  <BarChart3 className="w-6 h-6 text-cyan-400" />
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                  SINTO Analytics<span className="text-cyan-400">.</span>
                </h1>
              </div>
              <p className="text-sm ml-12" style={{ color: COLORS.label }}>
                Intelligence d'affaires en temps réel avec analyse comparative YOY
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-3">
              <button
                onClick={() => setShowYOYComparison(!showYOYComparison)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  showYOYComparison
                    ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20"
                    : "bg-black/40 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Comparaison YOY
              </button>

              <select
                value={stagedSelectedRep}
                onChange={(e) => setStagedSelectedRep(e.target.value)}
                className="appearance-none bg-black/50 backdrop-blur-xl border rounded-xl px-4 py-2.5 pr-10 text-sm text-white/90 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                style={{ borderColor: COLORS.cardBorder }}
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
                    className="bg-black/50 backdrop-blur-xl border rounded-xl px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    style={{ borderColor: COLORS.cardBorder }}
                  />
                  <span className="text-zinc-500 text-sm">à</span>
                  <input
                    type="date"
                    value={stagedDateRange.end}
                    onChange={(e) => setStagedDateRange((p) => ({ ...p, end: e.target.value }))}
                    className="bg-black/50 backdrop-blur-xl border rounded-xl px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    style={{ borderColor: COLORS.cardBorder }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const today = new Date();
                      const yearStart = new Date(today.getFullYear(), 0, 1);
                      setStagedDateRange({
                        start: yearStart.toISOString().slice(0, 10),
                        end: today.toISOString().slice(0, 10)
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/50 backdrop-blur-xl border text-zinc-300 hover:text-white hover:bg-white/5 hover:border-cyan-500/30 transition-all duration-200"
                    style={{ borderColor: COLORS.cardBorder }}
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
                        end: today.toISOString().slice(0, 10)
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/50 backdrop-blur-xl border text-zinc-300 hover:text-white hover:bg-white/5 hover:border-cyan-500/30 transition-all duration-200"
                    style={{ borderColor: COLORS.cardBorder }}
                  >
                    TTM
                  </button>
                </div>
              </div>

              <button
                onClick={applyFilters}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-black hover:scale-105 transition-all duration-300 shadow-2xl"
                style={{
                  background: "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)",
                  boxShadow: "0 10px 30px rgba(34, 211, 238, 0.4)",
                }}
              >
                Appliquer
              </button>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-200 hover:bg-white/10 transition-all duration-300 border backdrop-blur-xl"
                  style={{ borderColor: COLORS.cardBorder }}
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
          gradient="from-cyan-500/20 to-blue-500/20"
          className="col-span-12 md:col-span-6 lg:col-span-3"
        >
          <p className="text-3xl font-bold tracking-tight text-white">
            <AnimatedNumber value={totalSales} format={currency} />
          </p>
          {showYOYComparison && previousTotalSales > 0 && (
            <YOYIndicator current={totalSales} previous={previousTotalSales} />
          )}
        </KpiCard>

        <KpiCard
          title="Nombre de transactions"
          icon={<Package className="w-5 h-5" />}
          gradient="from-violet-500/20 to-purple-500/20"
          className="col-span-12 md:col-span-6 lg:col-span-3"
        >
          <p className="text-3xl font-bold tracking-tight text-white">
            <AnimatedNumber value={transactionCount} format={formatNumber} />
          </p>
          {showYOYComparison && previousTransactionCount > 0 && (
            <YOYIndicator current={transactionCount} previous={previousTransactionCount} />
          )}
        </KpiCard>

        <KpiCard
          title="Valeur moyenne/transaction"
          icon={<Activity className="w-5 h-5" />}
          gradient="from-emerald-500/20 to-teal-500/20"
          className="col-span-12 md:col-span-6 lg:col-span-3"
        >
          <p className="text-3xl font-bold tracking-tight text-white">
            <AnimatedNumber value={averageTransactionValue} format={currency} />
          </p>
          {showYOYComparison && previousTransactionCount > 0 && (
            <YOYIndicator
              current={averageTransactionValue}
              previous={previousTotalSales / previousTransactionCount}
            />
          )}
        </KpiCard>

        <KpiCard
          title="Experts actifs"
          icon={<Users className="w-5 h-5" />}
          gradient="from-amber-500/20 to-orange-500/20"
          className="col-span-12 md:col-span-6 lg:col-span-3"
        >
          <p className="text-3xl font-bold tracking-tight text-white">
            {activeExpertsCount}
          </p>
          <p className="text-sm mt-2" style={{ color: COLORS.label }}>
            sur {allSalesReps.length} total
          </p>
        </KpiCard>
      </div>

      {/* YOY Comparison Section */}
      {showYOYComparison && (
        <div className="grid grid-cols-12 gap-4">
          <ChartCard
            title="Comparaison YOY - Chiffre d'affaires"
            className="col-span-12 lg:col-span-8"
          >
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={salesComparisonByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} strokeOpacity={0.3} />
                <XAxis dataKey="name" tick={{ fill: COLORS.labelMuted, fontSize: 11 }} stroke={COLORS.grid} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={compactCurrency}
                  tick={{ fill: COLORS.labelMuted, fontSize: 11 }}
                  stroke={COLORS.grid}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={percentage}
                  tick={{ fill: COLORS.labelMuted, fontSize: 11 }}
                  stroke={COLORS.grid}
                />
                <Tooltip content={<CustomTooltip format="currency" />} />
                <Legend />
                <Bar yAxisId="left" dataKey="previous" fill={COLORS.labelMuted} name="Année précédente" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="left" dataKey="current" fill={COLORS.accentPrimary} name="Période actuelle" radius={[6, 6, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="growth"
                  stroke={COLORS.success}
                  strokeWidth={3}
                  dot={{ fill: COLORS.success, r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Croissance %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Performance comparative"
            className="col-span-12 lg:col-span-4"
          >
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs uppercase tracking-wider text-zinc-500">CA période actuelle</span>
                  <Zap className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-white">{currency(totalSales)}</div>
              </div>
              
              <div className="p-4 rounded-xl bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs uppercase tracking-wider text-zinc-500">CA année précédente</span>
                  <Calendar className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-2xl font-bold text-zinc-300">{currency(previousTotalSales)}</div>
              </div>
              
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-violet-500/10 backdrop-blur-xl border border-cyan-500/20">
                <div className="text-xs uppercase tracking-wider text-zinc-400 mb-2">Variation YOY</div>
                <div className="text-3xl font-bold text-white">
                  {previousTotalSales > 0 
                    ? percentage((totalSales - previousTotalSales) / previousTotalSales)
                    : "N/A"}
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  Différence: {currency(totalSales - previousTotalSales)}
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      )}

      {/* Main Charts */}
      <div className="grid grid-cols-12 gap-4">
        <ChartCard title="Répartition par expert" className="col-span-12 lg:col-span-5">
          <ResponsiveContainer width="100%" height={350}>
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
                {salesByRep.map((entry, index) => (
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
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ paddingLeft: 20 }}
                content={(props: any) => {
                  const patchedPayload = props?.payload?.map((p: any) => ({
                    ...p,
                    color: salesRepColorMap[p.value] || p.color,
                  })) ?? [];
                  return (
                    <CustomLegend
                      payload={patchedPayload}
                      selectedItems={filters.salesReps}
                      onLegendClick={(v: string) => v !== "Autres" && handleSelect("salesReps", v)}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Évolution du nombre de transactions"
          className="col-span-12 lg:col-span-7"
        >
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={transactionsByMonth}>
              <defs>
                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.accentSecondary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS.accentSecondary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} strokeOpacity={0.3} />
              <XAxis dataKey="name" tick={{ fill: COLORS.labelMuted, fontSize: 11 }} stroke={COLORS.grid} />
              <YAxis tick={{ fill: COLORS.labelMuted, fontSize: 11 }} stroke={COLORS.grid} />
              <Tooltip content={<CustomTooltip format="number" />} />
              <Legend />
              {showYOYComparison && (
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke={COLORS.labelMuted}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Année précédente"
                  dot={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="current"
                stroke={COLORS.accentSecondary}
                strokeWidth={3}
                name="Période actuelle"
                dot={{ fill: COLORS.accentSecondary, r: 5 }}
                activeDot={{ r: 8, boxShadow: `0 0 20px ${COLORS.accentSecondary}` }}
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
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                {showAllProducts ? "Voir moins" : "Voir tout"}
                <ChevronRight className={`w-3 h-3 transition-transform ${showAllProducts ? "rotate-90" : ""}`} />
              </button>
            </div>
          }
          className="col-span-12 xl:col-span-6"
        >
          <ResponsiveContainer width="100%" height={showAllProducts ? Math.max(400, salesByItem.length * 35) : 400}>
            <BarChart data={salesByItem} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} strokeOpacity={0.3} />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fill: COLORS.labelMuted, fontSize: 11 }}
                stroke={COLORS.grid}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: COLORS.label, fontSize: 11 }}
                stroke="none"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={1000}>
                {salesByItem.map((entry, index) => (
                  <Cell
                    key={`cell-${index}-${animationKey}`}
                    fill={`${COLORS.accentPrimary}${Math.round(255 * (1 - index / salesByItem.length)).toString(16).padStart(2, '0')}`}
                    onClick={(e) => handleSelect("itemCodes", entry.name, (e as any).shiftKey)}
                    className="cursor-pointer hover:brightness-110 transition-all"
                    style={{
                      filter:
                        filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name)
                          ? "none"
                          : "grayscale(80%)",
                      opacity:
                        filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name)
                          ? 1
                          : 0.3,
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
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                {showAllCustomers ? "Voir moins" : "Voir tout"}
                <ChevronRight className={`w-3 h-3 transition-transform ${showAllCustomers ? "rotate-90" : ""}`} />
              </button>
            </div>
          }
          className="col-span-12 xl:col-span-6"
        >
          <ResponsiveContainer width="100%" height={showAllCustomers ? Math.max(400, salesByCustomer.length * 35) : 400}>
            <BarChart data={salesByCustomer} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} strokeOpacity={0.3} />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fill: COLORS.labelMuted, fontSize: 11 }}
                stroke={COLORS.grid}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fill: COLORS.label, fontSize: 11 }}
                stroke="none"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={1000}>
                {salesByCustomer.map((entry, index) => (
                  <Cell
                    key={`cell-${index}-${animationKey}`}
                    fill={`${COLORS.accentSecondary}${Math.round(255 * (1 - index / salesByCustomer.length)).toString(16).padStart(2, '0')}`}
                    onClick={(e) => handleSelect("customers", entry.name, (e as any).shiftKey)}
                    className="cursor-pointer hover:brightness-110 transition-all"
                    style={{
                      filter:
                        filters.customers.length === 0 || filters.customers.includes(entry.name)
                          ? "none"
                          : "grayscale(80%)",
                      opacity:
                        filters.customers.length === 0 || filters.customers.includes(entry.name)
                          ? 1
                          : 0.3,
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

  if (status === "loading") return <LoadingState />;
  if (status === "unauthenticated" || session?.user?.role !== "ventes-exec")
    return <AccessDenied />;

  return (
    <main 
      className={`min-h-screen ${inter.className}`} 
      style={{ 
        background: `linear-gradient(180deg, ${COLORS.bg} 0%, #050507 100%)`,
        color: "#fff" 
      }}
    >
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>
      <div className="px-4 md:px-6 lg:px-8 py-6 md:py-8 relative z-10">
        <div className="mx-auto w-full max-w-[1920px]">
          <DashboardContent />
        </div>
      </div>
    </main>
  );
}

/* =============================================================================
   UI components
============================================================================= */
function KpiCard({
  title,
  icon,
  gradient,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  gradient?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`group relative ${className}`}>
      <div
        className="absolute -inset-0.5 rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition duration-700"
        style={{ 
          background: gradient 
            ? `linear-gradient(135deg, ${gradient})`
            : "linear-gradient(135deg, rgba(34,211,238,0.3), rgba(139,92,246,0.3))" 
        }}
      />
      <div
        className="relative rounded-2xl p-6 h-full backdrop-blur-xl border transition-all duration-300 hover:border-white/10"
        style={{ 
          background: `linear-gradient(135deg, ${COLORS.card} 0%, rgba(255,255,255,0.01) 100%)`,
          borderColor: COLORS.cardBorder
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">{title}</h3>
          {icon && (
            <div 
              className="p-2 rounded-lg backdrop-blur-xl"
              style={{ 
                background: gradient 
                  ? `linear-gradient(135deg, ${gradient})`
                  : "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(139,92,246,0.2))" 
              }}
            >
              <div className="text-white/80">{icon}</div>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`group relative ${className}`}>
      <div
        className="absolute -inset-0.5 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition duration-700"
        style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(139,92,246,0.15))" }}
      />
      <div
        className="relative rounded-2xl p-5 border h-full flex flex-col backdrop-blur-xl transition-all duration-300 hover:border-white/10"
        style={{ 
          background: `linear-gradient(135deg, ${COLORS.card} 0%, rgba(255,255,255,0.01) 100%)`,
          borderColor: COLORS.cardBorder 
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold tracking-wide text-white uppercase">{title}</h3>
        </div>
        <div className="flex-grow">{children}</div>
      </div>
    </div>
  );
}

const LoadingState = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center">
    <div className="flex flex-col items-center space-y-6">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-cyan-400/10 rounded-full" />
        <div className="absolute top-0 w-24 h-24 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-lg shadow-cyan-400/50" />
        <div className="absolute top-2 left-2 w-20 h-20 border-4 border-violet-400 border-b-transparent rounded-full animate-spin animation-delay-200 shadow-lg shadow-violet-400/50" />
      </div>
      <div className="text-center">
        <p className="text-xl font-light tracking-wider text-white mb-2">Chargement en cours</p>
        <p className="text-sm text-zinc-500">SINTO Analytics Dashboard</p>
      </div>
    </div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
    <div className="text-red-400 bg-gradient-to-br from-red-950/20 to-zinc-950 rounded-2xl p-8 border border-red-900/30 max-w-md text-center backdrop-blur-xl">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
        <TrendingDown className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-xl font-bold mb-2">Erreur de chargement</h3>
      <p className="text-sm text-zinc-400 mb-6">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 text-red-400 rounded-xl hover:from-red-500/30 hover:to-red-600/30 transition-all duration-300 font-semibold"
      >
        Recharger la page
      </button>
    </div>
  </div>
);

const AccessDenied = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
    <div className="bg-gradient-to-br from-zinc-950 to-zinc-900 rounded-2xl p-10 border border-zinc-800 max-w-lg text-center backdrop-blur-xl">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/10 to-violet-500/10 flex items-center justify-center">
        <Users className="w-10 h-10 text-zinc-400" />
      </div>
      <h3 className="text-2xl font-bold mb-3 text-white">Accès restreint</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Vous ne disposez pas des autorisations nécessaires pour consulter ces données.
        Veuillez contacter votre département TI pour obtenir l'accès approprié.
      </p>
    </div>
  </div>
);

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
