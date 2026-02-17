"use client";

import { useState, useMemo } from "react";
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
import { ChevronRight, Sparkles, Calendar } from "lucide-react";
import type { ThemeTokens } from "@/lib/theme-tokens";
import type { FilterState } from "@/types/dashboard";
import { currency, compactCurrency, percentage } from "@/lib/dashboard-formatters";
import { aggregateData } from "@/lib/dashboard-aggregators";
import { ChartCard, CustomTooltip, CustomLegend } from "@/components/dashboard/sales-ui";

type ChartDataItem = { name: string; value: number };
type MonthlyTx = { name: string; current: number; previous: number };
type MonthlySales = { name: string; current: number; previous: number; growth: number };

type DashboardChartsProps = {
  t: ThemeTokens;
  chartColors: string[];
  filteredData: { salesRepName: string; customerName: string; itemCode: string; invoiceDate: string; salesValue: number; txCount: number }[];
  filteredPreviousData: { invoiceDate: string; salesValue: number; txCount: number }[];
  salesRepColorMap: Record<string, string>;
  filters: FilterState;
  totalSales: number;
  previousTotalSales: number;
  showYOYComparison: boolean;
  isLoading: boolean;
  onSelect: (category: keyof FilterState, value: string, isShiftClick?: boolean) => void;
};

