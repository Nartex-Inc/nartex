"use client";

import { useMemo, useState, useEffect } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";

// ===================================================================================
// Data Types
// ===================================================================================
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

// ===================================================================================
// Design System & Formatters
// ===================================================================================
const GRADIENT_COLORS = [
  { start: "#3b82f6", end: "#1e40af" }, // Blue
  { start: "#8b5cf6", end: "#5b21b6" }, // Purple
  { start: "#06b6d4", end: "#0e7490" }, // Cyan
  { start: "#10b981", end: "#047857" }, // Green
  { start: "#f59e0b", end: "#d97706" }, // Amber
  { start: "#ef4444", end: "#b91c1c" }, // Red
  { start: "#ec4899", end: "#be185d" }, // Pink
];

const currency = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
const compactCurrency = (n: number) => new Intl.NumberFormat("fr-CA", { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1, style: "currency", currency: "CAD" }).format(n);

// ===================================================================================
// Custom Recharts Components for a Premium Look
// ===================================================================================
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
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
      {payload.map((entry: any, index: number) => (
        <li 
          key={`item-${index}`}
          className={entry.value !== 'Autres' ? "flex items-center space-x-2 cursor-pointer hover:opacity-70 transition-opacity" : "flex items-center space-x-2 opacity-50"}
          onClick={() => entry.value !== 'Autres' && onLegendClick(entry.value)}
        >
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-400">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
};

// ===================================================================================
// Main Dashboard Component
// ===================================================================================
export default function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });

  const [filters, setFilters] = useState<FilterState>({ salesReps: [], itemCodes: [], customers: [] });
  const [animationKey, setAnimationKey] = useState(0);
  const [masterData, setMasterData] = useState<SalesRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedRep, setSelectedRep] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/dashboard-data?startDate=${dateRange.start}&endDate=${dateRange.end}`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();
        setMasterData(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  const filteredData = useMemo(() => {
    if (!masterData) return [];
    return masterData.filter(d =>
      (filters.salesReps.length === 0 || filters.salesReps.includes(d.salesRepName)) &&
      (filters.itemCodes.length === 0 || filters.itemCodes.includes(d.itemCode)) &&
      (filters.customers.length === 0 || filters.customers.includes(d.customerName))
    );
  }, [masterData, filters]);

  useEffect(() => {
    setAnimationKey(prev => prev + 1); // Trigger re-animation on data change
  }, [filteredData]);

  const handleSelect = (category: keyof FilterState, value: string, isShiftClick: boolean = false) => {
    setFilters(prev => {
      const existing = prev[category];
      const isSelected = existing.includes(value);
      let newValues;
      if (isShiftClick) {
        newValues = isSelected ? existing.filter(v => v !== value) : [...existing, value];
      } else {
        newValues = isSelected && existing.length === 1 ? [] : [value];
      }
      if (category === 'salesReps' && !isShiftClick) {
        setSelectedRep(newValues.length === 1 ? newValues[0] : "");
      }
      return { ...prev, [category]: newValues };
    });
  };
  
  const handleDropdownSelect = (value: string) => {
    setFilters(prev => ({ ...prev, itemCodes: [], customers: [], salesReps: value ? [value] : [] }));
    setSelectedRep(value);
  };

  const resetFilters = () => {
    setFilters({ salesReps: [], itemCodes: [], customers: [] });
    setSelectedRep("");
  };
  
  const hasActiveFilters = filters.salesReps.length > 0 || filters.itemCodes.length > 0 || filters.customers.length > 0;
  
  const allSalesReps = useMemo(() => {
    if (!masterData) return [];
    return Array.from(new Set(masterData.map(d => d.salesRepName))).sort();
  }, [masterData]);

  const totalSales = useMemo(() => filteredData.reduce((sum, d) => sum + d.salesValue, 0), [filteredData]);
  
  const salesByRep = useMemo(() => {
    const allReps = aggregateData(filteredData, 'salesRepName');
    if (allReps.length <= 7) return allReps;
    const top7 = allReps.slice(0, 7);
    const othersValue = allReps.slice(7).reduce((sum, rep) => sum + rep.value, 0);
    return [...top7, { name: 'Autres', value: othersValue }];
  }, [filteredData]);
  
  const salesByItem = useMemo(() => aggregateData(filteredData, 'itemCode', 10), [filteredData]);
  const salesByCustomer = useMemo(() => aggregateData(filteredData, 'customerName', 10), [filteredData]);
  
  const salesByMonth = useMemo(() => {
    const monthly = filteredData.reduce((acc, d) => {
      const monthKey = d.invoiceDate.slice(0, 7); // YYYY-MM
      acc[monthKey] = (acc[monthKey] || 0) + d.salesValue;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  if (error) return <ErrorState message={error.message} />;
  if (isLoading) return <LoadingState />;

  return (
    // This main container assumes it is placed inside a layout with your sidebar
    <main className="bg-black text-white p-4 sm:p-6 md:p-8 space-y-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-900/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-purple-900/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      {/* Header */}
      <div className="border-b border-gray-900 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-gray-500 text-sm uppercase tracking-widest mb-2">Nartex Analytics</p>
            <h1 className="text-4xl md:text-5xl font-thin tracking-tight">Tableau de Bord<span className="text-blue-500">.</span></h1>
          </div>
          <div className="flex items-center flex-wrap gap-4">
            <select value={selectedRep} onChange={(e) => handleDropdownSelect(e.target.value)}
              className="appearance-none bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:border-blue-500 transition-colors min-w-[200px]">
              <option value="">Tous les Experts</option>
              {allSalesReps.map(rep => <option key={rep} value={rep}>{rep}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"/>
              <span className="text-gray-500">à</span>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"/>
            </div>
            {hasActiveFilters && <button onClick={resetFilters} className="px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-all">Réinitialiser</button>}
          </div>
        </div>
      </div>

      {/* KPI Card */}
      <div className="relative bg-gray-950/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-900">
        <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Chiffre d'affaires total</h3>
        <p className="text-5xl md:text-7xl font-thin tracking-tight">{currency(totalSales)}</p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-12 gap-6">
        <ChartContainer title="Répartition par Commercial" className="col-span-12 lg:col-span-5 xl:col-span-4">
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <defs>{GRADIENT_COLORS.map((g, i) => <linearGradient key={`g-${i}`} id={`g-${i}`}><stop offset="0%" stopColor={g.start}/><stop offset="100%" stopColor={g.end}/></linearGradient>)}</defs>
              <Pie data={salesByRep} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="100%" paddingAngle={2}>
                {salesByRep.map((entry, index) => (
                  <Cell key={`cell-${index}-${animationKey}`} fill={entry.name === 'Autres' ? '#374151' : `url(#g-${index % GRADIENT_COLORS.length})`}
                    onClick={(e) => entry.name !== 'Autres' && handleSelect('salesReps', entry.name, e.shiftKey)}
                    className={entry.name === 'Autres' ? '' : 'cursor-pointer hover:opacity-80 transition-opacity'}
                    style={{ filter: filters.salesReps.length === 0 || filters.salesReps.includes(entry.name) ? 'none' : 'grayscale(80%)', opacity: filters.salesReps.length === 0 || filters.salesReps.includes(entry.name) ? 1 : 0.3 }}/>
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend onLegendClick={(v: string) => handleSelect('salesReps', v)}/>} layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: "20px" }}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Évolution du Chiffre d'Affaires" className="col-span-12 lg:col-span-7 xl:col-span-8">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={salesByMonth}>
              <defs><linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} stroke="#1f2937" />
              <YAxis tickFormatter={compactCurrency} tick={{ fill: '#6b7280', fontSize: 11 }} stroke="#1f2937" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#salesGradient)" animationDuration={1500}/>
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Top 10 Produits" className="col-span-12 xl:col-span-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={salesByItem} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
              <XAxis type="number" tickFormatter={compactCurrency} tick={{ fill: '#6b7280', fontSize: 11 }} stroke="#1f2937"/>
              <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#a0aec0', fontSize: 11 }} stroke="none"/>
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} animationDuration={1500}>
                {salesByItem.map((entry, index) => (
                  <Cell key={`cell-${index}-${animationKey}`} onClick={(e) => handleSelect('itemCodes', entry.name, e.shiftKey)} className="cursor-pointer"
                    style={{ filter: filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name) ? 'none' : 'grayscale(80%)', opacity: filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name) ? 1 : 0.3 }}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Top 10 Clients" className="col-span-12 xl:col-span-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={salesByCustomer} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
              <XAxis type="number" tickFormatter={compactCurrency} tick={{ fill: '#6b7280', fontSize: 11 }} stroke="#1f2937"/>
              <YAxis type="category" dataKey="name" width={150} tick={{ fill: '#a0aec0', fontSize: 11 }} stroke="none"/>
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} animationDuration={1500}>
                {salesByCustomer.map((entry, index) => (
                  <Cell key={`cell-${index}-${animationKey}`} onClick={(e) => handleSelect('customers', entry.name, e.shiftKey)} className="cursor-pointer"
                    style={{ filter: filters.customers.length === 0 || filters.customers.includes(entry.name) ? 'none' : 'grayscale(80%)', opacity: filters.customers.length === 0 || filters.customers.includes(entry.name) ? 1 : 0.3 }}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
      <style jsx>{`.animation-delay-2000 { animation-delay: 2s; }`}</style>
    </main>
  );
}

// ===================================================================================
// Reusable Helper Components
// ===================================================================================
function ChartContainer({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={`group relative ${className}`}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-900 to-purple-900 rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
      <div className="relative bg-gray-950/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-900 h-full flex flex-col">
        <h3 className="text-sm font-medium text-white tracking-wide mb-4">{title}</h3>
        <div className="flex-grow">{children}</div>
      </div>
    </div>
  );
}

const LoadingState = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-lg font-light tracking-wide text-white">Chargement du tableau de bord...</p>
    </div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
    <div className="text-red-500 bg-gray-900 rounded-xl p-8 border border-gray-800 max-w-md text-center">
      <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
      <p className="text-sm text-gray-400">{message}</p>
      <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors">Recharger la page</button>
    </div>
  </div>
);

function aggregateData(data: SalesRecord[], key: keyof SalesRecord, topN?: number) {
  const aggregated = data.reduce((acc, d) => {
    const groupKey = d[key] as string;
    acc[groupKey] = (acc[groupKey] || 0) + d.salesValue;
    return acc;
  }, {} as Record<string, number>);

  const sorted = Object.entries(aggregated).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  return topN ? sorted.slice(0, topN) : sorted;
}
