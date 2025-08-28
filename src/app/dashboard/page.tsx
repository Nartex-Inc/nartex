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
} from "recharts";

/* =============================================================================
   Font
============================================================================= */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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

const GRADIENT_COLORS = [
  { start: "#3b82f6", end: "#1e40af" },
  { start: "#8b5cf6", end: "#5b21b6" },
  { start: "#06b6d4", end: "#0e7490" },
  { start: "#10b981", end: "#047857" },
  { start: "#f59e0b", end: "#d97706" },
  { start: "#ef4444", end: "#b91c1c" },
  { start: "#ec4899", end: "#be185d" },
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

/* =============================================================================
   Animated number
============================================================================= */
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
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
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

/* =============================================================================
   Recharts custom bits
============================================================================= */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-2xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-white font-bold text-sm">{currency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = (props: any) => {
  const { payload, onLegendClick } = props;
  return (
    <ul className="flex flex-col space-y-1 text-xs">
      {payload.map((entry: any) => (
        <li
          key={entry.value}
          className={
            entry.value !== "Autres"
              ? "flex items-center space-x-2 cursor-pointer hover:opacity-70 transition-opacity"
              : "flex items-center space-x-2 opacity-50"
          }
          onClick={() => entry.value !== "Autres" && onLegendClick(entry.value)}
        >
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-400">{entry.value}</span>
        </li>
      ))}
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

  const [filters, setFilters] = useState<FilterState>({
    salesReps: [],
    itemCodes: [],
    customers: [],
  });
  const [animationKey, setAnimationKey] = useState(0);
  const [masterData, setMasterData] = useState<SalesRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/dashboard-data?startDate=${activeDateRange.start}&endDate=${activeDateRange.end}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
        }
        const data = await response.json();
        setMasterData(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeDateRange]);

  const filteredData = useMemo(() => {
    if (!masterData) return [];
    return masterData.filter(
      (d) =>
        (filters.salesReps.length === 0 || filters.salesReps.includes(d.salesRepName)) &&
        (filters.itemCodes.length === 0 || filters.itemCodes.includes(d.itemCode)) &&
        (filters.customers.length === 0 || filters.customers.includes(d.customerName))
    );
  }, [masterData, filters]);

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

  const totalSales = useMemo(
    () => filteredData.reduce((sum, d) => sum + d.salesValue, 0),
    [filteredData]
  );
  const transactionCount = useMemo(() => filteredData.length, [filteredData]);
  const averageTransactionValue = useMemo(
    () => (transactionCount > 0 ? totalSales / transactionCount : 0),
    [totalSales, transactionCount]
  );

  const salesByRep = useMemo(() => {
    const allReps = aggregateData(filteredData, "salesRepName");
    if (allReps.length <= 7) return allReps;
    const top7 = allReps.slice(0, 7);
    const othersValue = allReps.slice(7).reduce((sum, rep) => sum + rep.value, 0);
    return [...top7, { name: "Autres", value: othersValue }];
  }, [filteredData]);

  const salesByItem = useMemo(() => aggregateData(filteredData, "itemCode", 10), [filteredData]);
  const salesByCustomer = useMemo(
    () => aggregateData(filteredData, "customerName", 10),
    [filteredData]
  );
  const salesByMonth = useMemo(() => {
    const monthly = filteredData.reduce((acc, d) => {
      const monthKey = d.invoiceDate.slice(0, 7);
      acc[monthKey] = (acc[monthKey] || 0) + d.salesValue;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  if (error) return <ErrorState message={error.message} />;
  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-8">
      {/* Title / filters */}
      <div className="mb-6 md:mb-8 border-b border-gray-900 pb-6 md:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Tableau de bord<span className="text-blue-500">.</span>
          </h1>
          <div className="flex items-center flex-wrap gap-4">
            <select
              value={stagedSelectedRep}
              onChange={(e) => setStagedSelectedRep(e.target.value)}
              className="appearance-none bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:border-blue-500 transition-colors min-w-[200px]"
            >
              <option value="">Tous les experts</option>
              {allSalesReps.map((rep) => (
                <option key={rep} value={rep}>
                  {rep}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={stagedDateRange.start}
                onChange={(e) =>
                  setStagedDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <span className="text-gray-500">à</span>
              <input
                type="date"
                value={stagedDateRange.end}
                onChange={(e) =>
                  setStagedDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={applyFilters}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Appliquer
            </button>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-all"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="bg-gray-950/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-900">
        <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">
          Chiffre d&apos;affaires total
        </h3>
        <p className="text-5xl md:text-7xl font-bold tracking-tighter">
          <AnimatedNumber value={totalSales} format={currency} />
        </p>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mt-4 text-sm text-gray-400">
          <p>
            <span className="font-semibold text-white">
              {transactionCount.toLocaleString("fr-CA")}
            </span>{" "}
            transactions
          </p>
          <p>
            <span className="font-semibold text-white">
              {currency(averageTransactionValue)}
            </span>{" "}
            par transaction (moyenne)
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-12 gap-6">
        <ChartContainer title="Répartition par expert" className="col-span-12 lg:col-span-5 xl:col-span-4">
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <defs>
                {GRADIENT_COLORS.map((g, i) => (
                  <linearGradient key={`g-${i}`} id={`g-${i}`}>
                    <stop offset="0%" stopColor={g.start} />
                    <stop offset="100%" stopColor={g.end} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={salesByRep}
                dataKey="value"
                nameKey="name"
                innerRadius="70%"
                outerRadius="100%"
                paddingAngle={2}
              >
                {salesByRep.map((entry, index) => (
                  <Cell
                    key={`cell-${index}-${animationKey}`}
                    fill={
                      entry.name === "Autres"
                        ? "#374151"
                        : `url(#g-${index % GRADIENT_COLORS.length})`
                    }
                    onClick={(e) =>
                      entry.name !== "Autres" &&
                      handleSelect("salesReps", entry.name, (e as any).shiftKey)
                    }
                    className={
                      entry.name === "Autres"
                        ? ""
                        : "cursor-pointer hover:opacity-80 transition-opacity"
                    }
                    style={{
                      filter:
                        filters.salesReps.length === 0 ||
                        filters.salesReps.includes(entry.name)
                          ? "none"
                          : "grayscale(80%)",
                      opacity:
                        filters.salesReps.length === 0 ||
                        filters.salesReps.includes(entry.name)
                          ? 1
                          : 0.3,
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                content={
                  <CustomLegend
                    onLegendClick={(v: string) => handleSelect("salesReps", v)}
                  />
                }
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ paddingLeft: "20px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Évolution du chiffre d'affaires" className="col-span-12 lg:col-span-7 xl:col-span-8">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={salesByMonth}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} stroke="#1f2937" />
              <YAxis
                tickFormatter={compactCurrency}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                stroke="#1f2937"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#salesGradient)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Top 10 produits" className="col-span-12 xl:col-span-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={salesByItem} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                stroke="#1f2937"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fill: "#a0aec0", fontSize: 11 }}
                stroke="none"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} animationDuration={1000}>
                {salesByItem.map((entry, index) => (
                  <Cell
                    key={`cell-${index}-${animationKey}`}
                    onClick={(e) =>
                      handleSelect("itemCodes", entry.name, (e as any).shiftKey)
                    }
                    className="cursor-pointer"
                    style={{
                      filter:
                        filters.itemCodes.length === 0 ||
                        filters.itemCodes.includes(entry.name)
                          ? "none"
                          : "grayscale(80%)",
                      opacity:
                        filters.itemCodes.length === 0 ||
                        filters.itemCodes.includes(entry.name)
                          ? 1
                          : 0.3,
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Top 10 clients" className="col-span-12 xl:col-span-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={salesByCustomer} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                stroke="#1f2937"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fill: "#a0aec0", fontSize: 11 }}
                stroke="none"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} animationDuration={1000}>
                {salesByCustomer.map((entry, index) => (
                  <Cell
                    key={`cell-${index}-${animationKey}`}
                    onClick={(e) =>
                      handleSelect("customers", entry.name, (e as any).shiftKey)
                    }
                    className="cursor-pointer"
                    style={{
                      filter:
                        filters.customers.length === 0 ||
                        filters.customers.includes(entry.name)
                          ? "none"
                          : "grayscale(80%)",
                      opacity:
                        filters.customers.length === 0 ||
                        filters.customers.includes(entry.name)
                          ? 1
                          : 0.3,
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};

/* =============================================================================
   Page wrapper (adds spacing from header & sidebar)
============================================================================= */
export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <LoadingState />;
  if (status === "unauthenticated" || session?.user?.role !== "ventes-exec")
    return <AccessDenied />;

  return (
    <main className={`min-h-screen bg-black ${inter.className}`}>
      {/* Offset for fixed header + sidebar and add nice gutters */}
      <div className="pt-16 xl:ml-64 max-w-7xl 2xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <DashboardContent />
      </div>
    </main>
  );
}

/* =============================================================================
   UI helpers
============================================================================= */
function ChartContainer({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`group relative ${className}`}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-900 to-purple-900 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500" />
      <div className="relative bg-gray-950/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-900 h-full flex flex-col">
        <h3 className="text-sm font-medium text-white tracking-wide mb-4">{title}</h3>
        <div className="flex-grow">{children}</div>
      </div>
    </div>
  );
}

const LoadingState = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-lg font-normal tracking-wide text-white">
        Chargement du tableau de bord...
      </p>
    </div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
    <div className="text-red-500 bg-gray-900 rounded-xl p-8 border border-gray-800 max-w-md text-center">
      <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
      <p className="text-sm text-gray-400">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
      >
        Recharger la page
      </button>
    </div>
  </div>
);

const AccessDenied = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
    <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 max-w-lg text-center">
      <h3 className="text-xl font-bold mb-2 text-white">Accès restreint</h3>
      <p className="text-sm text-gray-400">
        Vous ne disposez pas des autorisations nécessaires pour consulter ces
        données. Veuillez contacter votre département TI pour de l&apos;aide.
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