export function DashboardCharts({
  t,
  chartColors,
  filteredData,
  filteredPreviousData,
  salesRepColorMap,
  filters,
  totalSales,
  previousTotalSales,
  showYOYComparison,
  isLoading,
  onSelect,
}: DashboardChartsProps) {
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showAllCustomers, setShowAllCustomers] = useState(false);

  const salesByRep = useMemo(() => {
    const allReps = aggregateData(filteredData as any, "salesRepName");
    if (allReps.length <= 8) return allReps;
    const top = allReps.slice(0, 8);
    const othersValue = allReps.slice(8).reduce((s, r) => s + r.value, 0);
    return [...top, { name: "Autres", value: othersValue }];
  }, [filteredData]);

  const salesByItem = useMemo(
    () => aggregateData(filteredData as any, "itemCode", showAllProducts ? undefined : 10),
    [filteredData, showAllProducts]
  );

  const salesByCustomer = useMemo(
    () => aggregateData(filteredData as any, "customerName", showAllCustomers ? undefined : 10),
    [filteredData, showAllCustomers]
  );

  const transactionsByMonth: MonthlyTx[] = useMemo(() => {
    const current = filteredData.reduce((acc, d) => {
      const m = d.invoiceDate.slice(0, 7);
      acc[m] = (acc[m] || 0) + d.txCount;
      return acc;
    }, {} as Record<string, number>);

    const previous = filteredPreviousData.reduce((acc, d) => {
      const m = d.invoiceDate.slice(0, 7);
      const adjusted = m.replace(/^(\d{4})/, (_, y: string) => String(parseInt(y) + 1));
      acc[adjusted] = (acc[adjusted] || 0) + d.txCount;
      return acc;
    }, {} as Record<string, number>);

    const allMonths = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)])).sort();
    return allMonths.map((m) => ({ name: m, current: current[m] || 0, previous: previous[m] || 0 }));
  }, [filteredData, filteredPreviousData]);

  const salesComparisonByMonth: MonthlySales[] = useMemo(() => {
    const current = filteredData.reduce((acc, d) => {
      const m = d.invoiceDate.slice(0, 7);
      acc[m] = (acc[m] || 0) + d.salesValue;
      return acc;
    }, {} as Record<string, number>);

    const previous = filteredPreviousData.reduce((acc, d) => {
      const m = d.invoiceDate.slice(0, 7);
      const adjusted = m.replace(/^(\d{4})/, (_, y: string) => String(parseInt(y) + 1));
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

  return (
    <>
      {/* YOY Comparison */}
      {showYOYComparison && (
        <div className="grid grid-cols-12 gap-5">
          <ChartCard title="Comparaison YOY — Chiffre d'affaires" className="col-span-12 lg:col-span-8" t={t} isLoading={isLoading} height={280}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={salesComparisonByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.borderSubtle} strokeOpacity={0.3} />
                <XAxis dataKey="name" tick={{ fill: t.textTertiary, fontSize: 12 }} stroke={t.borderSubtle} tickLine={false} />
                <YAxis yAxisId="left" tickFormatter={compactCurrency} tick={{ fill: t.textTertiary, fontSize: 12 }} stroke={t.borderSubtle} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={percentage} tick={{ fill: t.textTertiary, fontSize: 12 }} stroke={t.borderSubtle} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip t={t} />} />
                <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
                <Bar yAxisId="left" dataKey="previous" fill={t.textMuted} name="N-1" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="left" dataKey="current" fill={t.accent} name="Période actuelle" radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="growth" stroke={t.success} strokeWidth={2.5} dot={{ fill: t.success, r: 3 }} activeDot={{ r: 5 }} name="Croissance %" />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Performance comparative" className="col-span-12 lg:col-span-4" t={t} isLoading={isLoading}>
            <div className="space-y-4 h-full flex flex-col justify-between">
              <div className="p-4 rounded-lg" style={{ background: t.surface2 }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-label">Période actuelle</span>
                  <Sparkles className="w-4 h-4" style={{ color: t.accent }} />
                </div>
                <div className="text-[1.25rem] font-bold font-mono-data" style={{ color: t.textPrimary }}>{currency(totalSales)}</div>
              </div>
              <div className="p-4 rounded-lg" style={{ background: t.surface2 }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-label">Année précédente</span>
                  <Calendar className="w-4 h-4" style={{ color: t.textTertiary }} />
                </div>
                <div className="text-[1.25rem] font-bold font-mono-data" style={{ color: t.textSecondary }}>{currency(previousTotalSales)}</div>
              </div>
              <div className="p-4 rounded-lg" style={{ background: `${t.accent}08` }}>
                <span className="text-label">Variation YOY</span>
                <div className="text-[1.625rem] font-bold font-mono-data mt-1" style={{ color: t.textPrimary }}>
                  {previousTotalSales > 0 ? percentage((totalSales - previousTotalSales) / previousTotalSales) : "—"}
                </div>
                <div className="text-caption mt-1">Δ {currency(totalSales - previousTotalSales)}</div>
              </div>
            </div>
          </ChartCard>
        </div>
      )}

      {/* Main Charts */}
      <div className="grid grid-cols-12 gap-5">
        <ChartCard title="Répartition par expert" className="col-span-12 lg:col-span-5" t={t} isLoading={isLoading}>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={salesByRep} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="92%" paddingAngle={2} animationDuration={800}>
                {salesByRep.map((entry) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={salesRepColorMap[entry.name]}
                    onClick={(e) => entry.name !== "Autres" && onSelect("salesReps", entry.name, (e as any).shiftKey)}
                    className={entry.name === "Autres" ? "" : "cursor-pointer transition-opacity duration-200"}
                    style={{ opacity: filters.salesReps.length === 0 || filters.salesReps.includes(entry.name) ? 1 : 0.25 }}
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
                  const patchedPayload = props?.payload?.map((p: any) => ({ ...p, color: salesRepColorMap[p.value] || p.color })) ?? [];
                  return <CustomLegend payload={patchedPayload} selectedItems={filters.salesReps} onLegendClick={(v: string) => v !== "Autres" && onSelect("salesReps", v)} t={t} />;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Évolution des transactions" className="col-span-12 lg:col-span-7" t={t} isLoading={isLoading}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={transactionsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.borderSubtle} strokeOpacity={0.3} />
              <XAxis dataKey="name" tick={{ fill: t.textTertiary, fontSize: 12 }} stroke={t.borderSubtle} tickLine={false} />
              <YAxis tick={{ fill: t.textTertiary, fontSize: 12 }} stroke={t.borderSubtle} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip format="number" t={t} />} />
              <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
              {showYOYComparison && <Line type="monotone" dataKey="previous" stroke={t.textMuted} strokeWidth={2} strokeDasharray="5 5" name="N-1" dot={false} />}
              <Line type="monotone" dataKey="current" stroke={chartColors[1]} strokeWidth={2.5} name="Période actuelle" dot={{ fill: chartColors[1], r: 2.5 }} activeDot={{ r: 4, fill: chartColors[1] }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={`Top ${showAllProducts ? "" : "10 "}produits`}
          className="col-span-12 xl:col-span-6"
          t={t}
          isLoading={isLoading}
          height={360}
          action={
            <button onClick={() => setShowAllProducts(!showAllProducts)} className="text-[0.8125rem] flex items-center gap-1 transition-colors" style={{ color: t.accent }}>
              {showAllProducts ? "Moins" : "Tout voir"}
              <ChevronRight className={`w-3 h-3 transition-transform ${showAllProducts ? "rotate-90" : ""}`} />
            </button>
          }
        >
          <ResponsiveContainer width="100%" height={showAllProducts ? Math.max(360, salesByItem.length * 32) : 360}>
            <BarChart data={salesByItem} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.borderSubtle} strokeOpacity={0.3} />
              <XAxis type="number" tickFormatter={compactCurrency} tick={{ fill: t.textTertiary, fontSize: 12 }} stroke={t.borderSubtle} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fill: t.textSecondary, fontSize: 12 }} stroke="none" />
              <Tooltip content={<CustomTooltip t={t} />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={600}>
                {salesByItem.map((entry, i) => (
                  <Cell key={`item-${i}`} fill={t.accent} fillOpacity={1 - i * 0.07} onClick={(e) => onSelect("itemCodes", entry.name, (e as any).shiftKey)} className="cursor-pointer transition-opacity" style={{ opacity: filters.itemCodes.length === 0 || filters.itemCodes.includes(entry.name) ? 1 : 0.25 }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={`Top ${showAllCustomers ? "" : "10 "}clients`}
          className="col-span-12 xl:col-span-6"
          t={t}
          isLoading={isLoading}
          height={360}
          action={
            <button onClick={() => setShowAllCustomers(!showAllCustomers)} className="text-[0.8125rem] flex items-center gap-1 transition-colors" style={{ color: t.accent }}>
              {showAllCustomers ? "Moins" : "Tout voir"}
              <ChevronRight className={`w-3 h-3 transition-transform ${showAllCustomers ? "rotate-90" : ""}`} />
            </button>
          }
        >
          <ResponsiveContainer width="100%" height={showAllCustomers ? Math.max(360, salesByCustomer.length * 32) : 360}>
            <BarChart data={salesByCustomer} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.borderSubtle} strokeOpacity={0.3} />
              <XAxis type="number" tickFormatter={compactCurrency} tick={{ fill: t.textTertiary, fontSize: 12 }} stroke={t.borderSubtle} tickLine={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fill: t.textSecondary, fontSize: 12 }} stroke="none" />
              <Tooltip content={<CustomTooltip t={t} />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={600}>
                {salesByCustomer.map((entry, i) => (
                  <Cell key={`cust-${i}`} fill={chartColors[1]} fillOpacity={1 - i * 0.07} onClick={(e) => onSelect("customers", entry.name, (e as any).shiftKey)} className="cursor-pointer transition-opacity" style={{ opacity: filters.customers.length === 0 || filters.customers.includes(entry.name) ? 1 : 0.25 }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}
