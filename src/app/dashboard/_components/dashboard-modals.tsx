"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowUpDown } from "lucide-react";
import type { ThemeTokens } from "@/lib/theme-tokens";
import type { PerfRow } from "@/types/dashboard";
import { currency, percentage, formatNumber } from "@/lib/dashboard-formatters";
import { RETENTION_THRESHOLD, NEW_CUSTOMER_MIN_SPEND } from "@/lib/dashboard-constants";
import { Modal, SegmentedControl, CustomTooltip } from "@/components/dashboard/sales-ui";

type RetentionData = Record<string, { eligible: number; retained: number; rate: number | null }>;

type NewCustomerRow = {
  customer: string;
  rep: string;
  spend: number;
  orders: number;
  firstDate: string;
};

type PerfData = {
  growth: PerfRow[];
  loss: PerfRow[];
  eligible: number;
  pct: number | null;
};

type DashboardModalsProps = {
  t: ThemeTokens;
  // Retention modal
  showRetentionTable: boolean;
  onCloseRetention: () => void;
  retentionByRep: RetentionData;
  visibleRepsForRetention: Set<string>;
  retentionAverage: { avg: number | null; eligibleReps: number };
  // New customers modal
  showNewCustomersModal: boolean;
  onCloseNewCustomers: () => void;
  newCustomersList: NewCustomerRow[];
  newCustomersByRep: { rep: string; count: number }[];
  // Rep growth modal
  showRepGrowthModal: boolean;
  onCloseRepGrowth: () => void;
  repsPerf: PerfData;
  // Customer growth modal
  showCustomerGrowthModal: boolean;
  onCloseCustomerGrowth: () => void;
  customersPerf: PerfData;
  // Callbacks
  onSelectRep: (rep: string) => void;
  onSelectRepAndCustomer: (rep: string, customer: string) => void;
};

