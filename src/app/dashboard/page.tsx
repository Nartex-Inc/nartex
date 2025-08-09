"use client";

import React, { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpRight, ShoppingCart, UsersRound, PackageOpen, TrendingUp } from "lucide-react";

import { PipelineKanbanView, KanbanStage } from "@/components/dashboard/pipeline-kanban-view";
import { ProductLifecycleStage, Project } from "@/lib/types";
import { mockProjectsData } from "@/lib/data";

/* ------------------------- Design Tokens (local) ------------------------- */
const CHART_COLORS = {
  RGP2T: "#60a5fa",
  RG2T:  "#34d399",
  IP1:   "#f59e0b",
  IP20:  "#a78bfa",
};

/* ------------------------------- Demo Data ------------------------------- */
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

/* --------------------------------- Utils -------------------------------- */
const currency = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const dateInRange = (d: string, days: number) => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - days);
  const x = new Date(d);
  return x >= start && x <= now;
};

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

/* ---------------------------------- Page --------------------------------- */
export default function DashboardPage() {
  const { data: session } = useSession();
  const [tenant, setTenant] = useState<Subsidiary>("SINTO");
  const [range, setRange] = useState<"30d" | "90d" | "ytd">("30d");
  const [search, setSearch] = useState("");

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

  // Filtered sales
  const base = useMemo(() => DEMO_SALES.filter((r) => r.subsidiary === tenant), [tenant]);
  const ranged = useMemo(() => {
    if (range === "30d") return base.filter((r) => dateInRange(r.date, 30));
    if (range === "90d") return base.filter((r) => dateInRange(r.date, 90));
    const now = new Date(); const start = new Date(now.getFullYear(), 0, 1);
    return base.filter((r) => new Date(r.date) >= start && new Date(r.date) <= now);
  }, [base, range]);
  const rows = useMemo(
    () => ranged.filter((r) =>
      !search ||
      r.customer.toLowerCase().includes(search.toLowerCase()) ||
      r.salesRep.toLowerCase().includes(search.toLowerCase()) ||
      r.product.toLowerCase().includes(search.toLowerCase())
    ),
    [ranged, search]
  );

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
  const monthProduct  = useMemo(() => groupByMonthProduct(base), [base]);

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "Utilisateur";

  return (
    <section className="relative">
      {/* background is now scoped to this section and sits *behind* content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0
                   [background:radial-gradient(1200px_600px_at_50%_-10%,hsl(var(--primary)/0.10),transparent_60%),
                               conic-gradient(from_180deg_at_50%_0%,hsl(var(--border))_0deg,transparent_40deg)]"
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-5 pb-10 pt-8 sm:px-8">
        {/* Header / Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Bonjour, {userName}</h1>
            <p className="text-sm text-muted-foreground">Vue consolidée — ventes et pipeline produit</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Select value={tenant} onValueChange={(v) => setTenant(v as Subsidiary)}>
              <SelectTrigger className="w-[180px] rounded-xl">
                <SelectValue placeholder="Filiale" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="SINTO">SINTO</SelectItem>
                <SelectItem value="PROLAB">PROLAB</SelectItem>
                <SelectItem value="Otoprotec">Otoprotec</SelectItem>
                <SelectItem value="Lubrilab">Lubrilab</SelectItem>
              </SelectContent>
            </Select>

            <Select value={range} onValueChange={(v) => setRange(v as any)}>
              <SelectTrigger className="w-[160px] rounded-xl">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="90d">90 jours</SelectItem>
                <SelectItem value="ytd">Année en cours</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Rechercher client / rep / produit"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[260px] rounded-xl"
              />
              <Button className="rounded-xl px-3">
                <ArrowUpRight className="mr-1 h-4 w-4" />
                Exporter
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Revenu" value={currency(totalRevenue)} hint={`${orders} commandes`} icon={<TrendingUp className="h-4 w-4" />} />
          <MetricCard title="Clients actifs" value={String(customers)} hint="sur la période" icon={<UsersRound className="h-4 w-4" />} />
          <MetricCard title="Ticket moyen" value={currency(avgTicket)} hint="revenu / commande" icon={<ShoppingCart className="h-4 w-4" />} />
          <MetricCard title="DSO moyen" value={`${avgDSO} j`} hint="délai de paiement" icon={<PackageOpen className="h-4 w-4" />} />
        </div>

        {/* Charts */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <ChartCard title="Évolution des ventes par produit" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthProduct} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip formatter={(v: number) => currency(v)} />
                <Legend />
                <Line type="monotone" dataKey="RGP2T" stroke={CHART_COLORS.RGP2T} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="RG2T"  stroke={CHART_COLORS.RG2T}  strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="IP1"   stroke={CHART_COLORS.IP1}   strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="IP20"  stroke={CHART_COLORS.IP20}  strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Répartition par produit (période)">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byProduct}
                  dataKey="revenue"
                  nameKey="name"
                  innerRadius={64}
                  outerRadius={96}
                  strokeWidth={1.5}
                  fillOpacity={0.95}
                />
                <Tooltip formatter={(v: number) => currency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Rankings */}
        <Card className="mt-6 rounded-2xl border-none bg-card/60 shadow-sm ring-1 ring-border/60 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle>Classements</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="customers" className="w-full">
              <TabsList className="z-10 mb-3 rounded-full bg-muted/60 p-1">
                <TabsTrigger className="rounded-full px-3 py-1.5" value="customers">Top Clients</TabsTrigger>
                <TabsTrigger className="rounded-full px-3 py-1.5" value="reps">Top Experts (Reps)</TabsTrigger>
                <TabsTrigger className="rounded-full px-3 py-1.5" value="products">Top Produits</TabsTrigger>
              </TabsList>
              <TabsContent value="customers"><TopTable title="Principaux clients (revenu)" rows={byCustomer} currency /></TabsContent>
              <TabsContent value="reps"><TopTable title="Meilleurs experts (revenu)" rows={byRep} currency /></TabsContent>
              <TabsContent value="products"><TopTable title="Meilleurs produits (revenu)" rows={byProduct} currency /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Collections (at risk) */}
        <Card className="mt-6 rounded-2xl border-none bg-card/60 shadow-sm ring-1 ring-border/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle>Recouvrement — clients à risque</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <TableRow key={r.id} className="hover:bg-muted/40">
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
        <ChartCard title="Ventes quotidiennes (période)" height={240} className="mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows.map((r) => ({ date: r.date, revenue: r.revenue }))}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.RGP2T} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={CHART_COLORS.RGP2T} stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <Tooltip formatter={(v: number) => currency(v)} />
              <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.RGP2T} strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Product Pipeline */}
        <Card className="mt-8 rounded-2xl border-none bg-card/60 shadow-sm ring-1 ring-border/60 backdrop-blur">
          <CardHeader className="pb-2">
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
function MetricCard({
  title, value, hint, icon,
}: { title: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card className="relative overflow-hidden rounded-2xl border-none bg-card/70 shadow-sm ring-1 ring-border/60 backdrop-blur">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
            {icon}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title, children, height = 320, className = "",
}: { title: string; children: React.ReactNode; height?: number; className?: string }) {
  return (
    <Card className={`rounded-2xl border-none bg-card/70 shadow-sm ring-1 ring-border/60 backdrop-blur ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[--h] p-0 pr-2" style={{ ["--h" as any]: `${height}px` }}>
        {children}
      </CardContent>
    </Card>
  );
}

function TopTable({
  title, rows, currency: asCurrency = false,
}: { title: string; rows: { name: string; revenue: number }[]; currency?: boolean }) {
  return (
    <Card className="rounded-2xl border-none bg-card/70 shadow-sm ring-1 ring-border/60 backdrop-blur">
      <CardHeader className="pb-2"><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <Tooltip formatter={(v: number) => (asCurrency ? currency(v) : v)} />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill={CHART_COLORS.RG2T} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
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
                <TableRow key={r.name} className="hover:bg-muted/40">
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
