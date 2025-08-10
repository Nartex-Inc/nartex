// src/app/dashboard/page.tsx
"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, UsersRound, PackageOpen, TrendingUp } from "lucide-react";

import { PipelineKanbanView, KanbanStage } from "@/components/dashboard/pipeline-kanban-view";
import { ProductLifecycleStage, Project } from "@/lib/types";
import { mockProjectsData } from "@/lib/data";

/* -------------------------------------------------------------------------- */
/*                               Visual Tokens                                */
/* -------------------------------------------------------------------------- */
const CHART_COLORS = {
  RGP2T: "#635BFF", // Stripe purple-ish
  RG2T:  "#00D4FF", // Cyan
  IP1:   "#66E3A4", // Mint
  IP20:  "#FFB672", // Peach
};

const SURFACE = "rounded-2xl border-none bg-[rgba(16,18,27,0.66)] shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_8px_30px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur";

/* -------------------------------------------------------------------------- */
/*                                   Data                                     */
/* -------------------------------------------------------------------------- */

type Subsidiary = "SINTO" | "PROLAB" | "Otoprotec" | "Lubrilab";
type SaleRecord = {
  id: string; date: string; subsidiary: Subsidiary; customer: string; salesRep: string;
  product: "RGP2T" | "RG2T" | "IP1" | "IP20" | "Autre"; units: number; revenue: number; dso?: number; pastDue?: number;
};

const DEMO_SALES: SaleRecord[] = [
  { id: "a1", date: "2025-07-03", subsidiary: "SINTO", customer: "Acier Nord", salesRep: "Julie Tremblay", product: "RGP2T", units: 120, revenue: 18500, dso: 38 },
  { id: "a2", date: "2025-07-05", subsidiary: "SINTO", customer: "MécanoPro", salesRep: "Marc Otis", product: "RG2T",  units: 80,  revenue: 12100, dso: 42 },
  { id: "a3", date: "2025-07-07", subsidiary: "SINTO", customer: "Transport Lavoie", salesRep: "Nadia Lefebvre", product: "IP1",   units: 210, revenue: 17300, dso: 36, pastDue: 11 },
  { id: "a4", date: "2025-07-12", subsidiary: "SINTO", customer: "Forestra", salesRep: "Patrick Roy", product: "IP20",  units: 60,  revenue: 13900, dso: 49 },
  { id: "a5", date: "2025-07-15", subsidiary: "SINTO", customer: "HydroEst", salesRep: "Julie Tremblay", product: "RGP2T", units: 140, revenue: 20400, dso: 41 },
  { id: "a6", date: "2025-07-20", subsidiary: "PROLAB", customer: "Acier Nord", salesRep: "Marc Otis", product: "RG2T",  units: 95,  revenue: 14400, dso: 39 },
  { id: "a7", date: "2025-07-21", subsidiary: "Otoprotec", customer: "Garage Raymond", salesRep: "Nadia Lefebvre", product: "IP1",   units: 130, revenue: 10800, dso: 52, pastDue: 6 },
  { id: "a8", date: "2025-07-25", subsidiary: "Lubrilab", customer: "HydroEst", salesRep: "Patrick Roy", product: "IP20",  units: 50,  revenue: 9900,  dso: 40 },
  { id: "b1", date: "2025-06-08", subsidiary: "SINTO", customer: "Acier Nord", salesRep: "Julie Tremblay", product: "RGP2T", units: 110, revenue: 17200, dso: 37 },
  { id: "b2", date: "2025-06-12", subsidiary: "SINTO", customer: "MécanoPro", salesRep: "Marc Otis", product: "RG2T",  units: 70,  revenue: 11250, dso: 45 },
  { id: "b3", date: "2025-06-18", subsidiary: "SINTO", customer: "Transport Lavoie", salesRep: "Nadia Lefebvre", product: "IP1",   units: 180, revenue: 14950, dso: 33 },
  { id: "b4", date: "2025-06-22", subsidiary: "SINTO", customer: "Forestra", salesRep: "Patrick Roy", product: "IP20",  units: 66,  revenue: 12700, dso: 47 },
  { id: "b5", date: "2025-06-30", subsidiary: "SINTO", customer: "HydroEst", salesRep: "Julie Tremblay", product: "RGP2T", units: 120, revenue: 18900, dso: 43 },
  { id: "c1", date: "2025-05-10", subsidiary: "SINTO", customer: "Acier Nord", salesRep: "Julie Tremblay", product: "RGP2T", units: 90,  revenue: 14500, dso: 35 },
  { id: "c2", date: "2025-05-12", subsidiary: "SINTO", customer: "MécanoPro", salesRep: "Marc Otis", product: "RG2T",  units: 60,  revenue: 9800,  dso: 41 },
  { id: "c3", date: "2025-05-19", subsidiary: "SINTO", customer: "Transport Lavoie", salesRep: "Nadia Lefebvre", product: "IP1",   units: 150, revenue: 12600, dso: 31 },
  { id: "c4", date: "2025-05-27", subsidiary: "SINTO", customer: "Forestra", salesRep: "Patrick Roy", product: "IP20",  units: 55,  revenue: 10100, dso: 46 },
];

