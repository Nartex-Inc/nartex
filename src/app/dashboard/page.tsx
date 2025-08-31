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

/** Brand neutrals + restrained accents (less green, more pro) */
const COLORS = {
  bg: "#000000", // pitch-black
  card: "rgba(8,10,12,0.72)",
  cardBorder: "rgba(120, 120, 130, 0.12)",
  grid: "#141922",
  label: "#9aa2af",
  labelMuted: "#737a86",
  accentPrimary: "#22d3ee", // cyan
  accentSecondary: "#8b5cf6", // violet
};

/** Categorical set for pie + bars */
const PIE_COLORS = [
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f59e0b", // amber
  "#22d3ee", // cyan
  "#ef4444", // red
  "#a3e635", // lime
  "#f472b6", // pink
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
      <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-md px-3 py-2 shadow-2xl">
        <p className="text-[11px] text-zinc-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-white">{currency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

/** Legend UI (we’ll pass it the already-patched payload) */
const CustomLegend = ({ payload, onLegendClick }: any) => {
  return (
    <ul className="flex flex-col space-y-1 text-[11px]">
      {(payload || []).map((entry: any) => (
        <li
          key={entry.value}
          className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onLegendClick?.(entry.value)}
        >
          <span
            className="w-2.5 h-2.5 rounded-[3px]"
            style={{ backgroundColor: entry.color, boxShadow: "0 0 0 1px rgba(255,255,255,0.06) inset" }}
          />
          <span className="text-zinc-300">{entry.value}</span>
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
    if (allReps.length <= 8) return allReps;
    const top = allReps.slice(0, 8);
    const othersValue = allReps.slice(8).reduce((s, r) => s + r.value, 0);
    return [...top, { name: "Autres", value: othersValue }];
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

  /** Color map for legend patching */
  const colorMap: Record<string, string> = {};
  salesByRep.forEach((d, i) => {
    colorMap[d.name] = d.name === "Autres" ? "#303a47" : PIE_COLORS[i % PIE_COLORS.length];
  });

  return (
    <div className="space-y-6">
      {/* Top ribbon / filters  */}
      <div className="rounded-2xl border" style={{ borderColor: COLORS.cardBorder, background: COLORS.card }}>
        <div className="px-4 md:px-6 py-4 md:py-5">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-white">
                Performance commerciale<span className="text-cyan-400">.</span>
              </h1>
              <p className="text-sm" style={{ color: COLORS.label }}>
                Vision unifiée de vos revenus — conçue pour l’action.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-3">
              <select
                value={stagedSelectedRep}
                onChange={(e) => setStagedSelectedRep(e.target.value)}
                className="appearance-none bg-black/60 border rounded-lg px-4 py-2.5 pr-10 text-sm text-white/90 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
                style={{ borderColor: COLORS.cardBorder }}
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
                  onChange={(e) => setStagedDateRange((p) => ({ ...p, start: e.target.value }))}
                  className="bg-black/60 border rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
                  style={{ borderColor: COLORS.cardBorder }}
                />
                <span className="text-zinc-500 text-sm">à</span>
                <input
                  type="date"
                  value={stagedDateRange.end}
                  onChange={(e) => setStagedDateRange((p) => ({ ...p, end: e.target.value }))}
                  className="bg-black/60 border rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
                  style={{ borderColor: COLORS.cardBorder }}
                />
              </div>

              <button
                onClick={applyFilters}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-black"
                style={{
                  background:
                    "linear-gradient(90deg, #22d3ee 0%, #8b5cf6 100%)",
                }}
              >
                Appliquer
              </button>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-200 hover:bg-white/5 transition-colors border"
                  style={{ borderColor: COLORS.cardBorder }}
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-12 gap-4">
        <KpiCard title="Chiffre d’affaires total" className="col-span-12 lg:col-span-4">
          <p className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            <AnimatedNumber value={totalSales} format={currency} />
          </p>
          <p className="text-sm mt-2" style={{ color: COLORS.label }}>
            {transactionCount.toLocaleString("fr-CA")} transactions • moyenne{" "}
            <span className="text-white font-medium">{currency(averageTransactionValue)}</span>
          </p>
        </KpiCard>

        <KpiCard title="Tendance 12 mois" className="col-span-12 lg:col-span-8">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={salesByMonth}>
              <defs>
                <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.accentPrimary} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS.accentPrimary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              <XAxis dataKey="name" tick={{ fill: COLORS.labelMuted, fontSize: 11 }} stroke={COLORS.grid} />
              <YAxis
                tickFormatter={compactCurrency}
                tick={{ fill: COLORS.labelMuted, fontSize: 11 }}
                stroke={COLORS.grid}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={COLORS.accentPrimary}
                strokeWidth={2}
                fill="url(#gArea)"
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </KpiCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-12 gap-4">
        <ChartCard title="Répartition par expert" className="col-span-12 lg:col-span-5 xl:col-span-4">
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={salesByRep}
                dataKey="value"
                nameKey="name"
                innerRadius="68%"
                outerRadius="100%"
                paddingAngle={2}
              >
                {salesByRep.map((entry, index) => (
                  <Cell
                    key={`cell-${index}-${animationKey}`}
                    fill={entry.name === "Autres" ? "#303a47" : PIE_COLORS[index % PIE_COLORS.length]}
                    onClick={(e) =>
                      entry.name !== "Autres" &&
                      handleSelect("salesReps", entry.name, (e as any).shiftKey)
                    }
                    className={entry.name === "Autres" ? "" : "cursor-pointer hover:opacity-85 transition-opacity"}
                    style={{
                      filter:
                        filters.salesReps.length === 0 || filters.salesReps.includes(entry.name)
                          ? "none"
                          : "grayscale(80%)",
                      opacity:
                        filters.salesReps.length === 0 || filters.salesReps.includes(entry.name)
                          ? 1
                          : 0.35,
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {/* Use Recharts payload but patch colors in content to MATCH the pie */}
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ paddingLeft: 14 }}
                content={(props: any) => {
                  const patched =
                    props?.payload?.map((p: any) => ({
                      ...p,
                      color: colorMap[p.value] ?? p.color,
                    })) ?? [];
                  return (
                    <CustomLegend
                      payload={patched}
                      onLegendClick={(v: string) => handleSelect("salesReps", v)}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Évolution du chiffre d’affaires"
          className="col-span-12 lg:col-span-7 xl:col-span-8"
        >
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={salesByMonth}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.accentSecondary} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={COLORS.accentSecondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              <XAxis dataKey="name" tick={{ fill: COLORS.labelMuted, fontSize: 11 }} stroke={COLORS.grid} />
              <YAxis
                tickFormatter={compactCurrency}
                tick={{ fill: COLORS.labelMuted, fontSize: 11 }}
                stroke={COLORS.grid}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={COLORS.accentSecondary}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#salesGradient)"
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 produits" className="col-span-12 xl:col-span-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={salesByItem} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
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
              <Bar dataKey="value" fill={COLORS.accentPrimary} radius={[0, 6, 6, 0]} animationDuration={900}>
                {salesByItem.map((entry, index) => (
                  <Cell
                    key={`cell-${index}-${animationKey}`}
                    onClick={(e) => handleSelect("itemCodes", entry.name, (e as any).shiftKey)}
                    className="cursor-pointer"
                    style={{
                      filter:
                        filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name)
                          ? "none"
                          : "grayscale(80%)",
                      opacity:
                        filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name)
                          ? 1
                          : 0.35,
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 clients" className="col-span-12 xl:col-span-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={salesByCustomer} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
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
              <Bar dataKey="value" fill={COLORS.accentSecondary} radius={[0, 6, 6, 0]} animationDuration={900}>
                {salesByCustomer.map((entry, index) => (
                  <Cell
                    key={`cell-${index}-${animationKey}`}
                    onClick={(e) => handleSelect("customers", entry.name, (e as any).shiftKey)}
                    className="cursor-pointer"
                    style={{
                      filter:
                        filters.customers.length === 0 || filters.customers.includes(entry.name)
                          ? "none"
                          : "grayscale(80%)",
                      opacity:
                        filters.customers.length === 0 || filters.customers.includes(entry.name)
                          ? 1
                          : 0.35,
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
   Page wrapper — pitch black + WIDER content
============================================================================= */
export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <LoadingState />;
  if (status === "unauthenticated" || session?.user?.role !== "ventes-exec")
    return <AccessDenied />;

  return (
    <main className={`min-h-screen ${inter.className}`} style={{ background: COLORS.bg, color: "#fff" }}>
      <div className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="mx-auto w-full max-w-[1720px]">
          <DashboardContent />
        </div>
      </div>
    </main>
  );
}

/* =============================================================================
   UI helpers (cards, states)
============================================================================= */
function KpiCard({
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
      <div
        className="absolute -inset-0.5 rounded-2xl blur opacity-0 group-hover:opacity-40 transition duration-500"
        style={{ background: "linear-gradient(90deg, rgba(34,211,238,0.25), rgba(139,92,246,0.25))" }}
      />
      <div
        className="relative rounded-2xl p-5 h-full"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
      >
        <h3 className="text-[12px] uppercase tracking-widest text-zinc-500 mb-2">{title}</h3>
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
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`group relative ${className}`}>
      <div
        className="absolute -inset-0.5 rounded-2xl blur opacity-0 group-hover:opacity-35 transition duration-500"
        style={{ background: "linear-gradient(90deg, rgba(34,211,238,0.20), rgba(139,92,246,0.20))" }}
      />
      <div
        className="relative rounded-2xl p-4 md:p-5 border h-full flex flex-col"
        style={{ background: COLORS.card, borderColor: COLORS.cardBorder }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium tracking-wide">{title}</h3>
        </div>
        <div className="flex-grow">{children}</div>
      </div>
    </div>
  );
}

const LoadingState = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-lg font-normal tracking-wide text-white">Chargement du tableau de bord…</p>
    </div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
    <div className="text-red-400 bg-zinc-950 rounded-xl p-8 border border-zinc-800 max-w-md text-center">
      <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
      <p className="text-sm text-zinc-400">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
      >
        Recharger la page
      </button>
    </div>
  </div>
);

const AccessDenied = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
    <div className="bg-zinc-950 rounded-xl p-8 border border-zinc-800 max-w-lg text-center">
      <h3 className="text-xl font-bold mb-2 text-white">Accès restreint</h3>
      <p className="text-sm text-zinc-400">
        Vous ne disposez pas des autorisations nécessaires pour consulter ces données.
        Veuillez contacter votre département TI pour de l&apos;aide.
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
