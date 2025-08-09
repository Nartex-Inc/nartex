// src/app/dashboard/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpRight, ShoppingCart, UsersRound, PackageOpen, TrendingUp } from "lucide-react";

// Existing pipeline imports (kept to preserve your R&D workflow)
import { PipelineKanbanView, KanbanStage } from "@/components/dashboard/pipeline-kanban-view";
import { ProductLifecycleStage, Project } from "@/lib/types";
import { mockProjectsData } from "@/lib/data";

/**
 * ---------------------------------------------
 * Nartex "Sales-first" Dashboard
 * ---------------------------------------------
 * Goals:
 *  - Minimal, Stripe-like visual language
 *  - First screen answers: how much, from whom, sold by who, and of what
 *  - Multi-tenant (subsidiary) switcher
 *  - Fast to wire to a SQL view / API later (typed, deterministic)
 */

type Subsidiary = "SINTO" | "PROLAB" | "Otoprotec" | "Lubrilab";

type SaleRecord = {
  id: string;
  date: string; // ISO
  subsidiary: Subsidiary;
  customer: string;
  salesRep: string; // Expert SINTO
  product: "RGP2T" | "RG2T" | "IP1" | "IP20" | "Autre";
  units: number;
  revenue: number; // in CAD
  dso?: number; // days sales outstanding for that invoice (optional)
  pastDue?: number; // days overdue (if any)
};

// ── Demo dataset (swap with API/DB). Roughly reflects the screenshots.
const DEMO_SALES: SaleRecord[] = [
  // July (recent)
  { id: "a1", date: "2025-07-03", subsidiary: "SINTO", customer: "Acier Nord", salesRep: "Julie Tremblay", product: "RGP2T", units: 120, revenue: 18500, dso: 38 },
  { id: "a2", date: "2025-07-05", subsidiary: "SINTO", customer: "MécanoPro", salesRep: "Marc Otis", product: "RG2T", units: 80, revenue: 12100, dso: 42 },
  { id: "a3", date: "2025-07-07", subsidiary: "SINTO", customer: "Transport Lavoie", salesRep: "Nadia Lefebvre", product: "IP1", units: 210, revenue: 17300, dso: 36, pastDue: 11 },
  { id: "a4", date: "2025-07-12", subsidiary: "SINTO", customer: "Forestra", salesRep: "Patrick Roy", product: "IP20", units: 60, revenue: 13900, dso: 49 },
  { id: "a5", date: "2025-07-15", subsidiary: "SINTO", customer: "HydroEst", salesRep: "Julie Tremblay", product: "RGP2T", units: 140, revenue: 20400, dso: 41 },
  { id: "a6", date: "2025-07-20", subsidiary: "PROLAB", customer: "Acier Nord", salesRep: "Marc Otis", product: "RG2T", units: 95, revenue: 14400, dso: 39 },
  { id: "a7", date: "2025-07-21", subsidiary: "Otoprotec", customer: "Garage Raymond", salesRep: "Nadia Lefebvre", product: "IP1", units: 130, revenue: 10800, dso: 52, pastDue: 6 },
  { id: "a8", date: "2025-07-25", subsidiary: "Lubrilab", customer: "HydroEst", salesRep: "Patrick Roy", product: "IP20", units: 50, revenue: 9900, dso: 40 },
  // June
  { id: "b1", date: "2025-06-08", subsidiary: "SINTO", customer: "Acier Nord", salesRep: "Julie Tremblay", product: "RGP2T", units: 110, revenue: 17200, dso: 37 },
  { id: "b2", date: "2025-06-12", subsidiary: "SINTO", customer: "MécanoPro", salesRep: "Marc Otis", product: "RG2T", units: 70, revenue: 11250, dso: 45 },
  { id: "b3", date: "2025-06-18", subsidiary: "SINTO", customer: "Transport Lavoie", salesRep: "Nadia Lefebvre", product: "IP1", units: 180, revenue: 14950, dso: 33 },
  { id: "b4", date: "2025-06-22", subsidiary: "SINTO", customer: "Forestra", salesRep: "Patrick Roy", product: "IP20", units: 66, revenue: 12700, dso: 47 },
  { id: "b5", date: "2025-06-30", subsidiary: "SINTO", customer: "HydroEst", salesRep: "Julie Tremblay", product: "RGP2T", units: 120, revenue: 18900, dso: 43 },
  // May
  { id: "c1", date: "2025-05-10", subsidiary: "SINTO", customer: "Acier Nord", salesRep: "Julie Tremblay", product: "RGP2T", units: 90, revenue: 14500, dso: 35 },
  { id: "c2", date: "2025-05-12", subsidiary: "SINTO", customer: "MécanoPro", salesRep: "Marc Otis", product: "RG2T", units: 60, revenue: 9800, dso: 41 },
  { id: "c3", date: "2025-05-19", subsidiary: "SINTO", customer: "Transport Lavoie", salesRep: "Nadia Lefebvre", product: "IP1", units: 150, revenue: 12600, dso: 31 },
  { id: "c4", date: "2025-05-27", subsidiary: "SINTO", customer: "Forestra", salesRep: "Patrick Roy", product: "IP20", units: 55, revenue: 10100, dso: 46 },
];