/* -------------------------------------------------------------------------- */
/*                                  Utils                                     */
/* -------------------------------------------------------------------------- */
const currency = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

function aggregateBy<T extends keyof SaleRecord>(rows: SaleRecord[], key: T) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = String(r[key]);
    map.set(k, (map.get(k) ?? 0) + r.revenue);
  }
  return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue }));
}

function groupByMonthProduct(rows: SaleRecord[]) {
  const map: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const month = r.date.slice(0, 7);
    if (!map[month]) map[month] = {};
    map[month][r.product] = (map[month][r.product] ?? 0) + r.revenue;
  }
  return Object.keys(map).sort().map((m) => ({ month: m, ...map[m] }));
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */
export default function DashboardPage() {
  const { data: session } = useSession();

  // With filters removed, we simply use the full dataset
  const rows = DEMO_SALES;

  const projects: Project[] = mockProjectsData;
  const STAGES = [
    { id: ProductLifecycleStage.DEMANDE_IDEATION, name: "Demande / Idéation", color: "#3b82f6" },
    { id: ProductLifecycleStage.EVALUATION_COUT_POTENTIEL, name: "Évaluation Coût/Potentiel", color: "#8b5cf6" },
    { id: ProductLifecycleStage.PROTOTYPAGE, name: "Prototypage", color: "#ec4899" },
    { id: ProductLifecycleStage.MISE_EN_FONCTION_DEVELOPPEMENT, name: "Mise en Fonction / Développement", color: "#f97316" },
    { id: ProductLifecycleStage.PLANIFICATION_PRODUIT_FINI, name: "Planification Produit Fini", color: "#10b981" },
    { id: ProductLifecycleStage.MISE_EN_MARCHE, name: "Mise en Marché", color: "#6366f1" },
    { id: ProductLifecycleStage.VIE_DU_PRODUIT, name: "Vie du Produit", color: "#64748b" },
  ];
  const pipelineDataForKanban: KanbanStage[] = STAGES.map((cfg) => ({ ...cfg, projects: projects.filter(p => p.stage === cfg.id) }));

  // KPIs
  const totalRevenue  = useMemo(() => rows.reduce((a, b) => a + b.revenue, 0), [rows]);
  const customers     = useMemo(() => new Set(rows.map((r) => r.customer)).size, [rows]);
  const orders        = rows.length;
  const avgTicket     = orders ? totalRevenue / orders : 0;
  const avgDSO        = rows.length ? Math.round(rows.reduce((a, b) => a + (b.dso ?? 0), 0) / rows.length) : 0;

  // Aggregations
  const byCustomer    = useMemo(() => aggregateBy(rows, "customer").sort((a,b)=>b.revenue-a.revenue).slice(0,8), [rows]);
  const byRep         = useMemo(() => aggregateBy(rows, "salesRep").sort((a,b)=>b.revenue-a.revenue).slice(0,8), [rows]);
  const byProduct     = useMemo(() => aggregateBy(rows, "product").sort((a,b)=>b.revenue-a.revenue), [rows]);
  const monthProduct  = useMemo(() => groupByMonthProduct(rows), [rows]);

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "Utilisateur";

  return (
    <section className="relative">
      {/* Layered Stripe-like background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(99,91,255,0.18),transparent_60%)]"/>
        <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_0%,rgba(255,255,255,0.08)_0deg,transparent_60deg)]"/>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.25))]"/>
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-6 pb-16 pt-10 sm:px-10">
        {/* Top header (no filters) */}
        <header className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">Tableau de bord</span>
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight sm:text-3xl">
            Bonjour, {userName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Vue consolidée — ventes et pipeline produit
          </p>
        </header>

        {/* KPI Cards */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Revenu" value={currency(totalRevenue)} hint={`${orders} commandes`} icon={<TrendingUp className="h-4 w-4" />} />
          <MetricCard title="Clients actifs" value={String(customers)} hint="sur la période" icon={<UsersRound className="h-4 w-4" />} />
          <MetricCard title="Ticket moyen" value={currency(avgTicket)} hint="revenu / commande" icon={<ShoppingCart className="h-4 w-4" />} />
          <MetricCard title="DSO moyen" value={`${avgDSO} j`} hint="délai de paiement" icon={<PackageOpen className="h-4 w-4" />} />
        </div>

        {/* Charts Row */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <ChartCard title="Évolution des ventes par produit" className="lg:col-span-2" height={360}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthProduct} margin={{ left: 16, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="month" tick={{ fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => currency(v)} contentStyle={{ background: "rgba(16,18,27,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="RGP2T" stroke={CHART_COLORS.RGP2T} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="RG2T"  stroke={CHART_COLORS.RG2T}  strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="IP1"   stroke={CHART_COLORS.IP1}   strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="IP20"  stroke={CHART_COLORS.IP20}  strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Répartition par produit (période)" height={360}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byProduct} dataKey="revenue" nameKey="name" innerRadius={72} outerRadius={110} strokeWidth={1.5} fillOpacity={0.95}>
                  {byProduct.map((p) => (
                    <Cell key={p.name} fill={CHART_COLORS[p.name as keyof typeof CHART_COLORS] ?? "#9CA3AF"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => currency(v)} contentStyle={{ background: "rgba(16,18,27,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Rankings */}
        <Card className={`${SURFACE} mt-8`}>
          <CardHeader className="px-7 pb-2 pt-6">
            <CardTitle>Classements</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-6 pt-0 sm:px-4">
            <Tabs defaultValue="customers" className="w-full">
              <TabsList className="z-10 mb-4 rounded-full bg-white/5 p-1 ring-1 ring-white/10">
                <TabsTrigger className="rounded-full px-3 py-1.5 data-[state=active]:bg-white/10" value="customers">Top Clients</TabsTrigger>
                <TabsTrigger className="rounded-full px-3 py-1.5 data-[state=active]:bg-white/10" value="reps">Top Experts (Reps)</TabsTrigger>
                <TabsTrigger className="rounded-full px-3 py-1.5 data-[state=active]:bg-white/10" value="products">Top Produits</TabsTrigger>
              </TabsList>
              <TabsContent value="customers"><TopTable title="Principaux clients (revenu)" rows={byCustomer} currency /></TabsContent>
              <TabsContent value="reps"><TopTable title="Meilleurs experts (revenu)" rows={byRep} currency /></TabsContent>
              <TabsContent value="products"><TopTable title="Meilleurs produits (revenu)" rows={byProduct} currency /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Collections (at risk) */}
        <Card className={`${SURFACE} mt-8`}>
          <CardHeader className="px-7 pb-2 pt-6">
            <CardTitle>Recouvrement — clients à risque</CardTitle>
          </CardHeader>
          <CardContent className="px-7 pb-6 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Échéance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows
                  .filter((r) => (r.pastDue ?? 0) > 0)
                  .sort((a, b) => (b.pastDue ?? 0) - (a.pastDue ?? 0))
                  .slice(0, 6)
                  .map((r) => (
                    <TableRow key={r.id} className="hover:bg-white/5">
                      <TableCell className="font-medium">{r.customer}</TableCell>
                      <TableCell>{r.product}</TableCell>
                      <TableCell>{currency(r.revenue)}</TableCell>
                      <TableCell><Badge variant="destructive">{r.pastDue} j retard</Badge></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Daily revenue spark area */}
        <ChartCard title="Ventes quotidiennes (période)" height={260} className="mt-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows.map((r) => ({ date: r.date, revenue: r.revenue }))}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.RGP2T} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={CHART_COLORS.RGP2T} stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" tick={{ fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => currency(v)} contentStyle={{ background: "rgba(16,18,27,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.RGP2T} strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Product Pipeline */}
        <Card className={`${SURFACE} mt-10`}>
          <CardHeader className="px-7 pb-2 pt-6">
            <CardTitle>Pipeline Lancement de Produit</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PipelineKanbanView stages={pipelineDataForKanban} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/* --------------------------- Polished UI blocks -------------------------- */
function MetricCard({ title, value, hint, icon }: { title: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card className={`${SURFACE} relative overflow-hidden`}>      
      {/* subtle glow */}
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(99,91,255,0.25),transparent_60%)]" />
      <CardHeader className="px-7 pb-2 pt-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-muted-foreground ring-1 ring-white/10">
            {icon}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-7 pb-6 pt-0">
        <div className="text-[26px] font-semibold tracking-tight sm:text-2xl">{value}</div>
        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children, height = 340, className = "" }: { title: string; children: React.ReactNode; height?: number; className?: string }) {
  return (
    <Card className={`${SURFACE} ${className}`}>
      <CardHeader className="px-7 pb-2 pt-6">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[--h] overflow-visible px-1 pb-6 pt-0 sm:px-3" style={{ ["--h" as any]: `${height}px` }}>
        {children}
      </CardContent>
    </Card>
  );
}

function TopTable({ title, rows, currency: asCurrency = false }: { title: string; rows: { name: string; revenue: number }[]; currency?: boolean }) {
  return (
    <Card className={`${SURFACE}`}>
      <CardHeader className="px-7 pb-2 pt-6">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-8 px-7 pb-6 pt-0 lg:grid-cols-2">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" hide />
              <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => (asCurrency ? currency(v) : v)} contentStyle={{ background: "rgba(16,18,27,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} />
              <Bar dataKey="revenue" radius={[10, 10, 0, 0]} fill={CHART_COLORS.RG2T} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="-mx-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rang</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="text-right">Revenu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.name} className="hover:bg-white/5">
                  <TableCell className="w-12">#{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right">{asCurrency ? currency(r.revenue) : r.revenue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
