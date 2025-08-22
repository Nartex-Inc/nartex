"use client";

import { useMemo, useState, useEffect } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";

// ===================================================================================
// Types de données
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
// Palette de couleurs moderne monochromatique
// ===================================================================================
const GRADIENT_COLORS = [
  { start: "#3b82f6", end: "#1e40af" },
  { start: "#8b5cf6", end: "#5b21b6" },
  { start: "#06b6d4", end: "#0e7490" },
  { start: "#10b981", end: "#047857" },
  { start: "#f59e0b", end: "#d97706" },
  { start: "#ef4444", end: "#b91c1c" },
  { start: "#ec4899", end: "#be185d" },
  { start: "#6b7280", end: "#374151" }
];

const currency = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
const compactCurrency = (n: number) => new Intl.NumberFormat("fr-CA", { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1, style: "currency", currency: "CAD" }).format(n);

// ===================================================================================
// Composant Tooltip personnalisé
// ===================================================================================
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-2xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-white font-bold text-sm">{currency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

// ===================================================================================
// Composant nombre animé
// ===================================================================================
const AnimatedNumber = ({ value, format }: { value: number; format: (n: number) => string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <>{format(displayValue)}</>;
};

// ===================================================================================
// Légende personnalisée cliquable
// ===================================================================================
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
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-400">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
};

