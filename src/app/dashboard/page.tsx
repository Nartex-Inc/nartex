// app/dashboard/page.tsx
"use client";
import useSWR from "swr";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const fetcher = (u: string) => fetch(u).then(r => r.json());
const COLORS = ["#635BFF","#00D4FF","#66E3A4","#FFB672","#9CA3AF","#F59E0B","#10B981","#8B5CF6"];
const currency = (n: number) => new Intl.NumberFormat("fr-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n);

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR<{ salesRepName: string; value: number }[]>("/api/sales-per-rep", fetcher);

  if (error) return <p className="p-6 text-red-400">Erreur: {String(error)}</p>;
  if (isLoading || !data) return <p className="p-6 text-muted-foreground">Chargement…</p>;

  const total = data.reduce((a, b) => a + (b.value ?? 0), 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold">Ventes YTD par représentant</h1>
      <p className="mb-6 text-sm text-muted-foreground">Total: {currency(total)}</p>
      <div className="h-[420px] rounded-2xl border bg-[rgba(16,18,27,0.66)] p-4 ring-1 ring-white/10 backdrop-blur">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="salesRepName" innerRadius={80} outerRadius={120} strokeWidth={1.5}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => currency(v)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </main>
  );
}