export function DashboardModals({
  t,
  showRetentionTable,
  onCloseRetention,
  retentionByRep,
  visibleRepsForRetention,
  retentionAverage,
  showNewCustomersModal,
  onCloseNewCustomers,
  newCustomersList,
  newCustomersByRep,
  showRepGrowthModal,
  onCloseRepGrowth,
  repsPerf,
  showCustomerGrowthModal,
  onCloseCustomerGrowth,
  customersPerf,
  onSelectRep,
  onSelectRepAndCustomer,
}: DashboardModalsProps) {
  // Retention modal state
  const [retentionSortAsc, setRetentionSortAsc] = useState(false);

  // New customers modal state
  const [newSortAsc, setNewSortAsc] = useState(false);
  const [newTab, setNewTab] = useState<"list" | "reps">("list");

  // Growth modal tabs
  const [repGrowthTab, setRepGrowthTab] = useState<"growth" | "loss">("growth");
  const [customerGrowthTab, setCustomerGrowthTab] = useState<"growth" | "loss">("growth");

  // Sort new customers list locally
  const sortedNewCustomers = [...newCustomersList].sort((a, b) =>
    newSortAsc ? a.spend - b.spend : b.spend - a.spend
  );

  return (
    <>
      {/* Retention Modal */}
      <Modal open={showRetentionTable} onClose={onCloseRetention} title="Taux de rétention par représentant" subtitle={`Seuil: ${currency(RETENTION_THRESHOLD)} les deux années`} t={t}>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-[0.875rem]">
            <thead className="sticky top-0 backdrop-blur-sm" style={{ background: `${t.surface1}ee` }}>
              <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                <th className="text-left px-6 py-3 text-label">Représentant</th>
                <th className="text-right px-6 py-3 text-label">Éligibles</th>
                <th className="text-right px-6 py-3 text-label">Retenus</th>
                <th className="text-right px-6 py-3">
                  <button onClick={() => setRetentionSortAsc((s) => !s)} className="inline-flex items-center gap-1 text-label hover:opacity-80">
                    Taux <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from(visibleRepsForRetention)
                .map((rep) => ({ rep, data: retentionByRep[rep] || { eligible: 0, retained: 0, rate: null } }))
                .sort((a, b) => {
                  const aRate = a.data.rate ?? -1;
                  const bRate = b.data.rate ?? -1;
                  return retentionSortAsc ? aRate - bRate : bRate - aRate;
                })
                .map(({ rep, data }, idx) => (
                  <tr
                    key={rep}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: `1px solid ${t.borderSubtle}`, background: idx % 2 === 1 ? t.surface2 : "transparent" }}
                    onClick={() => { onSelectRep(rep); onCloseRetention(); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = t.surface2)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 1 ? t.surface2 : "transparent")}
                  >
                    <td className="px-6 py-3" style={{ color: t.textPrimary }}>{rep}</td>
                    <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textSecondary }}>{formatNumber(data.eligible)}</td>
                    <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textSecondary }}>{formatNumber(data.retained)}</td>
                    <td className="px-6 py-3 text-right font-mono-data font-medium" style={{ color: t.textPrimary }}>{data.rate === null ? "—" : percentage(data.rate)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-4 text-[0.8125rem]" style={{ borderTop: `1px solid ${t.borderSubtle}`, color: t.textTertiary }}>
          <span>Moyenne: {retentionAverage.avg === null ? "—" : percentage(retentionAverage.avg)}</span>
          <button onClick={onCloseRetention} className="px-3 py-1.5 rounded-full transition-colors" style={{ background: t.surface2, color: t.textSecondary }}>Fermer</button>
        </div>
      </Modal>

      {/* New Customers Modal */}
      <Modal open={showNewCustomersModal} onClose={onCloseNewCustomers} title={`Nouveaux clients (≥ ${currency(NEW_CUSTOMER_MIN_SPEND)})`} subtitle="Aucun achat au cours des 3 dernières années" t={t} width="max-w-5xl">
        <div className="flex items-center gap-2 px-6 py-3" style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
          <SegmentedControl options={[{ key: "list", label: "Liste" }, { key: "reps", label: "Par représentant" }]} value={newTab} onChange={(k) => setNewTab(k as "list" | "reps")} t={t} />
        </div>
        {newTab === "list" ? (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-[0.875rem]">
              <thead className="sticky top-0 backdrop-blur-sm" style={{ background: `${t.surface1}ee` }}>
                <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                  <th className="text-left px-6 py-3 text-label">Client</th>
                  <th className="text-left px-6 py-3 text-label">Expert</th>
                  <th className="text-right px-6 py-3">
                    <button onClick={() => setNewSortAsc((s) => !s)} className="inline-flex items-center gap-1 text-label hover:opacity-80">Total <ArrowUpDown className="w-3 h-3" /></button>
                  </th>
                  <th className="text-right px-6 py-3 text-label"># cmd</th>
                  <th className="text-right px-6 py-3 text-label">1ère cmd</th>
                </tr>
              </thead>
              <tbody>
                {sortedNewCustomers.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center" style={{ color: t.textTertiary }}>Aucun nouveau client trouvé.</td></tr>
                ) : (
                  sortedNewCustomers.map((row, idx) => (
                    <tr
                      key={`${row.customer}-${row.firstDate}`}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: `1px solid ${t.borderSubtle}`, background: idx % 2 === 1 ? t.surface2 : "transparent" }}
                      onClick={() => { onSelectRepAndCustomer(row.rep, row.customer); onCloseNewCustomers(); }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.surface2)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 1 ? t.surface2 : "transparent")}
                    >
                      <td className="px-6 py-3" style={{ color: t.textPrimary }}>{row.customer}</td>
                      <td className="px-6 py-3" style={{ color: t.textSecondary }}>{row.rep}</td>
                      <td className="px-6 py-3 text-right font-mono-data font-medium" style={{ color: t.textPrimary }}>{currency(row.spend)}</td>
                      <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textSecondary }}>{row.orders}</td>
                      <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textTertiary }}>{row.firstDate}</td>
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
                  <CartesianGrid strokeDasharray="3 3" stroke={t.borderSubtle} strokeOpacity={0.3} />
                  <XAxis dataKey="rep" tick={{ fill: t.textTertiary, fontSize: 12 }} stroke={t.borderSubtle} />
                  <YAxis tick={{ fill: t.textTertiary, fontSize: 12 }} stroke={t.borderSubtle} />
                  <Tooltip content={<CustomTooltip format="number" t={t} />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill={t.accent} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <table className="w-full text-[0.875rem]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                    <th className="text-left px-4 py-2 text-label">Représentant</th>
                    <th className="text-right px-4 py-2 text-label">Nouveaux</th>
                  </tr>
                </thead>
                <tbody>
                  {newCustomersByRep.map((r) => (
                    <tr key={r.rep} className="cursor-pointer transition-colors" style={{ borderBottom: `1px solid ${t.borderSubtle}` }} onClick={() => { onSelectRep(r.rep); onCloseNewCustomers(); }} onMouseEnter={(e) => (e.currentTarget.style.background = t.surface2)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td className="px-4 py-2" style={{ color: t.textPrimary }}>{r.rep}</td>
                      <td className="px-4 py-2 text-right font-mono-data" style={{ color: t.textSecondary }}>{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="flex justify-end px-6 py-4" style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
          <button onClick={onCloseNewCustomers} className="px-3 py-1.5 rounded-full transition-colors" style={{ background: t.surface2, color: t.textSecondary }}>Fermer</button>
        </div>
      </Modal>

      {/* Rep Growth Modal */}
      <Modal open={showRepGrowthModal} onClose={onCloseRepGrowth} title="Performance YOY des représentants" t={t} width="max-w-5xl">
        <div className="flex items-center gap-2 px-6 py-3" style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
          <SegmentedControl options={[{ key: "growth", label: `Croissance (${repsPerf.growth.length})`, color: t.success }, { key: "loss", label: `Baisse (${repsPerf.loss.length})`, color: t.danger }]} value={repGrowthTab} onChange={(k) => setRepGrowthTab(k as "growth" | "loss")} t={t} />
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-[0.875rem]">
            <thead className="sticky top-0 backdrop-blur-sm" style={{ background: `${t.surface1}ee` }}>
              <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                <th className="text-left px-6 py-3 text-label">Représentant</th>
                <th className="text-right px-6 py-3 text-label">N-1</th>
                <th className="text-right px-6 py-3 text-label">N</th>
                <th className="text-right px-6 py-3 text-label">Δ $</th>
                <th className="text-right px-6 py-3 text-label">Δ %</th>
              </tr>
            </thead>
            <tbody>
              {(repGrowthTab === "growth" ? repsPerf.growth : repsPerf.loss).map((row, idx) => (
                <tr key={row.key} style={{ borderBottom: `1px solid ${t.borderSubtle}`, background: idx % 2 === 1 ? t.surface2 : "transparent" }}>
                  <td className="px-6 py-3" style={{ color: t.textPrimary }}>{row.key}</td>
                  <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textSecondary }}>{currency(row.prev)}</td>
                  <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textPrimary }}>{currency(row.curr)}</td>
                  <td className="px-6 py-3 text-right font-mono-data font-medium" style={{ color: row.delta > 0 ? t.success : t.danger }}>{currency(row.delta)}</td>
                  <td className="px-6 py-3 text-right font-mono-data font-medium" style={{ color: row.rate > 0 ? t.success : t.danger }}>{percentage(row.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end px-6 py-4" style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
          <button onClick={onCloseRepGrowth} className="px-3 py-1.5 rounded-full transition-colors" style={{ background: t.surface2, color: t.textSecondary }}>Fermer</button>
        </div>
      </Modal>

      {/* Customer Growth Modal */}
      <Modal open={showCustomerGrowthModal} onClose={onCloseCustomerGrowth} title="Performance YOY des clients" t={t} width="max-w-5xl">
        <div className="flex items-center gap-2 px-6 py-3" style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
          <SegmentedControl options={[{ key: "growth", label: `Croissance (${customersPerf.growth.length})`, color: t.success }, { key: "loss", label: `Baisse (${customersPerf.loss.length})`, color: t.danger }]} value={customerGrowthTab} onChange={(k) => setCustomerGrowthTab(k as "growth" | "loss")} t={t} />
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-[0.875rem]">
            <thead className="sticky top-0 backdrop-blur-sm" style={{ background: `${t.surface1}ee` }}>
              <tr style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                <th className="text-left px-6 py-3 text-label">Client</th>
                <th className="text-right px-6 py-3 text-label">N-1</th>
                <th className="text-right px-6 py-3 text-label">N</th>
                <th className="text-right px-6 py-3 text-label">Δ $</th>
                <th className="text-right px-6 py-3 text-label">Δ %</th>
              </tr>
            </thead>
            <tbody>
              {(customerGrowthTab === "growth" ? customersPerf.growth : customersPerf.loss).map((row, idx) => (
                <tr key={row.key} style={{ borderBottom: `1px solid ${t.borderSubtle}`, background: idx % 2 === 1 ? t.surface2 : "transparent" }}>
                  <td className="px-6 py-3" style={{ color: t.textPrimary }}>{row.key}</td>
                  <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textSecondary }}>{currency(row.prev)}</td>
                  <td className="px-6 py-3 text-right font-mono-data" style={{ color: t.textPrimary }}>{currency(row.curr)}</td>
                  <td className="px-6 py-3 text-right font-mono-data font-medium" style={{ color: row.delta > 0 ? t.success : t.danger }}>{currency(row.delta)}</td>
                  <td className="px-6 py-3 text-right font-mono-data font-medium" style={{ color: row.rate > 0 ? t.success : t.danger }}>{percentage(row.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end px-6 py-4" style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
          <button onClick={onCloseCustomerGrowth} className="px-3 py-1.5 rounded-full transition-colors" style={{ background: t.surface2, color: t.textSecondary }}>Fermer</button>
        </div>
      </Modal>
    </>
  );
}
