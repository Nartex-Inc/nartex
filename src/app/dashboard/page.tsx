// src/app/dashboard/page.tsx
"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";

type Row = { salesRepName: string; value: number };
type Payload = {
  current: Row[];
  previous: Row[];
  meta: { asOf: string; range: "ytd" | "qtd" | "mtd"; labelNow: string; labelPrev: string };
};

// Robust fetcher: no JSON -> throw a clear error (prevents “Unexpected token <”)
const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${body ? ` – ${body.slice(0,150)}` : ""}`);
  }
  if (!ct.includes("application/json")) {
    const body = await res.text().catch(() => "");
    throw new Error(`Expected JSON, got ${ct || "none"}${body ? ` – ${body.slice(0,150)}` : ""}`);
  }
  return (await res.json()) as Payload;
};

// Dynamic, client-only pie to avoid SSR/hydration issues with Recharts
const PieBundle = dynamic(
  () =>
    import("recharts").then((m) => {
      const COLORS = [
        "#635BFF", "#00D4FF", "#66E3A4", "#FFB672", "#9CA3AF",
        "#F59E0B", "#10B981", "#8B5CF6", "#E11D48", "#22D3EE", "#84CC16",
      ];
      const currency = (n: number) =>
        new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

      // Return a component that renders the pie using the imported module
      return function PieBundle({ title, rows }: { title: string; rows: Row[] }) {
        const total = (rows ?? []).reduce((a, b) => a + (b?.value ?? 0), 0);
        return (
          <div className="rounded-2xl border bg-[rgba(16,18,27,0.66)] p-4 ring-1 ring-white/10 backdrop-blur">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-medium">{title}</h2>
              <span className="text-sm text-muted-foreground">
                Total: {currency(total)}
              </span>
            </div>
            <div className="h-[420px]">
              <m.ResponsiveContainer width="100%" height="100%">
                <m.PieChart>
                  <m.Pie
                    data={rows ?? []}
                    dataKey="value"
                    nameKey="salesRepName"
                    innerRadius={80}
                    outerRadius={120}
                    strokeWidth={1.5}
                  >
                    {(rows ?? []).map((_, i) => (
                      <m.Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </m.Pie>
                  <m.Tooltip formatter={(v: number) => currency(v)} />
                  <m.Legend />
                </m.PieChart>
              </m.ResponsiveContainer>
            </div>
          </div>
        );
      };
    }),
  { ssr: false }
);

export default function DashboardPage() {
  const [asOf, setAsOf] = useState<string>(new Date().toISOString().slice(0, 10));
  const [range, setRange] = useState<"ytd" | "qtd" | "mtd">("ytd");

  const url = useMemo(
    () => `/api/sales-distribution?range=${range}&asOfDate=${asOf}&mode=money&gcieid=2`,
    [range, asOf]
  );
  const { data, error, isLoading } = useSWR<Payload>(url, fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 1,
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Ventes – Répartition par représentant</h1>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as any)}
            className="rounded-md border bg-transparent px-2 py-1 text-sm"
            title="Fenêtre"
          >
            <option value="ytd">YTD</option>
            <option value="qtd">QTD</option>
            <option value="mtd">MTD</option>
          </select>
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="rounded-md border bg-transparent px-2 py-1 text-sm"
            title="Date de référence"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-300">
          Erreur : {String(error.message || error)}
        </p>
      )}
      {(isLoading || !data) && !error && (
        <p className="text-muted-foreground">Chargement…</p>
      )}

      {data && (
        <div className="grid gap-6 md:grid-cols-2">
          <PieBundle title={data.meta.labelNow} rows={data.current ?? []} />
          <PieBundle title={data.meta.labelPrev} rows={data.previous ?? []} />
        </div>
      )}
    </main>
  );
}
