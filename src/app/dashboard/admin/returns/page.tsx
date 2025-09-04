"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Search,
  Eye,
  Trash2,
  Pause,
  Filter,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronUp,
  Folder,
  Plus,
  X,
  Save,
  Send,
  Calendar,
  Package,
  CheckCircle,
  Clock,
  FileText,
  BarChart3,
} from "lucide-react";
import { THEME } from "@/lib/theme-tokens";

/* =============================================================================
   Theme types & helpers (same tokens as your sales dashboard)
============================================================================= */
type ThemeTokens = (typeof THEME)[keyof typeof THEME];

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

/* =============================================================================
   Types & constants (unchanged domain model)
============================================================================= */
type Reporter = "expert" | "transporteur" | "autre";
type Cause =
  | "production"
  | "pompe"
  | "autre_cause"
  | "exposition_sinto"
  | "transporteur"
  | "autre";

type ReturnStatus = "draft" | "awaiting_physical" | "received_or_no_physical";

type Attachment = {
  id: string;
  name: string;
  url: string;
};

type ProductLine = {
  id: string;
  codeProduit: string;
  descriptionProduit: string;
  descriptionRetour?: string;
  quantite: number;
};

type ReturnRow = {
  id: string;
  reportedAt: string;
  reporter: Reporter;
  cause: Cause;
  expert: string;
  client: string;
  noClient?: string;
  noCommande?: string;
  tracking?: string;
  status: ReturnStatus;
  standby?: boolean;
  amount?: number | null;
  dateCommande?: string | null;
  transport?: string | null;
  attachments?: Attachment[];
  products?: ProductLine[];
  description?: string;
  createdBy?: { name: string; avatar?: string | null; at: string };
};

const REPORTER_LABEL: Record<Reporter, string> = {
  expert: "Expert",
  transporteur: "Transporteur",
  autre: "Autre",
};

const CAUSE_LABEL: Record<Cause, string> = {
  production: "Production",
  pompe: "Pompe",
  autre_cause: "Autre cause",
  exposition_sinto: "Exposition Sinto",
  transporteur: "Transporteur",
  autre: "Autre",
};

const CAUSES_IN_ORDER: Cause[] = [
  "production",
  "transporteur",
  "pompe",
  "exposition_sinto",
  "autre_cause",
  "autre",
];

/* =============================================================================
   Status visuals (kept familiar, but wrapped with theme for borders/labels)
============================================================================= */
const STATUS_CONFIG = {
  draft: {
    label: "Brouillon",
    icon: FileText,
    chip:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    rowBg: "bg-white dark:bg-neutral-900",
    rowFg: "text-slate-800 dark:text-white",
    bar: "bg-slate-400",
  },
  awaiting_physical: {
    label: "En attente",
    icon: Clock,
    chip: "bg-black text-white border-black",
    rowBg: "bg-[#0a0a0a] text-white",
    rowFg: "text-white",
    bar: "bg-black",
  },
  received_or_no_physical: {
    label: "Reçu",
    icon: CheckCircle,
    chip: "bg-emerald-500 text-white border-emerald-500",
    rowBg: "bg-emerald-600 dark:bg-emerald-600 text-white",
    rowFg: "text-white",
    bar: "bg-emerald-500",
  },
} as const;