// ----- Utils -----
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
  // returns [{month: '2025-05', RGP2T: 10000, RG2T: 9000, ...}]
  const map: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const month = r.date.slice(0, 7);
    if (!map[month]) map[month] = {};
    map[month][r.product] = (map[month][r.product] ?? 0) + r.revenue;
  }
  const months = Object.keys(map).sort();
  return months.map((m) => ({ month: m, ...map[m] }));
}

// ----- Page -----
export default function DashboardPage() {
  const { data: session } = useSession();
  const [tenant, setTenant] = useState<Subsidiary>("SINTO");
  const [range, setRange] = useState<"30d" | "90d" | "ytd">("30d");
  const [search, setSearch] = useState("");

  const projects: Project[] = mockProjectsData;
  const STAGE_CONFIG = [
    { id: ProductLifecycleStage.DEMANDE_IDEATION, name: "Demande / Idéation", color: "#3b82f6" },
    { id: ProductLifecycleStage.EVALUATION_COUT_POTENTIEL, name: "Évaluation Coût/Potentiel", color: "#8b5cf6" },
    { id: ProductLifecycleStage.PROTOTYPAGE, name: "Prototypage", color: "#ec4899" },
    { id: ProductLifecycleStage.MISE_EN_FONCTION_DEVELOPPEMENT, name: "Mise en Fonction / Développement", color: "#f97316" },
    { id: ProductLifecycleStage.PLANIFICATION_PRODUIT_FINI, name: "Planification Produit Fini", color: "#10b981" },
    { id: ProductLifecycleStage.MISE_EN_MARCHE, name: "Mise en Marché", color: "#6366f1" },
    { id: ProductLifecycleStage.VIE_DU_PRODUIT, name: "Vie du Produit", color: "#64748b" },
  ];

  const pipelineDataForKanban: KanbanStage[] = STAGE_CONFIG.map((config) => ({
    ...config,
    projects: projects.filter((p) => p.stage === config.id),
  }));

  // ---- Sales filtering ----
  const filteredBase = useMemo(() => DEMO_SALES.filter((r) => r.subsidiary === tenant), [tenant]);

  const filteredRange = useMemo(() => {
    if (range === "30d") return filteredBase.filter((r) => dateInRange(r.date, 30));
    if (range === "90d") return filteredBase.filter((r) => dateInRange(r.date, 90));
    // ytd
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return filteredBase.filter((r) => new Date(r.date) >= start && new Date(r.date) <= now);
  }, [filteredBase, range]);

  const rows = useMemo(() =>
    filteredRange.filter(
      (r) => !search || r.customer.toLowerCase().includes(search.toLowerCase()) || r.salesRep.toLowerCase().includes(search.toLowerCase()) || r.product.toLowerCase().includes(search.toLowerCase())
    ),
  [filteredRange, search]);

  // ---- KPI ----
  const totalRevenue = useMemo(() => rows.reduce((a, b) => a + b.revenue, 0), [rows]);
  const customersCount = useMemo(() => new Set(rows.map((r) => r.customer)).size, [rows]);
  const ordersCount = rows.length;
  const avgTicket = ordersCount ? totalRevenue / ordersCount : 0;
  const avgDSO = rows.length ? Math.round(rows.reduce((a, b) => a + (b.dso ?? 0), 0) / rows.length) : 0;

  // ---- Aggregations ----
  const byCustomer = useMemo(() => aggregateBy(rows, "customer").sort((a, b) => b.revenue - a.revenue).slice(0, 8), [rows]);
  const byRep = useMemo(() => aggregateBy(rows, "salesRep").sort((a, b) => b.revenue - a.revenue).slice(0, 8), [rows]);
  const byProduct = useMemo(() => aggregateBy(rows, "product").sort((a, b) => b.revenue - a.revenue), [rows]);
  const monthProduct = useMemo(() => groupByMonthProduct(filteredBase), [filteredBase]);

  // ---- UI helpers ----
  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "Utilisateur";

  return (
    <div className="flex-1 space-y-8 p-6 md:p-10">
      {/* Top bar controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Bonjour, {userName}</h1>
          <p className="text-muted-foreground">Vue consolidée — ventes et pipeline produit</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={tenant} onValueChange={(v) => setTenant(v as Subsidiary)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filiale" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SINTO">SINTO</SelectItem>
              <SelectItem value="PROLAB">PROLAB</SelectItem>
              <SelectItem value="Otoprotec">Otoprotec</SelectItem>
              <SelectItem value="Lubrilab">Lubrilab</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => setRange(v as any)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Période" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 jours</SelectItem>
              <SelectItem value="ytd">Année en cours</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input placeholder="Rechercher client / rep / produit" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[260px]" />
            <Button variant="default" className="gap-2"><ArrowUpRight className="h-4 w-4"/>Exporter</Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Revenu" value={currency(totalRevenue)} hint={`${ordersCount} commandes`} icon={<TrendingUp className="h-5 w-5" />} />
        <KpiCard title="Clients actifs" value={String(customersCount)} hint="sur la période" icon={<UsersRound className="h-5 w-5" />} />
        <KpiCard title="Ticket moyen" value={currency(avgTicket)} hint="revenu / commande" icon={<ShoppingCart className="h-5 w-5" />} />
        <KpiCard title="DSO moyen" value={`${avgDSO} j`} hint="délai de paiement" icon={<PackageOpen className="h-5 w-5" />} />
      </div>

      {/* BI: Top lists + product trends */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Évolution des ventes par produit</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthProduct} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => currency(v)} />
                <Legend />
                {/* Focus products requested */}
                <Line type="monotone" dataKey="RGP2T" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="RG2T" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="IP1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="IP20" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par produit (période)</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byProduct} dataKey="revenue" nameKey="name" innerRadius={60} outerRadius={90} />
                <Tooltip formatter={(v: number) => currency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList>
          <TabsTrigger value="customers">Top Clients</TabsTrigger>
          <TabsTrigger value="reps">Top Experts (Reps)</TabsTrigger>
          <TabsTrigger value="products">Top Produits</TabsTrigger>
        </TabsList>
        <TabsContent value="customers">
          <TopTable title="Principaux clients (revenu)" rows={byCustomer} currency />
        </TabsContent>
        <TabsContent value="reps">
          <TopTable title="Meilleurs experts (revenu)" rows={byRep} currency />
        </TabsContent>
        <TabsContent value="products">
          <TopTable title="Meilleurs produits (revenu)" rows={byProduct} currency />
        </TabsContent>
      </Tabs>

      {/* Collections at risk (Debt) */}
      <Card>
        <CardHeader>
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
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.customer}</TableCell>
                    <TableCell>{r.product}</TableCell>
                    <TableCell>{currency(r.revenue)}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{r.pastDue} j retard</Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Optional: quick bar of sales by day within range */}
      <Card>
        <CardHeader>
          <CardTitle>Ventes quotidiennes (période)</CardTitle>
        </CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows.map((r) => ({ date: r.date, revenue: r.revenue }))}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => currency(v)} />
              <Area type="monotone" dataKey="revenue" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Keep your product pipeline */}
      <div>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Pipeline Lancement de Produit</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PipelineKanbanView stages={pipelineDataForKanban} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------- Reusable bits ----------
function KpiCard({ title, value, hint, icon }: { title: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function TopTable({ title, rows, currency: asCurrency = false }: { title: string; rows: { name: string; revenue: number }[]; currency?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => (asCurrency ? currency(v) : v)} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} />
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
                  <TableRow key={r.name}>
                    <TableCell className="w-12">#{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{asCurrency ? currency(r.revenue) : r.revenue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
