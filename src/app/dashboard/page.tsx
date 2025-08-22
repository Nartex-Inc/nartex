"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
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
// Chart Components & Helpers
// ===================================================================================
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#d0ed57"];
const currency = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const compactCurrency = (n: number) => new Intl.NumberFormat("en-US", { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 2 }).format(n);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ===================================================================================
// Main Dashboard Component
// ===================================================================================
export default function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });

  const [filters, setFilters] = useState<FilterState>({ salesReps: [], itemCodes: [], customers: [] });

  const url = `/api/dashboard-data?startDate=${dateRange.start}&endDate=${dateRange.end}`;
  const { data: masterData, error, isLoading } = useSWR<SalesRecord[]>(url, fetcher);

  const filteredData = useMemo(() => {
    if (!masterData) return [];
    return masterData.filter(d =>
      (filters.salesReps.length === 0 || filters.salesReps.includes(d.salesRepName)) &&
      (filters.itemCodes.length === 0 || filters.itemCodes.includes(d.itemCode)) &&
      (filters.customers.length === 0 || filters.customers.includes(d.customerName))
    );
  }, [masterData, filters]);

  const handleSelect = (category: keyof FilterState, value: string, isShiftClick: boolean) => {
    setFilters(prev => {
      const existing = prev[category];
      const isSelected = existing.includes(value);
      let newValues;

      if (isShiftClick) {
        newValues = isSelected ? existing.filter(v => v !== value) : [...existing, value];
      } else {
        newValues = isSelected && existing.length === 1 ? [] : [value];
      }
      return { ...prev, [category]: newValues };
    });
  };
  
  const resetFilters = () => setFilters({ salesReps: [], itemCodes: [], customers: [] });
  const hasActiveFilters = filters.salesReps.length > 0 || filters.itemCodes.length > 0 || filters.customers.length > 0;

  const totalSales = useMemo(() => filteredData.reduce((sum, d) => sum + d.salesValue, 0), [filteredData]);
  const salesByRep = useMemo(() => aggregateData(filteredData, 'salesRepName'), [filteredData]);
  const salesByItem = useMemo(() => aggregateData(filteredData, 'itemCode', 10), [filteredData]);
  const salesByCustomer = useMemo(() => aggregateData(filteredData, 'customerName', 10), [filteredData]);
  const salesByMonth = useMemo(() => {
    const monthly = filteredData.reduce((acc, d) => {
      const month = d.invoiceDate.slice(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + d.salesValue;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(monthly).map(([name, value]) => ({ name, value })).sort((a,b) => a.name.localeCompare(b.name));
  }, [filteredData]);

  if (error) return <div className="p-6 text-red-400">Failed to load data: {error.message}</div>;
  if (isLoading) return <div className="p-6 text-gray-400">Loading Dashboard...</div>;

  return (
    <div className="bg-[#1f2937] text-white min-h-screen">
      {/* Sidebar Placeholder */}
      <div className="fixed left-0 top-0 w-64 h-full bg-[#111827] p-6 hidden lg:block">
        <h2 className="text-xl font-bold">Nartex</h2>
        <nav className="mt-8 space-y-4">
          <a href="#" className="block p-2 bg-gray-700 rounded">Dashboard</a>
          {/* Other links */}
        </nav>
      </div>

      <main className="lg:ml-64 p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Sales Dashboard</h1>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="px-4 py-2 text-sm font-semibold bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
              Reset Filters
            </button>
          )}
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 p-6 bg-gray-800 rounded-xl">
            <h3 className="text-lg text-gray-400">Total Sales (Filtered)</h3>
            <p className="text-5xl font-extrabold text-white mt-2">{currency(totalSales)}</p>
          </div>

          <ChartContainer title="Sales by Rep" className="col-span-12 md:col-span-6 xl:col-span-4">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={salesByRep} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={3}>
                  {salesByRep.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      onClick={(e) => handleSelect('salesReps', entry.name, e.shiftKey)}
                      className="cursor-pointer transition-opacity"
                      style={{ opacity: filters.salesReps.length === 0 || filters.salesReps.includes(entry.name) ? 1 : 0.3 }}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => currency(value)} contentStyle={{ backgroundColor: '#2d3748', border: 'none' }} />
                <Legend iconSize={10} layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Sales by Month" className="col-span-12 md:col-span-6 xl:col-span-8">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={salesByMonth}>
                <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00C49F" stopOpacity={0.8}/><stop offset="95%" stopColor="#00C49F" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568"/>
                <XAxis dataKey="name" tick={{ fill: '#a0aec0' }} />
                <YAxis tickFormatter={compactCurrency} tick={{ fill: '#a0aec0' }} />
                <Tooltip formatter={(value: number) => currency(value)} contentStyle={{ backgroundColor: '#2d3748', border: 'none' }} />
                <Area type="monotone" dataKey="value" stroke="#00C49F" fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Top 10 Products" className="col-span-12 xl:col-span-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={salesByItem} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568"/>
                <XAxis type="number" tickFormatter={compactCurrency} tick={{ fill: '#a0aec0' }}/>
                <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#a0aec0', fontSize: 12 }}/>
                <Tooltip formatter={(value: number, name, props) => [currency(value), props.payload.name]} contentStyle={{ backgroundColor: '#2d3748', border: 'none' }} />
                <Bar dataKey="value" fill="#FFBB28">
                  {salesByItem.map((entry, index) => (
                    <Cell key={`cell-${index}`}
                      onClick={(e) => handleSelect('itemCodes', entry.name, e.shiftKey)}
                      className="cursor-pointer transition-opacity"
                      style={{ opacity: filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name) ? 1 : 0.3 }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Top 10 Customers" className="col-span-12 xl:col-span-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={salesByCustomer} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568"/>
                <XAxis type="number" tickFormatter={compactCurrency} tick={{ fill: '#a0aec0' }}/>
                <YAxis type="category" dataKey="name" width={150} tick={{ fill: '#a0aec0', fontSize: 12 }}/>
                <Tooltip formatter={(value: number, name, props) => [currency(value), props.payload.name]} contentStyle={{ backgroundColor: '#2d3748', border: 'none' }} />
                <Bar dataKey="value" fill="#FF8042">
                  {salesByCustomer.map((entry, index) => (
                    <Cell key={`cell-${index}`}
                      onClick={(e) => handleSelect('customers', entry.name, e.shiftKey)}
                      className="cursor-pointer transition-opacity"
                      style={{ opacity: filters.customers.length === 0 || filters.customers.includes(entry.name) ? 1 : 0.3 }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </main>
    </div>
  );
}

// ===================================================================================
// Helper Components & Functions
// ===================================================================================
// UPDATED ChartContainer: Uses flexbox to prevent content overlap
function ChartContainer({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-gray-800 rounded-xl p-4 flex flex-col ${className}`}>
      <h3 className="font-semibold mb-4 text-lg text-gray-200">{title}</h3>
      <div className="flex-grow">
        {children}
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