/* =============================================================================
   Dummy dataset
============================================================================= */
const DUMMY: ReturnRow[] = [
  {
    id: "R6498",
    reportedAt: "2025-09-01",
    reporter: "expert",
    cause: "production",
    expert: "DENIS LAVOIE (017)",
    client: "DISTRIBUTION RMM INC. (46)",
    noClient: "EXP-046",
    noCommande: "81724",
    tracking: "P77935962",
    status: "received_or_no_physical",
    amount: 0.0,
    dateCommande: "2025-09-01",
    transport: "DICOM-GLS (P)",
    attachments: [
      {
        id: "a1",
        name: "Facture 81724.pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    products: [
      {
        id: "p1",
        codeProduit: "IP200",
        descriptionProduit: "PERFORMA: HUILE 2 TEMPS SYN 200ML",
        descriptionRetour: "BOUTEILLE VIDE",
        quantite: 1,
      },
    ],
    description:
      "Client a reçu une bouteille vide. Interaction avec support documentée dans le ticket #12345.",
    createdBy: {
      name: "Roxane Bouffard",
      avatar: null,
      at: "2025-09-01T10:31:00-04:00",
    },
  },
  {
    id: "R6492",
    reportedAt: "2025-08-26",
    reporter: "expert",
    cause: "production",
    expert: "ROXANE BOUFFARD (011)",
    client: "LES MECANOS D'HAM NORD",
    noClient: "3442109",
    noCommande: "82767",
    tracking: "P80976755",
    status: "awaiting_physical",
    attachments: [],
    products: [],
    createdBy: { name: "Suzie Boutin", avatar: null, at: "2025-08-26T10:31:00-04:00" },
  },
  {
    id: "R6491",
    reportedAt: "2025-08-25",
    reporter: "transporteur",
    cause: "transporteur",
    expert: "BUDDY FORD (020)",
    client: "GROUPE CIRTECH INC.",
    noClient: "2213400",
    noCommande: "81065",
    tracking: "P76860066",
    status: "awaiting_physical",
    attachments: [
      {
        id: "a2",
        name: "BOL 81065.pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    products: [],
    createdBy: { name: "Hugo Fortin", avatar: null, at: "2025-08-25T09:47:00-04:00" },
  },
  {
    id: "R6486",
    reportedAt: "2025-08-22",
    reporter: "expert",
    cause: "autre_cause",
    expert: "SYLVAIN ARVISAVIS (012)",
    client: "BIOMASSE DU LAC TAUREAU",
    noClient: "8700141",
    noCommande: "83381",
    tracking: "P82517515",
    status: "received_or_no_physical",
    attachments: [],
    products: [],
    createdBy: { name: "Anick Poulin", avatar: null, at: "2025-08-22T11:37:00-04:00" },
  },
  {
    id: "R6483",
    reportedAt: "2025-08-11",
    reporter: "autre",
    cause: "autre",
    expert: "MIKE ROCHE (54)",
    client: "—",
    status: "draft",
    attachments: [],
    products: [],
    createdBy: { name: "Nicolas Labranches", avatar: null, at: "2025-08-11T13:05:00-04:00" },
  },
];

/* =============================================================================
   Small chips & KPI cards styled like your dashboard
============================================================================= */
function StatusBadge({ status, t }: { status: ReturnStatus; t: ThemeTokens }) {
  const S = STATUS_CONFIG[status];
  const Icon = S.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        S.chip
      )}
      style={{ boxShadow: status === "awaiting_physical" ? "0 0 0 1px rgba(255,255,255,.08) inset" : undefined }}
    >
      <Icon className="h-3.5 w-3.5" />
      {S.label}
    </span>
  );
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  t,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ElementType;
  t: ThemeTokens;
}) {
  return (
    <div className="group relative">
      <div
        className="absolute -inset-0.5 rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition duration-700"
        style={{ background: t.gradientPrimary }}
      />
      <div
        className="relative rounded-2xl p-6 border backdrop-blur-xl transition-all duration-300 hover:border-white/10"
        style={{ background: `linear-gradient(135deg, ${t.card} 0%, ${t.soft} 100%)`, borderColor: t.cardBorder }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: t.labelMuted }}>
            {title}
          </span>
          <div
            className="p-2 rounded-lg"
            style={{ background: "linear-gradient(135deg, rgba(34,211,238,.2), rgba(139,92,246,.2))" }}
          >
            <Icon className="h-4 w-4" style={{ color: t.accentPrimary }} />
          </div>
        </div>
        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-300 dark:from-white dark:to-zinc-400">
          {value}
        </div>
        {hint && (
          <div className="text-xs mt-1" style={{ color: t.label }}>
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   Page
============================================================================= */
export default function ReturnsPage() {
  // theme
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const mode: "dark" | "light" = mounted && resolvedTheme === "light" ? "light" : "dark";
  const t: ThemeTokens = THEME[mode];

  // state
  const [query, setQuery] = React.useState("");
  const [cause, setCause] = React.useState<"all" | Cause>("all");
  const [reporter, setReporter] = React.useState<"all" | Reporter>("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [expanded, setExpanded] = React.useState(false);
  const [rows, setRows] = React.useState<ReturnRow[]>(DUMMY);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = React.useState<string | null>(null);

  const selected = React.useMemo(
    () => rows.find((r) => r.id === openId) ?? null,
    [rows, openId]
  );

  // filter
  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      if (cause !== "all" && r.cause !== cause) return false;
      if (reporter !== "all" && r.reporter !== reporter) return false;
      if (dateFrom && r.reportedAt < dateFrom) return false;
      if (dateTo && r.reportedAt > dateTo) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = [
          r.id,
          r.client,
          r.expert,
          r.noClient,
          r.noCommande,
          r.tracking,
          REPORTER_LABEL[r.reporter],
          CAUSE_LABEL[r.cause],
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, cause, reporter, dateFrom, dateTo, query]);

  // stats
  const stats = React.useMemo(
    () => ({
      total: filtered.length,
      draft: filtered.filter((r) => r.status === "draft").length,
      awaiting: filtered.filter((r) => r.status === "awaiting_physical").length,
      received: filtered.filter((r) => r.status === "received_or_no_physical").length,
    }),
    [filtered]
  );

  // actions
  const onToggleStandby = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, standby: !r.standby } : r))
    );
  };
  const onDelete = (id: string) => {
    if (!confirm(`Supprimer le retour ${id} ?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };
  const onReset = () => {
    setQuery("");
    setCause("all");
    setReporter("all");
    setDateFrom("");
    setDateTo("");
  };
  const updateSelected = (patch: Partial<ReturnRow>) => {
    if (!selected) return;
    setRows((prev) =>
      prev.map((r) => (r.id === selected.id ? { ...r, ...patch } : r))
    );
  };
  const addProduct = () => {
    if (!selected) return;
    const next: ProductLine = {
      id: `np-${Date.now()}`,
      codeProduit: "",
      descriptionProduit: "",
      descriptionRetour: "",
      quantite: 1,
    };
    updateSelected({ products: [...(selected.products ?? []), next] });
  };
  const removeProduct = (pid: string) => {
    if (!selected) return;
    updateSelected({
      products: (selected.products ?? []).filter((p) => p.id !== pid),
    });
  };
  const changeProduct = (pid: string, patch: Partial<ProductLine>) => {
    if (!selected) return;
    updateSelected({
      products: (selected.products ?? []).map((p) =>
        p.id === pid ? { ...p, ...patch } : p
      ),
    });
  };
  const saveDraft = () => {
    updateSelected({ status: "draft" });
    alert("Brouillon enregistré (fictif).");
  };
  const sendForApproval = () => {
    updateSelected({ status: "received_or_no_physical" });
    alert("Envoyé pour approbation (fictif).");
  };

  if (!mounted) {
    return <div className="min-h-[60vh]" />;
  }

  return (
    <main
      className="min-h-[100svh] bg-white dark:bg-[#050507]"
      style={{
        background:
          mode === "dark"
            ? `linear-gradient(180deg, ${t.bg} 0%, #050507 100%)`
            : undefined,
        color: t.foreground,
      }}
    >
      {/* soft halo background like sales dashboard */}
      {mode === "dark" && (
        <div className="fixed inset-0 opacity-20 pointer-events-none">
          <div
            className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ background: t.haloCyan }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ background: t.haloViolet }}
          />
        </div>
      )}

      <div className="px-4 md:px-6 lg:px-8 py-6 md:py-8 relative z-10">
        <div className="mx-auto w-full max-w-[1920px] space-y-6">
          {/* Header with same hero card style */}
          <div
            className="rounded-3xl border backdrop-blur-2xl relative overflow-hidden"
            style={{
              borderColor: t.cardBorder,
              background: `linear-gradient(135deg, ${t.card} 0%, ${
                mode === "dark" ? "rgba(139,92,246,0.02)" : "rgba(124,58,237,0.04)"
              } 100%)`,
            }}
          >
            <div
              className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"
              style={{ background: `linear-gradient(to bottom right, ${t.haloCyan}, ${t.haloViolet})` }}
            />
            <div className="px-6 py-6 relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="p-2 rounded-xl backdrop-blur-xl"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(139,92,246,0.2))",
                      }}
                    >
                      <BarChart3 className="w-6 h-6" style={{ color: t.accentPrimary }} />
                    </div>
                    <h1
                      className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight"
                      style={{ color: t.foreground }}
                    >
                      Gestion des retours<span style={{ color: t.accentPrimary }}>.</span>
                    </h1>
                  </div>
                  <p className="text-sm ml-12" style={{ color: t.label }}>
                    Recherchez, filtrez et gérez vos retours produits
                  </p>
                </div>

                {/* quick actions (kept simple) */}
                <button
                  className="px-6 py-2.5 rounded-xl text-sm font-bold hover:scale-105 transition-all duration-300 shadow-2xl"
                  style={{
                    color: "#000",
                    background: "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)",
                    boxShadow: "0 10px 30px rgba(34, 211, 238, 0.35)",
                  }}
                  onClick={() => alert("Nouvelle RMA (à brancher)")}
                >
                  Nouveau retour
                </button>
              </div>

              {/* Filters row */}
              <div className="mt-6 flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: t.labelMuted }} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher par code, client, expert, commande..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                      border: `1px solid ${t.cardBorder}`,
                      color: t.foreground,
                    }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={cause}
                    onChange={(e) => setCause(e.target.value as Cause | "all")}
                    className="appearance-none rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none transition-all"
                    style={{
                      background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                      border: `1px solid ${t.cardBorder}`,
                      color: t.foreground,
                    }}
                  >
                    <option value="all">Toutes les causes</option>
                    {CAUSES_IN_ORDER.map((c) => (
                      <option key={c} value={c}>
                        {CAUSE_LABEL[c]}
                      </option>
                    ))}
                  </select>

                  <select
                    value={reporter}
                    onChange={(e) => setReporter(e.target.value as Reporter | "all")}
                    className="appearance-none rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none transition-all"
                    style={{
                      background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                      border: `1px solid ${t.cardBorder}`,
                      color: t.foreground,
                    }}
                  >
                    <option value="all">Tous les signaleurs</option>
                    {(["expert", "transporteur", "autre"] as Reporter[]).map((r) => (
                      <option key={r} value={r}>
                        {REPORTER_LABEL[r]}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-xl px-3 py-3 text-sm focus:outline-none transition-all"
                    style={{
                      background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                      border: `1px solid ${t.cardBorder}`,
                      color: t.foreground,
                    }}
                  />
                  <span className="text-sm" style={{ color: t.label }}>
                    à
                  </span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-xl px-3 py-3 text-sm focus:outline-none transition-all"
                    style={{
                      background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                      border: `1px solid ${t.cardBorder}`,
                      color: t.foreground,
                    }}
                  />

                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="lg:hidden inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                      border: `1px solid ${t.cardBorder}`,
                      color: t.foreground,
                    }}
                  >
                    <Filter className="h-4 w-4" />
                    Plus
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={() => alert("Exporter (à brancher)")}
                    className="hidden lg:inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all"
                    style={{ background: t.cardSoft, border: `1px solid ${t.cardBorder}`, color: t.foreground }}
                  >
                    <Download className="h-4 w-4" />
                    Exporter
                  </button>

                  <button
                    onClick={onReset}
                    className="hidden lg:inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all"
                    style={{ background: t.cardSoft, border: `1px solid ${t.cardBorder}`, color: t.foreground }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Réinitialiser
                  </button>
                </div>
              </div>

              {/* mobile extra filters */}
              {expanded && (
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${t.cardBorder}` }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs" style={{ color: t.label }}>
                        Du
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none transition-all"
                        style={{
                          background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                          border: `1px solid ${t.cardBorder}`,
                          color: t.foreground,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs" style={{ color: t.label }}>
                        Au
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none transition-all"
                        style={{
                          background: mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                          border: `1px solid ${t.cardBorder}`,
                          color: t.foreground,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KPI Row (mirrors your dashboard cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total retours" value={stats.total} icon={Package} t={t} />
            <MetricCard title="En attente" value={stats.awaiting} icon={Clock} t={t} />
            <MetricCard title="Reçus" value={stats.received} icon={CheckCircle} t={t} />
            <MetricCard title="Brouillons" value={stats.draft} icon={FileText} t={t} />
          </div>

          {/* Table */}
          <div className="relative group">
            <div
              className="absolute inset-0 rounded-2xl blur-2xl"
              style={{ background: "linear-gradient(135deg, rgba(34,211,238,.06), rgba(139,92,246,.06))" }}
            />
            <div
              className="relative rounded-2xl border shadow-sm overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${t.card} 0%, ${t.soft} 100%)`, borderColor: t.cardBorder }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                      {[
                        "Code",
                        "Date",
                        "Signalé par",
                        "Cause",
                        "Client / Expert",
                        "No Commande",
                        "Tracking",
                        "P.J.",
                        "Actions",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className={cn("px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider", i === 8 && "text-right")}
                          style={{ color: t.labelMuted }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const S = STATUS_CONFIG[row.status];
                      const hasFiles = (row.attachments?.length ?? 0) > 0;

                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "transition-all duration-200 relative group/row",
                            S.rowBg,
                            S.rowFg,
                            hoveredRow === row.id && "z-10"
                          )}
                          style={{
                            boxShadow:
                              hoveredRow === row.id
                                ? "0 10px 30px rgba(0,0,0,0.25) inset, 0 6px 18px rgba(0,0,0,0.25)"
                                : undefined,
                            borderBottom: `1px solid ${t.cardBorder}`,
                          }}
                          onMouseEnter={() => setHoveredRow(row.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-1 h-8 rounded-full", row.standby && "bg-amber-500", !row.standby && S.bar)} />
                              <span className="font-mono font-semibold">{row.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 opacity-60" />
                              <span className="text-sm">
                                {new Date(row.reportedAt).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium",
                                "backdrop-blur border",
                                row.status === "draft"
                                  ? "bg-white/50 dark:bg-white/10 border-white/20"
                                  : "bg-white/10 border-white/20"
                              )}
                            >
                              {REPORTER_LABEL[row.reporter]}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium",
                                "backdrop-blur border",
                                row.status === "draft"
                                  ? "bg-white/50 dark:bg-white/10 border-white/20"
                                  : "bg-white/10 border-white/20"
                              )}
                            >
                              {CAUSE_LABEL[row.cause]}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-sm">{row.client}</div>
                              {row.expert && (
                                <div className="text-xs opacity-70 mt-0.5">{row.expert}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm">{row.noCommande ?? "—"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs">{row.tracking ?? "—"}</span>
                          </td>
                          <td className="px-6 py-4">
                            {hasFiles ? (
                              <div className="flex items-center gap-1.5">
                                <Folder className="h-4 w-4 opacity-80" />
                                <span className="text-xs font-medium">{row.attachments!.length}</span>
                              </div>
                            ) : (
                              <span className="text-xs opacity-50">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-all duration-200">
                              <button
                                onClick={() => setOpenId(row.id)}
                                className="p-2 rounded-lg hover:bg-white/20"
                                title="Consulter"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => onToggleStandby(row.id)}
                                className={cn("p-2 rounded-lg transition-all", row.standby ? "bg-amber-500/25" : "hover:bg-white/20")}
                                title={row.standby ? "Retirer du standby" : "Mettre en standby"}
                              >
                                <Pause className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => onDelete(row.id)}
                                className="p-2 rounded-lg hover:bg-red-500/20 text-red-300"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Package className="h-10 w-10" style={{ color: t.labelMuted }} />
                            <div className="text-sm" style={{ color: t.label }}>
                              Aucun retour ne correspond à vos filtres
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* table footer */}
              <div
                className="px-6 py-3"
                style={{
                  borderTop: `1px solid ${t.cardBorder}`,
                  background: `linear-gradient(135deg, ${t.card} 0%, ${t.soft} 100%)`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: t.label }}>
                    {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status="draft" t={t} />
                    <StatusBadge status="awaiting_physical" t={t} />
                    <StatusBadge status="received_or_no_physical" t={t} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Modal */}
          {selected && (
            <DetailModal
              row={selected}
              onClose={() => setOpenId(null)}
              onPatch={updateSelected}
              onAddProduct={addProduct}
              onRemoveProduct={removeProduct}
              onChangeProduct={changeProduct}
              onSaveDraft={saveDraft}
              onSendForApproval={sendForApproval}
              t={t}
              mode={mode}
            />
          )}
        </div>
      </div>
    </main>
  );
}

/* =============================================================================
   Detail Modal (themed)
============================================================================= */
function DetailModal({
  row,
  onClose,
  onPatch,
  onAddProduct,
  onRemoveProduct,
  onChangeProduct,
  onSaveDraft,
  onSendForApproval,
  t,
  mode,
}: {
  row: ReturnRow;
  onClose: () => void;
  onPatch: (patch: Partial<ReturnRow>) => void;
  onAddProduct: () => void;
  onRemoveProduct: (pid: string) => void;
  onChangeProduct: (pid: string, patch: Partial<ProductLine>) => void;
  onSaveDraft: () => void;
  onSendForApproval: () => void;
  t: ThemeTokens;
  mode: "dark" | "light";
}) {
  const hasFiles = (row.attachments?.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div
          className="relative w-full max-w-6xl transform overflow-hidden rounded-2xl shadow-2xl transition-all"
          style={{
            background: `linear-gradient(135deg, ${t.card} 0%, ${t.soft} 100%)`,
            border: `1px solid ${t.cardBorder}`,
            color: t.foreground,
          }}
        >
          {/* header */}
          <div
            className="px-6 py-4 relative"
            style={{
              borderBottom: `1px solid ${t.cardBorder}`,
              background: `linear-gradient(135deg, ${t.card} 0%, ${mode === "dark" ? "rgba(139,92,246,0.04)" : "rgba(124,58,237,0.06)"} 100%)`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-1 h-12 rounded-full",
                    row.status === "draft" && "bg-slate-400",
                    row.status === "awaiting_physical" && "bg-black",
                    row.status === "received_or_no_physical" && "bg-emerald-500"
                  )}
                />
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    Retour {row.id}
                    <StatusBadge status={row.status} t={t} />
                  </h2>
                  <p className="text-sm mt-1" style={{ color: t.label }}>
                    {CAUSE_LABEL[row.cause]} • Signalé le{" "}
                    {new Date(row.reportedAt).toLocaleDateString("fr-FR")} par{" "}
                    {REPORTER_LABEL[row.reporter]}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{ background: t.cardSoft, border: `1px solid ${t.cardBorder}` }}
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* body */}
          <div className="px-6 py-6 space-y-6 max-h-[calc(100vh-220px)] overflow-y-auto">
            {row.createdBy && (
              <div
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: t.cardSoft, border: `1px solid ${t.cardBorder}` }}
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white font-medium">
                  {row.createdBy.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{row.createdBy.name}</p>
                  <p className="text-xs" style={{ color: t.label }}>
                    Créé le {new Date(row.createdBy.at).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
            )}

            {/* fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Expert" value={row.expert} onChange={(v) => onPatch({ expert: v })} t={t} mode={mode} />
              <Field label="Client" value={row.client} onChange={(v) => onPatch({ client: v })} t={t} mode={mode} />
              <Field
                label="No. client"
                value={row.noClient ?? ""}
                onChange={(v) => onPatch({ noClient: v || undefined })}
                t={t}
                mode={mode}
              />
              <Field
                label="No. commande"
                value={row.noCommande ?? ""}
                onChange={(v) => onPatch({ noCommande: v || undefined })}
                t={t}
                mode={mode}
              />
              <Field
                label="No. tracking"
                value={row.tracking ?? ""}
                onChange={(v) => onPatch({ tracking: v || undefined })}
                t={t}
                mode={mode}
              />
              <Field
                label="Transport"
                value={row.transport ?? ""}
                onChange={(v) => onPatch({ transport: v || null })}
                t={t}
                mode={mode}
              />
              <Field
                label="Montant"
                value={row.amount?.toString() ?? ""}
                onChange={(v) => onPatch({ amount: v ? Number(v) : null })}
                t={t}
                mode={mode}
              />
              <Field
                label="Date commande"
                type="date"
                value={row.dateCommande ?? ""}
                onChange={(v) => onPatch({ dateCommande: v || null })}
                t={t}
                mode={mode}
              />
              <Field
                label="Cause"
                as="select"
                value={row.cause}
                onChange={(v) => onPatch({ cause: v as Cause })}
                options={CAUSES_IN_ORDER.map((c) => ({ value: c, label: CAUSE_LABEL[c] }))}
                t={t}
                mode={mode}
              />
            </div>

            {/* attachments */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5" style={{ color: t.label }} />
                <h4 className="font-semibold">Fichiers joints</h4>
                <span className="text-xs" style={{ color: t.label }}>
                  ({row.attachments?.length ?? 0})
                </span>
              </div>
              {hasFiles ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {row.attachments!.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg overflow-hidden"
                      style={{ border: `1px solid ${t.cardBorder}` }}
                    >
                      <div
                        className="px-3 py-2 text-sm"
                        style={{ background: t.cardSoft, borderBottom: `1px solid ${t.cardBorder}` }}
                      >
                        {a.name}
                      </div>
                      <iframe title={a.name} src={a.url} className="w-full h-72" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm" style={{ color: t.label }}>
                  Aucune pièce jointe.
                </div>
              )}
            </div>

            {/* products */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produits (RMA)
                </h4>
                <button
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  style={{ background: t.cardSoft, border: `1px solid ${t.cardBorder}` }}
                  onClick={onAddProduct}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter produit
                </button>
              </div>

              <div className="space-y-2">
                {(row.products ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr_110px_40px] gap-2 items-center p-3 rounded-lg"
                    style={{ background: t.cardSoft, border: `1px solid ${t.cardBorder}` }}
                  >
                    <input
                      className="rounded-lg px-3 py-2 text-sm outline-none"
                      style={{
                        background: mode === "dark" ? "rgb(15 15 18)" : "#fff",
                        border: `1px solid ${t.cardBorder}`,
                        color: t.foreground,
                      }}
                      placeholder="Code de produit"
                      value={p.codeProduit}
                      onChange={(e) => onChangeProduct(p.id, { codeProduit: e.target.value })}
                    />
                    <input
                      className="rounded-lg px-3 py-2 text-sm outline-none"
                      style={{
                        background: mode === "dark" ? "rgb(15 15 18)" : "#fff",
                        border: `1px solid ${t.cardBorder}`,
                        color: t.foreground,
                      }}
                      placeholder="Description du produit"
                      value={p.descriptionProduit}
                      onChange={(e) =>
                        onChangeProduct(p.id, {
                          descriptionProduit: e.target.value,
                        })
                      }
                    />
                    <input
                      className="rounded-lg px-3 py-2 text-sm outline-none"
                      style={{
                        background: mode === "dark" ? "rgb(15 15 18)" : "#fff",
                        border: `1px solid ${t.cardBorder}`,
                        color: t.foreground,
                      }}
                      placeholder="Description du retour"
                      value={p.descriptionRetour ?? ""}
                      onChange={(e) =>
                        onChangeProduct(p.id, {
                          descriptionRetour: e.target.value,
                        })
                      }
                    />
                    <input
                      type="number"
                      className="rounded-lg px-3 py-2 text-sm outline-none"
                      style={{
                        background: mode === "dark" ? "rgb(15 15 18)" : "#fff",
                        border: `1px solid ${t.cardBorder}`,
                        color: t.foreground,
                      }}
                      placeholder="Quantité"
                      min={0}
                      value={p.quantite}
                      onChange={(e) =>
                        onChangeProduct(p.id, {
                          quantite: Number(e.target.value || 0),
                        })
                      }
                    />
                    <button
                      className="inline-flex items-center justify-center rounded-lg p-2 text-red-600"
                      style={{ background: "transparent" }}
                      onClick={() => onRemoveProduct(p.id)}
                      title="Retirer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {(row.products?.length ?? 0) === 0 && (
                  <div className="text-sm py-8 text-center" style={{ color: t.label }}>
                    Aucun produit. Ajoutez des lignes à l&apos;aide du bouton ci-haut.
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </h4>
              <textarea
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: mode === "dark" ? "rgb(15 15 18)" : "#fff",
                  border: `1px solid ${t.cardBorder}`,
                  color: t.foreground,
                }}
                rows={4}
                placeholder="Notes internes, contexte, instructions…"
                value={row.description ?? ""}
                onChange={(e) => onPatch({ description: e.target.value })}
              />
            </div>
          </div>

          {/* footer */}
          <div
            className="px-6 py-4"
            style={{
              borderTop: `1px solid ${t.cardBorder}`,
              background: `linear-gradient(135deg, ${t.card} 0%, ${t.soft} 100%)`,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs" style={{ color: t.label }}>
                Les changements sont locaux (demo). Connecter au backend PostgreSQL plus tard.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onSaveDraft}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  style={{ background: t.cardSoft, border: `1px solid ${t.cardBorder}` }}
                >
                  <Save className="h-4 w-4" />
                  Enregistrer brouillon
                </button>
                <button
                  onClick={onSendForApproval}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:scale-[1.02] transition"
                  style={{
                    color: "#000",
                    background: "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)",
                    boxShadow: "0 8px 24px rgba(34, 211, 238, 0.35)",
                  }}
                >
                  <Send className="h-4 w-4" />
                  Envoyer pour approbation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   Field atom (themed)
============================================================================= */
function Field({
  label,
  value,
  onChange,
  type = "text",
  as,
  options,
  t,
  mode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  as?: "select";
  options?: { value: string; label: string }[];
  t: ThemeTokens;
  mode: "dark" | "light";
}) {
  const baseStyles = {
    background: mode === "dark" ? "rgb(15 15 18)" : "#fff",
    border: `1px solid ${t.cardBorder}`,
    color: t.foreground,
  } as React.CSSProperties;

  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium" style={{ color: t.label }}>
        {label}
      </span>
      {as === "select" ? (
        <select
          className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={baseStyles}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={baseStyles}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
