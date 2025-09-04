import * as React from "react";
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
  User,
  Calendar,
  Package,
  AlertCircle,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  Zap,
  MoreHorizontal,
} from "lucide-react";

/* =============================================================================
   Types & constants
============================================================================= */
type Reporter = "expert" | "transporteur" | "autre";
type Cause =
  | "production"
  | "pompe"
  | "autre_cause"
  | "exposition_sinto"
  | "transporteur"
  | "autre";

type ReturnStatus =
  | "draft"
  | "awaiting_physical"
  | "received_or_no_physical";

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

const STATUS_CONFIG = {
  draft: {
    label: "Brouillon",
    icon: FileText,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-white dark:bg-neutral-900",
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  awaiting_physical: {
    label: "En attente",
    icon: Clock,
    color: "text-white",
    bg: "bg-black",
    badge: "bg-black text-white border-black",
  },
  received_or_no_physical: {
    label: "Reçu",
    icon: CheckCircle,
    color: "text-white",
    bg: "bg-emerald-500 dark:bg-emerald-600",
    badge: "bg-emerald-500 text-white border-emerald-500",
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
   Utility function
============================================================================= */
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

/* =============================================================================
   Components
============================================================================= */
function StatusBadge({ status }: { status: ReturnStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
      "transition-all duration-200",
      config.badge
    )}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon 
}: { 
  title: string; 
  value: string | number; 
  change?: string; 
  icon: React.ElementType 
}) {
  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-slate-200 dark:border-neutral-800 transition-all duration-200 hover:border-blue-500/50 dark:hover:border-blue-500/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
          <div className="p-2 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-500/10 dark:to-purple-500/10 rounded-lg">
            <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            {value}
          </span>
          {change && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {change}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   Main Page Component - Enhanced with full functionality
============================================================================= */
export default function ReturnsPage() {
  // State
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

  // Filtered data
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

  // Stats
  const stats = React.useMemo(() => ({
    total: filtered.length,
    draft: filtered.filter(r => r.status === "draft").length,
    awaiting: filtered.filter(r => r.status === "awaiting_physical").length,
    received: filtered.filter(r => r.status === "received_or_no_physical").length,
  }), [filtered]);

  // Actions
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
    updateSelected({
      products: [...(selected.products ?? []), next],
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-neutral-950 dark:via-neutral-950 dark:to-blue-950/10">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Gestion des retours
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Tableau de bord centralisant tous vos retours produits
              </p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium text-sm shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 hover:-translate-y-0.5">
              <Plus className="h-4 w-4" />
              Nouveau retour
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard title="Total des retours" value={stats.total} icon={Package} />
          <MetricCard title="En attente" value={stats.awaiting} icon={Clock} />
          <MetricCard title="Reçus" value={stats.received} change="+12%" icon={CheckCircle} />
          <MetricCard title="Brouillons" value={stats.draft} icon={FileText} />
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl blur-xl group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300" />
            <div className="relative bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-slate-200 dark:border-neutral-800 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher par code, client, expert, commande..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-neutral-950 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 transition-all duration-200"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-3">
                  <select
                    value={cause}
                    onChange={(e) => setCause(e.target.value as Cause | "all")}
                    className="px-4 py-3 bg-slate-50 dark:bg-neutral-950 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 transition-all duration-200 cursor-pointer"
                  >
                    <option value="all">Toutes les causes</option>
                    {CAUSES_IN_ORDER.map((c) => (
                      <option key={c} value={c}>{CAUSE_LABEL[c]}</option>
                    ))}
                  </select>

                  <select
                    value={reporter}
                    onChange={(e) => setReporter(e.target.value as Reporter | "all")}
                    className="px-4 py-3 bg-slate-50 dark:bg-neutral-950 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 transition-all duration-200 cursor-pointer"
                  >
                    <option value="all">Tous les signaleurs</option>
                    {(["expert", "transporteur", "autre"] as Reporter[]).map((r) => (
                      <option key={r} value={r}>{REPORTER_LABEL[r]}</option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-4 py-3 bg-slate-50 dark:bg-neutral-950 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 transition-all duration-200"
                  />

                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-4 py-3 bg-slate-50 dark:bg-neutral-950 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 transition-all duration-200"
                  />

                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="lg:hidden inline-flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-neutral-950 rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-neutral-900 transition-all duration-200"
                  >
                    <Filter className="h-4 w-4" />
                    Plus
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <button 
                    onClick={() => alert("Exporter (à brancher)")}
                    className="hidden lg:inline-flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-neutral-950 rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-neutral-900 transition-all duration-200"
                  >
                    <Download className="h-4 w-4" />
                    Exporter
                  </button>

                  <button 
                    onClick={onReset}
                    className="hidden lg:inline-flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-neutral-950 rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-neutral-900 transition-all duration-200"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Réinitialiser
                  </button>
                </div>
              </div>

              {/* Mobile expanded filters */}
              {expanded && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-neutral-800 lg:hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Du</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-neutral-950 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Au</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-neutral-950 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl blur-2xl" />
          <div className="relative bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-neutral-800">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Signalé par
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Cause
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      No Commande
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tracking
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      P.J.
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {filtered.map((row) => {
                    const config = STATUS_CONFIG[row.status];
                    const hasFiles = (row.attachments?.length ?? 0) > 0;
                    
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "transition-all duration-200 relative group/row",
                          config.bg,
                          config.color,
                          hoveredRow === row.id && "shadow-lg z-10",
                          row.standby && "opacity-50"
                        )}
                        onMouseEnter={() => setHoveredRow(row.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-1 h-8 rounded-full transition-all duration-200",
                              row.status === "draft" && "bg-slate-400",
                              row.status === "awaiting_physical" && "bg-black",
                              row.status === "received_or_no_physical" && "bg-emerald-500",
                              row.standby && "bg-amber-500"
                            )} />
                            <span className="font-mono font-semibold">{row.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 opacity-50" />
                            <span className="text-sm">
                              {new Date(row.reportedAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium",
                            "bg-white/10 backdrop-blur border",
                            row.status === "awaiting_physical" || row.status === "received_or_no_physical"
                              ? "border-white/20"
                              : "border-slate-200 dark:border-neutral-700"
                          )}>
                            {REPORTER_LABEL[row.reporter]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium",
                            "bg-white/10 backdrop-blur border",
                            row.status === "awaiting_physical" || row.status === "received_or_no_physical"
                              ? "border-white/20"
                              : "border-slate-200 dark:border-neutral-700"
                          )}>
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
                              <Folder className="h-4 w-4 opacity-60" />
                              <span className="text-xs font-medium">{row.attachments!.length}</span>
                            </div>
                          ) : (
                            <span className="text-xs opacity-40">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-all duration-200">
                            <button
                              onClick={() => setOpenId(row.id)}
                              className={cn(
                                "p-2 rounded-lg transition-all duration-200",
                                "hover:bg-white/20",
                                row.status === "draft" && "hover:bg-slate-100 dark:hover:bg-neutral-800"
                              )}
                              title="Consulter"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onToggleStandby(row.id)}
                              className={cn(
                                "p-2 rounded-lg transition-all duration-200",
                                row.standby ? "bg-amber-500/20" : "hover:bg-white/20",
                                row.status === "draft" && "hover:bg-slate-100 dark:hover:bg-neutral-800"
                              )}
                              title={row.standby ? "Retirer du standby" : "Mettre en standby"}
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDelete(row.id)}
                              className={cn(
                                "p-2 rounded-lg transition-all duration-200",
                                "hover:bg-red-500/20 text-red-400",
                                row.status === "draft" && "hover:bg-red-50 dark:hover:bg-red-950/30"
                              )}
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filtered.length === 0 && (
                <div className="py-20 text-center">
                  <Package className="h-12 w-12 text-slate-300 dark:text-neutral-700 mx-auto mb-4" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Aucun retour ne correspond à vos filtres
                  </p>
                </div>
              )}
            </div>

            {/* Table Footer */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-950/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge status="draft" />
                  <StatusBadge status="awaiting_physical" />
                  <StatusBadge status="received_or_no_physical" />
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
          />
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   Detail Modal - Full functionality restored
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
}: {
  row: ReturnRow;
  onClose: () => void;
  onPatch: (patch: Partial<ReturnRow>) => void;
  onAddProduct: () => void;
  onRemoveProduct: (pid: string) => void;
  onChangeProduct: (pid: string, patch: Partial<ProductLine>) => void;
  onSaveDraft: () => void;
  onSendForApproval: () => void;
}) {
  const config = STATUS_CONFIG[row.status];
  const hasFiles = (row.attachments?.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl transition-all">
          {/* Modal Header */}
          <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-900 dark:to-neutral-950 px-6 py-4 border-b border-slate-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-1 h-12 rounded-full",
                  row.status === "draft" && "bg-slate-400",
                  row.status === "awaiting_physical" && "bg-black",
                  row.status === "received_or_no_physical" && "bg-emerald-500"
                )} />
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    Retour {row.id}
                    <StatusBadge status={row.status} />
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {CAUSE_LABEL[row.cause]} • Signalé le {new Date(row.reportedAt).toLocaleDateString('fr-FR')} par {REPORTER_LABEL[row.reporter]}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="px-6 py-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Created By */}
            {row.createdBy && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-neutral-950 rounded-xl">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                  {row.createdBy.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{row.createdBy.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Créé le {new Date(row.createdBy.at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            )}

            {/* Basic fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field
                label="Expert"
                value={row.expert}
                onChange={(v) => onPatch({ expert: v })}
              />
              <Field
                label="Client"
                value={row.client}
                onChange={(v) => onPatch({ client: v })}
              />
              <Field
                label="No. client"
                value={row.noClient ?? ""}
                onChange={(v) => onPatch({ noClient: v || undefined })}
              />
              <Field
                label="No. commande"
                value={row.noCommande ?? ""}
                onChange={(v) => onPatch({ noCommande: v || undefined })}
              />
              <Field
                label="No. tracking"
                value={row.tracking ?? ""}
                onChange={(v) => onPatch({ tracking: v || undefined })}
              />
              <Field
                label="Transport"
                value={row.transport ?? ""}
                onChange={(v) => onPatch({ transport: v || null })}
              />
              <Field
                label="Montant"
                value={row.amount?.toString() ?? ""}
                onChange={(v) => onPatch({ amount: v ? Number(v) : null })}
              />
              <Field
                label="Date commande"
                type="date"
                value={row.dateCommande ?? ""}
                onChange={(v) => onPatch({ dateCommande: v || null })}
              />
              <Field
                label="Cause"
                as="select"
                value={row.cause}
                onChange={(v) => onPatch({ cause: v as Cause })}
                options={CAUSES_IN_ORDER.map((c) => ({
                  value: c,
                  label: CAUSE_LABEL[c],
                }))}
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                <h4 className="font-semibold">Fichiers joints</h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({row.attachments?.length ?? 0})
                </span>
              </div>
              {hasFiles ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {row.attachments!.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border overflow-hidden border-slate-200 dark:border-neutral-800"
                    >
                      <div className="px-3 py-2 text-sm border-b bg-slate-50/70 dark:bg-neutral-900 dark:border-neutral-800">
                        {a.name}
                      </div>
                      <iframe title={a.name} src={a.url} className="w-full h-72" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Aucune pièce jointe.
                </div>
              )}
            </div>

            {/* Products */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produits (RMA)
                </h4>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
                  border-slate-200 bg-white hover:bg-slate-50
                  dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
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
                    className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr_110px_40px] gap-2 items-center p-3 bg-slate-50 dark:bg-neutral-950 rounded-lg"
                  >
                    <input
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-neutral-800"
                      placeholder="Code de produit"
                      value={p.codeProduit}
                      onChange={(e) =>
                        onChangeProduct(p.id, { codeProduit: e.target.value })
                      }
                    />
                    <input
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-neutral-800"
                      placeholder="Description du produit"
                      value={p.descriptionProduit}
                      onChange={(e) =>
                        onChangeProduct(p.id, {
                          descriptionProduit: e.target.value,
                        })
                      }
                    />
                    <input
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-neutral-800"
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
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-neutral-800"
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
                      className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                      onClick={() => onRemoveProduct(p.id)}
                      title="Retirer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {(row.products?.length ?? 0) === 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
                    Aucun produit. Ajoutez des lignes à l'aide du bouton ci-haut.
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
                className="w-full rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-neutral-800"
                rows={4}
                placeholder="Notes internes, contexte, instructions…"
                value={row.description ?? ""}
                onChange={(e) => onPatch({ description: e.target.value })}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-neutral-950 border-t border-slate-200 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Les changements sont locaux (demo). Connecter au backend PostgreSQL plus tard.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onSaveDraft}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
                  border-slate-200 bg-white hover:bg-slate-50
                  dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                >
                  <Save className="h-4 w-4" />
                  Enregistrer brouillon
                </button>
                <button 
                  onClick={onSendForApproval}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm font-medium transition-colors"
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  as,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  as?: "select";
  options?: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {as === "select" ? (
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-neutral-800 outline-none focus:border-blue-500 transition-colors"
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
          className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-neutral-800 outline-none focus:border-blue-500 transition-colors"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
