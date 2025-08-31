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

const EMERALD = "#10b981";
const TEAL = "#14b8a6";
const MINT = "#34d399";
const CARD_BORDER = "#1f2937";
const GRID = "#1b2530";
const LABEL = "#9ca3af";
const MUTED = "#6b7280";
const SURFACE = "rgba(9, 11, 14, 0.7)";

const SEGMENT_GRADIENTS = [
  { start: "#10b981", end: "#065f46" },
  { start: "#34d399", end: "#047857" },
  { start: "#0ea5e9", end: "#075985" },
  { start: "#22d3ee", end: "#155e75" },
  { start: "#a3e635", end: "#3f6212" },
  { start: "#f59e0b", end: "#7c2d12" },
  { start: "#ef4444", end: "#7f1d1d" },
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
   Background twinkles (subtle, consistent with auth screens)
============================================================================= */
const TwinkleField: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    type Star = {
      x: number;
      y: number;
      s: number;
      phase: number;
      speed: number;
      driftX: number;
      driftY: number;
    };

    const stars: Star[] = Array.from({ length: 28 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: Math.random() * 1.1 + 0.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.003,
      driftX: (Math.random() - 0.5) * 0.04,
      driftY: (Math.random() - 0.5) * 0.04,
    }));

    const drawStar = (s: Star, t: number) => {
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      const size = s.s * 2;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.globalAlpha = a * 0.75;
      ctx.strokeStyle = "rgba(16,185,129,0.9)";
      ctx.lineWidth = 0.5;

      ctx.beginPath();
      ctx.moveTo(-size, 0);
      ctx.lineTo(size, 0);
      ctx.moveTo(0, -size);
      ctx.lineTo(0, size);
      ctx.stroke();

      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.6);
      grd.addColorStop(0, "rgba(110,231,183,0.6)");
      grd.addColorStop(1, "rgba(110,231,183,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const loop: FrameRequestCallback = (ts) => {
      ctx.fillStyle = "rgba(10, 12, 14, 0.25)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const s of stars) {
        s.x += s.driftX;
        s.y += s.driftY;
        if (s.x < -8) s.x = canvas.width + 8;
        if (s.x > canvas.width + 8) s.x = -8;
        if (s.y < -8) s.y = canvas.height + 8;
        if (s.y > canvas.height + 8) s.y = -8;
        drawStar(s, ts);
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="fixed inset-0 -z-10 pointer-events-none" />;
};

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
      <div className="bg-zinc-950/90 backdrop-blur-xl border border-emerald-500/20 rounded-lg px-3 py-2 shadow-2xl">
        <p className="text-[11px] text-zinc-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-white">{currency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = (props: any) => {
  const { payload, onLegendClick } = props;
  return (
    <ul className="flex flex-col space-y-1 text-[11px]">
      {payload.map((entry: any) => (
        <li
          key={entry.value}
          className={
            entry.value !== "Autres"
              ? "flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
              : "flex items-center space-x-2 opacity-50"
          }
          onClick={() => entry.value !== "Autres" && onLegendClick(entry.value)}
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-zinc-400">{entry.value}</span>
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
    <div className="space-y-6">
      {/* Top ribbon / filters */}
      <div className="rounded-2xl border border-[rgba(16,185,129,0.15)] bg-[rgba(7,10,12,0.65)] backdrop-blur-xl p-4 md:p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent" />
        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-white">
              Performance commerciale
              <span className="text-emerald-400">.</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Vision unifiée de vos revenus — conçue pour l’action.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            <select
              value={stagedSelectedRep}
              onChange={(e) => setStagedSelectedRep(e.target.value)}
              className="appearance-none bg-zinc-950/60 border border-zinc-800 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 text-white/90"
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
                onChange={(e) => setStagedDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 text-white/90"
              />
              <span className="text-zinc-500 text-sm">à</span>
              <input
                type="date"
                value={stagedDateRange.end}
                onChange={(e) => setStagedDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 text-white/90"
              />
            </div>

            <button
              onClick={applyFilters}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-lg text-sm font-semibold hover:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-all"
            >
              Appliquer
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-sm font-medium hover:bg-emerald-500/15 transition-all"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-12 gap-4">
        <KpiCard title="Chiffre d’affaires total" className="col-span-12 lg:col-span-4">
          <p className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            <AnimatedNumber value={totalSales} format={currency} />
          </p>
          <p className="text-sm text-zinc-400 mt-2">
            {transactionCount.toLocaleString("fr-CA")} transactions • moyenne{" "}
            <span className="text-white font-medium">{currency(averageTransactionValue)}</span>
          </p>
        </KpiCard>

        <KpiCard title="Tendance 12 mois" className="col-span-12 lg:col-span-8">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={salesByMonth}>
              <defs>
                <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={EMERALD} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} stroke={GRID} />
              <YAxis
                tickFormatter={compactCurrency}
                tick={{ fill: MUTED, fontSize: 11 }}
                stroke={GRID}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={MINT}
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
              <defs>
                {SEGMENT_GRADIENTS.map((g, i) => (
                  <linearGradient key={`seg-${i}`} id={`seg-${i}`}>
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
                        ? "#2a3340"
                        : `url(#seg-${index % SEGMENT_GRADIENTS.length})`
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
                          : 0.32,
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                content={
                  <CustomLegend onLegendClick={(v: string) => handleSelect("salesReps", v)} />
                }
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ paddingLeft: "18px" }}
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
                  <stop offset="0%" stopColor={TEAL} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} stroke={GRID} />
              <YAxis
                tickFormatter={compactCurrency}
                tick={{ fill: MUTED, fontSize: 11 }}
                stroke={GRID}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={EMERALD}
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
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fill: MUTED, fontSize: 11 }}
                stroke={GRID}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: LABEL, fontSize: 11 }}
                stroke="none"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill={MINT} radius={[0, 6, 6, 0]} animationDuration={900}>
                {salesByItem.map((entry, index) => (
                  <Cell
                    key={`cell-${index}-${animationKey}`}
                    onClick={(e) => handleSelect("itemCodes", entry.name, (e as any).shiftKey)}
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
                          : 0.32,
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
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fill: MUTED, fontSize: 11 }}
                stroke={GRID}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fill: LABEL, fontSize: 11 }}
                stroke="none"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill={TEAL} radius={[0, 6, 6, 0]} animationDuration={900}>
                {salesByCustomer.map((entry, index) => (
                  <Cell
                    key={`cell-${index}-${animationKey}`}
                    onClick={(e) => handleSelect("customers", entry.name, (e as any).shiftKey)}
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
                          : 0.32,
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
   Page wrapper (brand background + spacing)
============================================================================= */
export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <LoadingState />;
  if (status === "unauthenticated" || session?.user?.role !== "ventes-exec")
    return <AccessDenied />;

  return (
    <main className={`min-h-screen ${inter.className} bg-black text-white relative`}>
      {/* Background to match Signin/Signup */}
      <TwinkleField />
      <div className="pointer-events-none absolute -top-24 -left-24 w-[42rem] h-[42rem] rounded-full bg-emerald-600/15 blur-3xl -z-10" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 w-[46rem] h-[46rem] rounded-full bg-teal-500/10 blur-3xl -z-10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_10%_10%,rgba(16,185,129,0.06),transparent),radial-gradient(60%_50%_at_100%_100%,rgba(20,184,166,0.05),transparent)] -z-10" />

      <div className="px-5 md:px-8 py-6 md:py-8">
        <DashboardContent />
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
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-900/40 to-teal-900/40 rounded-2xl blur opacity-0 group-hover:opacity-40 transition duration-500" />
      <div className="relative rounded-2xl border border-[rgba(16,185,129,0.15)] bg-[rgba(6,9,11,0.65)] backdrop-blur-xl p-5 h-full">
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
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-900/40 to-teal-900/40 rounded-2xl blur opacity-0 group-hover:opacity-40 transition duration-500" />
      <div className="relative bg-[rgba(6,9,11,0.7)] backdrop-blur-xl rounded-2xl p-4 md:p-5 border border-[rgba(16,185,129,0.15)] h-full flex flex-col">
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
      <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
        className="mt-6 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
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