// ===================================================================================
// Composant Dashboard principal
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

  // Récupération des données depuis l'API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/dashboard-data?startDate=${dateRange.start}&endDate=${dateRange.end}`);
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        setMasterData(data);
      } catch (err) {
        setError(err as Error);
        console.error('Erreur lors de la récupération des données:', err);
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
    setAnimationKey(prev => prev + 1);
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
      
      // Synchroniser le dropdown si on sélectionne un commercial
      if (category === 'salesReps' && !isShiftClick) {
        setSelectedRep(newValues.length === 1 ? newValues[0] : "");
      }
      
      return { ...prev, [category]: newValues };
    });
  };
  
  const handleDropdownSelect = (value: string) => {
    if (value) {
      setFilters(prev => ({ ...prev, salesReps: [value] }));
      setSelectedRep(value);
    } else {
      setFilters(prev => ({ ...prev, salesReps: [] }));
      setSelectedRep("");
    }
  };

  const resetFilters = () => {
    setFilters({ salesReps: [], itemCodes: [], customers: [] });
    setSelectedRep("");
  };
  
  const hasActiveFilters = filters.salesReps.length > 0 || filters.itemCodes.length > 0 || filters.customers.length > 0;

  const totalSales = useMemo(() => filteredData.reduce((sum, d) => sum + d.salesValue, 0), [filteredData]);
  
  const allSalesReps = useMemo(() => {
    if (!masterData) return [];
    const reps = new Set(masterData.map(d => d.salesRepName));
    return Array.from(reps).sort();
  }, [masterData]);
  
  const salesByRep = useMemo(() => {
    const allReps = aggregateData(filteredData, 'salesRepName');
    if (allReps.length <= 7) return allReps;
    const top7 = allReps.slice(0, 7);
    const others = allReps.slice(7);
    const othersValue = others.reduce((sum, rep) => sum + rep.value, 0);
    return [...top7, { name: 'Autres', value: othersValue }];
  }, [filteredData]);
  
  const salesByItem = useMemo(() => aggregateData(filteredData, 'itemCode', 10), [filteredData]);
  const salesByCustomer = useMemo(() => aggregateData(filteredData, 'customerName', 10), [filteredData]);
  
  const salesByMonth = useMemo(() => {
    const monthly = filteredData.reduce((acc, d) => {
      const date = new Date(d.invoiceDate);
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { label: monthLabel, value: 0 };
      }
      acc[monthKey].value += d.salesValue;
      return acc;
    }, {} as Record<string, { label: string; value: number }>);
    
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data]) => ({ name: data.label, value: data.value }));
  }, [filteredData]);

  // États de chargement et d'erreur
  if (error) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-red-500 bg-gray-900 rounded-xl p-8 border border-gray-800 max-w-md">
        <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
        <p className="text-sm text-gray-400">{error.message}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
        >
          Recharger la page
        </button>
      </div>
    </div>
  );
  
  if (isLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-light tracking-wide">Chargement du tableau de bord...</p>
        </div>
      </div>
    </div>
  );

  // Affichage principal
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Éléments de fond animés subtils */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      {/* Contenu principal */}
      <main className="p-8 space-y-8 relative z-10 max-w-[1800px] mx-auto">
        {/* En-tête */}
        <div className="border-b border-gray-900 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-gray-500 text-sm uppercase tracking-widest mb-2">NARTEX ANALYTICS</p>
              <h1 className="text-6xl font-thin tracking-tight">
                Tableau de Bord
                <span className="text-blue-500">.</span>
              </h1>
              <p className="text-gray-600 mt-2 text-sm">Analyse des performances commerciales en temps réel</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Sélecteur de commercial */}
              <div className="relative">
                <select 
                  value={selectedRep}
                  onChange={(e) => handleDropdownSelect(e.target.value)}
                  className="appearance-none bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:border-blue-500 transition-colors min-w-[200px]"
                >
                  <option value="">Tous les Experts</option>
                  {allSalesReps.map(rep => (
                    <option key={rep} value={rep}>{rep}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {/* Sélecteurs de dates */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="text-gray-500">à</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              
              {hasActiveFilters && (
                <button 
                  onClick={resetFilters} 
                  className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg font-medium hover:bg-red-500/20 transition-all duration-300"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Carte KPI principale */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl blur-xl"></div>
          <div className="relative bg-gray-950/50 backdrop-blur-sm rounded-2xl p-10 border border-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Chiffre d'affaires total</h3>
                <p className="text-7xl font-thin tracking-tight">
                  <AnimatedNumber value={totalSales} format={currency} />
                </p>
                <div className="flex items-center gap-6 mt-4">
                  <p className="text-gray-500 text-sm">
                    <span className="text-white font-medium">{filteredData.length.toLocaleString('fr-CA')}</span> transactions
                  </p>
                  <p className="text-gray-500 text-sm">
                    <span className="text-white font-medium">{salesByRep.filter(r => r.name !== 'Autres').length}</span> commerciaux
                  </p>
                  <p className="text-gray-500 text-sm">
                    <span className="text-white font-medium">{new Set(filteredData.map(d => d.customerName)).size}</span> clients uniques
                  </p>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-32 h-32 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full opacity-20 blur-2xl"></div>
                  <div className="relative w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grille de graphiques */}
        <div className="grid grid-cols-12 gap-6">
          {/* Ventes par commercial */}
          <ChartContainer title="Répartition par Commercial" subtitle="Performance individuelle" className="col-span-12 md:col-span-6 xl:col-span-4">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <defs>
                  {GRADIENT_COLORS.map((gradient, index) => (
                    <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={gradient.start} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={gradient.end} stopOpacity={0.8} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie 
                  data={salesByRep} 
                  dataKey="value" 
                  nameKey="name" 
                  innerRadius={80} 
                  outerRadius={120} 
                  paddingAngle={2}
                  animationBegin={0}
                  animationDuration={1500}
                  animationEasing="ease-out"
                >
                  {salesByRep.map((entry, index) => (
                    <Cell
                      key={`cell-${index}-${animationKey}`}
                      fill={entry.name === 'Autres' ? '#374151' : `url(#gradient-${index % GRADIENT_COLORS.length})`}
                      onClick={(e) => {
                        if (entry.name !== 'Autres') {
                          handleSelect('salesReps', entry.name, e.shiftKey);
                        }
                      }}
                      className={entry.name === 'Autres' ? '' : 'cursor-pointer hover:opacity-80 transition-opacity'}
                      style={{
                        filter: filters.salesReps.length === 0 || filters.salesReps.includes(entry.name) ? 'none' : 'grayscale(100%)',
                        opacity: filters.salesReps.length === 0 || filters.salesReps.includes(entry.name) ? 1 : 0.3,
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  content={<CustomLegend onLegendClick={(value: string) => handleSelect('salesReps', value)} />}
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  wrapperStyle={{ paddingLeft: "20px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Tendance des ventes */}
          <ChartContainer title="Évolution du Chiffre d'Affaires" subtitle="Tendance mensuelle" className="col-span-12 md:col-span-6 xl:col-span-8">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={salesByMonth}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} stroke="#1f2937" />
                <YAxis tickFormatter={compactCurrency} tick={{ fill: '#6b7280', fontSize: 11 }} stroke="#1f2937" />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#salesGradient)"
                  animationBegin={0}
                  animationDuration={2000}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Top Produits */}
          <ChartContainer title="Top 10 Produits" subtitle="Articles les plus vendus" className="col-span-12 xl:col-span-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={salesByItem} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGradient1" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#5b21b6" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
                <XAxis type="number" tickFormatter={compactCurrency} tick={{ fill: '#6b7280', fontSize: 11 }} stroke="#1f2937"/>
                <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#6b7280', fontSize: 11 }} stroke="#1f2937"/>
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="url(#barGradient1)" radius={[0, 6, 6, 0]} animationBegin={0} animationDuration={1500} animationEasing="ease-out">
                  {salesByItem.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}-${animationKey}`}
                      onClick={(e) => handleSelect('itemCodes', entry.name, e.shiftKey)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        filter: filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name) ? 'none' : 'grayscale(100%)',
                        opacity: filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name) ? 1 : 0.3,
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Top Clients */}
          <ChartContainer title="Top 10 Clients" subtitle="Comptes stratégiques" className="col-span-12 xl:col-span-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={salesByCustomer} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGradient2" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#0e7490" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
                <XAxis type="number" tickFormatter={compactCurrency} tick={{ fill: '#6b7280', fontSize: 11 }} stroke="#1f2937"/>
                <YAxis type="category" dataKey="name" width={150} tick={{ fill: '#6b7280', fontSize: 11 }} stroke="#1f2937"/>
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="url(#barGradient2)" radius={[0, 6, 6, 0]} animationBegin={0} animationDuration={1500} animationEasing="ease-out">
                  {salesByCustomer.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}-${animationKey}`}
                      onClick={(e) => handleSelect('customers', entry.name, e.shiftKey)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        filter: filters.customers.length === 0 || filters.customers.includes(entry.name) ? 'none' : 'grayscale(100%)',
                        opacity: filters.customers.length === 0 || filters.customers.includes(entry.name) ? 1 : 0.3,
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-900 pt-8 mt-12">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-xs">© 2024 Nartex Analytics. Tous droits réservés.</p>
            <p className="text-gray-600 text-xs">Dernière mise à jour: {new Date().toLocaleString('fr-CA')}</p>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.2; }
        }
        .animate-pulse {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}

// ===================================================================================
// Composants et fonctions utilitaires
// ===================================================================================
function ChartContainer({ title, subtitle, children, className }: { title: string, subtitle?: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={`group relative ${className}`}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl blur opacity-0 group-hover:opacity-50 transition duration-500"></div>
      <div className="relative bg-gray-950/80 backdrop-blur-sm rounded-xl p-6 border border-gray-900 hover:border-gray-800 transition-all duration-300">
        <div className="mb-6">
          <h3 className="text-sm font-medium text-white tracking-wide">
            {title}
          </h3>
          {subtitle && <p className="text-gray-600 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="flex-grow">
          {children}
        </div>
      </div>
    </div>
  );
}

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
