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
const COLORS = ["#635BFF", "#00D4FF", "#66E3A4", "#FFB672", "#F59E0B", "#10B981", "#8B5CF6", "#E11D48"];
const currency = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const compactCurrency = (n: number) => new Intl.NumberFormat("en-US", { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 2 }).format(n);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ===================================================================================
// Main Dashboard Component
// ===================================================================================
export default function DashboardPage() {
  // State for the primary date range of the entire dashboard
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });

  // State for our interactive cross-filters
  const [filters, setFilters] = useState<FilterState>({ salesReps: [], itemCodes: [], customers: [] });

  // Fetch the master dataset from the CORRECT endpoint
  const url = `/api/dashboard-data?startDate=${dateRange.start}&endDate=${dateRange.end}`;
  const { data: masterData, error, isLoading } = useSWR<SalesRecord[]>(url, fetcher);

  // THE CORE LOGIC: Memoized filtering
  const filteredData = useMemo(() => {
    if (!masterData) return [];
    return masterData.filter(d =>
      (filters.salesReps.length === 0 || filters.salesReps.includes(d.salesRepName)) &&
      (filters.itemCodes.length === 0 || filters.itemCodes.includes(d.itemCode)) &&
      (filters.customers.length === 0 || filters.customers.includes(d.customerName))
    );
  }, [masterData, filters]);

  // Handle filter selections from any chart
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

  // Memoized data aggregations for each chart
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
  if (isLoading) return <div className="p-6">Loading Dashboard...</div>;

  return (
    <main className="p-6 space-y-6 bg-[#1e2129]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Sales Dashboard</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-4 p-4 bg-[#2a2d35] rounded-lg">
          <h3 className="text-gray-400">Total Sales (Filtered)</h3>
          <p className="text-4xl font-bold text-white">{currency(totalSales)}</p>
        </div>
        <ChartContainer title="Sales by Rep">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={salesByRep} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={2}>
                {salesByRep.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    onClick={(e) => handleSelect('salesReps', entry.name, e.shiftKey)}
                    style={{ cursor: 'pointer', opacity: filters.salesReps.length === 0 || filters.salesReps.includes(entry.name) ? 1 : 0.3 }}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => currency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <ChartContainer title="Sales by Month" className="lg:col-span-2 xl:col-span-3">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesByMonth}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
              <XAxis dataKey="name" />
              <YAxis tickFormatter={compactCurrency} />
              <Tooltip formatter={(value: number) => currency(value)} />
              <Area type="monotone" dataKey="value" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
        <ChartContainer title="Top 10 Products">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesByItem} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
              <XAxis type="number" tickFormatter={compactCurrency}/>
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }}/>
              <Tooltip formatter={(value: number) => currency(value)} />
              <Bar dataKey="value" fill={COLORS[2]}>
                  {salesByItem.map((entry, index) => (
                      <Cell key={`cell-${index}`}
                            onClick={(e) => handleSelect('itemCodes', entry.name, e.shiftKey)}
                            style={{ cursor: 'pointer', opacity: filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name) ? 1 : 0.3 }}
                      />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        <ChartContainer title="Top 10 Customers" className="lg:col-span-2 xl:col-span-3">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesByCustomer} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
              <XAxis type="number" tickFormatter={compactCurrency}/>
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }}/>
              <Tooltip formatter={(value: number) => currency(value)} />
              <Bar dataKey="value" fill={COLORS[3]}>
                  {salesByCustomer.map((entry, index) => (
                      <Cell key={`cell-${index}`}
                            onClick={(e) => handleSelect('customers', entry.name, e.shiftKey)}
                            style={{ cursor: 'pointer', opacity: filters.customers.length === 0 || filters.customers.includes(entry.name) ? 1 : 0.3 }}
                      />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </main>
  );
}

function ChartContainer({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={`p-4 bg-[#2a2d35] rounded-lg text-white ${className}`}>
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
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
