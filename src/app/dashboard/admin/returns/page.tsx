// src/app/dashboard/admin/returns/page.tsx
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
  FileText,
  CheckCircle,
  Clock,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide,
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

type ReturnStatus = "draft" | "awaiting_physical" | "received_or_no_physical";

type Attachment = { id: string; name: string; url: string };
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
   Demo data
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
   Helpers & design tokens
============================================================================= */
function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const STATUS_TEXT: Record<
  ReturnStatus,
  { label: string; text: string; badge: string }
> = {
  draft: {
    label: "Brouillon",
    text: "text-slate-900 dark:text-slate-900",
    badge:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-white dark:border-white/15",
  },
  awaiting_physical: {
    label: "En attente",
    text: "text-white",
    badge:
      "bg-black text-white border-white/20 dark:bg-black dark:text-white dark:border-white/30",
  },
  received_or_no_physical: {
    label: "Reçu",
    text: "text-white",
    badge:
      "bg-emerald-500 text-white border-emerald-400 dark:border-emerald-300",
  },
};

/** Keep vivid base color; overlay a very subtle sheen so gradient is toned down */
// Tweak these to your exact brand shades:
const ROW_SHADES = {
  // Green (received)
  greenPrimary:  "#22c55e", // vivid success green
  greenAlternate:"#16a34a", // slightly darker for zebra
  // Black (awaiting physical)
  blackPrimary:  "#000000",
  blackAlternate:"#0b0b0b",
  // White (draft)
  whitePrimary:  "#ffffff",
  whiteAlternate:"#fafafa",
};

/** Keep vivid base color but allow subtle zebra alternance via `stripe`. */
function rowStyle(status: ReturnStatus, stripe = false): React.CSSProperties | undefined {
  if (status === "draft") {
    const base = stripe ? ROW_SHADES.whiteAlternate : ROW_SHADES.whitePrimary;
    return {
      backgroundColor: base,
      backgroundImage:
        "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.04) 100%)",
    };
  }
  if (status === "awaiting_physical") {
    const base = stripe ? ROW_SHADES.blackAlternate : ROW_SHADES.blackPrimary;
    return {
      backgroundColor: base,
      backgroundImage:
        "linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.10) 100%)",
    };
  }
  // received_or_no_physical — success green with zebra alternance
  const base = stripe ? ROW_SHADES.greenAlternate : ROW_SHADES.greenPrimary;
  return {
    backgroundColor: base,
    backgroundImage:
      "linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.10) 100%)",
  };
}

function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "blue" | "green" | "slate";
}) {
  const map = {
    muted:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-white dark:border-white/15",
    blue:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-500/25",
    green:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/20",
    slate:
      "bg-slate-200 text-slate-700 border-slate-300 dark:bg-white/10 dark:text-slate-100 dark:border-white/20",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        map[tone]
      )}
    >
      {children}
    </span>
  );
}

/* =============================================================================
   Page
============================================================================= */
type SortKey =
  | "id"
  | "reportedAt"
  | "reporter"
  | "cause"
  | "client"
  | "noCommande"
  | "tracking"
  | "attachments";

type SortDir = "asc" | "desc";

export default function ReturnsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // state
  const [query, setQuery] = React.useState("");
  const [cause, setCause] = React.useState<"all" | Cause>("all");
  const [reporter, setReporter] = React.useState<"all" | Reporter>("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [expanded, setExpanded] = React.useState(false);
  const [rows, setRows] = React.useState<ReturnRow[]>(DUMMY);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [hovered, setHovered] = React.useState<string | null>(null);

  const [sortKey, setSortKey] = React.useState<SortKey>("reportedAt");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  const selected = React.useMemo(
    () => rows.find((r) => r.id === openId) ?? null,
    [rows, openId]
  );

  // filtering
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

  // sorting
  const sorted = React.useMemo(() => {
    const get = (r: ReturnRow) => {
      switch (sortKey) {
        case "id":
          return r.id;
        case "reportedAt":
          return r.reportedAt;
        case "reporter":
          return REPORTER_LABEL[r.reporter];
        case "cause":
          return CAUSE_LABEL[r.cause];
        case "client":
          return `${r.client} ${r.expert}`;
        case "noCommande":
          return r.noCommande ?? "";
        case "tracking":
          return r.tracking ?? "";
        case "attachments":
          return r.attachments?.length ?? 0;
      }
    };
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      // treat as strings otherwise
      const sa = String(va ?? "");
      const sb = String(vb ?? "");
      const res = sa.localeCompare(sb, "fr", { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? res : -res;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const stats = React.useMemo(
    () => ({
      total: sorted.length,
      draft: sorted.filter((r) => r.status === "draft").length,
      awaiting: sorted.filter((r) => r.status === "awaiting_physical").length,
      received: sorted.filter((r) => r.status === "received_or_no_physical").length,
    }),
    [sorted]
  );

  // actions
  const onToggleStandby = (id: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, standby: !r.standby } : r)));
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
    setRows((prev) => prev.map((r) => (r.id === selected.id ? { ...r, ...patch } : r)));
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
  const removeProduct = (pid: string) =>
    selected && updateSelected({ products: (selected.products ?? []).filter((p) => p.id !== pid) });
  const changeProduct = (pid: string, patch: Partial<ProductLine>) =>
    selected &&
    updateSelected({
      products: (selected.products ?? []).map((p) => (p.id === pid ? { ...p, ...patch } : p)),
    });

  const saveDraft = () => {
    updateSelected({ status: "draft" });
    alert("Brouillon enregistré (fictif).");
  };
  const sendForApproval = () => {
    updateSelected({ status: "received_or_no_physical" });
    alert("Envoyé pour approbation (fictif).");
  };

  // header sort handler
  const toggleSort = (key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setSortDir("asc");
      return key;
    });
  };

  // Build a "striped" array so identical consecutive statuses alternate (pale / darker).
  const striped = React.useMemo(() => {
    let last: ReturnStatus | null = null;
    let toggle = false;
    return sorted.map((r) => {
      if (r.status === last) {
        toggle = !toggle;      // flip when same status continues
      } else {
        toggle = false;        // reset when status changes
        last = r.status;
      }
      return { row: r, stripe: toggle };
    });
  }, [sorted]);

  return (
    <div className={cn("min-h-[100svh]", isDark ? "bg-[#050507]" : "bg-white")}>
      {/* emerald halos, subtle */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none opacity-25">
          <div className="absolute -top-10 right-20 w-96 h-96 rounded-full blur-3xl bg-emerald-400" />
          <div className="absolute bottom-0 left-1/3 w-[28rem] h-[28rem] rounded-full blur-[100px] bg-emerald-700/50" />
        </div>
      )}

      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-7 relative z-10">
        {/* Header card (emerald accent) */}
        <div
          className={cn(
            "rounded-3xl border backdrop-blur-2xl relative overflow-hidden",
            isDark ? "border-white/15" : "border-slate-200"
          )}
          style={{
            background: isDark
              ? "linear-gradient(135deg, rgba(15,16,19,0.92) 0%, rgba(15,16,19,0.78) 60%, rgba(16,185,129,0.08) 100%)"
              : "linear-gradient(135deg, rgba(236,253,245,0.65) 0%, rgba(255,255,255,0.92) 100%)",
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-[420px] h-[420px] rounded-full blur-3xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.20))",
            }}
          />
          <div className="px-6 py-6 relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <h1 className={cn("font-bold tracking-tight", "text-2xl md:text-[28px]")}>
                  <span className={isDark ? "text-white" : "text-slate-900"}>
                    Gestion des retours
                  </span>
                  <span className="text-emerald-500">.</span>
                </h1>
                <p className={cn("mt-1 text-[13px]", isDark ? "text-slate-400" : "text-slate-500")}>
                  Recherchez, filtrez et inspectez les retours produits.
                </p>
              </div>

              <button
                className={cn(
                  "relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  "border",
                  isDark
                    ? "border-white/20 text-white hover:border-white/30"
                    : "border-slate-300 text-slate-800 hover:border-slate-400"
                )}
                style={{
                  background:
                    "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.10))",
                  boxShadow: isDark
                    ? "0 8px 30px rgba(16,185,129,0.15)"
                    : "0 8px 30px rgba(16,185,129,0.10)",
                }}
                onClick={() => alert("Nouveau retour (à brancher)")}
              >
                <Plus className="h-4 w-4" />
                Nouveau retour
              </button>
            </div>

            {/* Search + filters */}
            <div className="mt-4 flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-slate-400" : "text-slate-400")} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher par code, client, expert, commande…"
                  className={cn(
                    "w-full pl-11 pr-4 py-2.5 rounded-xl text-sm outline-none transition",
                    "border",
                    isDark
                      ? "bg-[#0c0d11]/80 border-white/15 text-white placeholder:text-slate-500 focus:border-emerald-400/40"
                      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-400"
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={cause}
                  onChange={(e) => setCause(e.target.value as Cause | "all")}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-sm outline-none border transition",
                    isDark
                      ? "bg-[#0c0d11] border-white/15 text-white focus:border-emerald-400/40"
                      : "bg-white border-slate-200 text-slate-900 focus:border-emerald-400"
                  )}
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
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-sm outline-none border transition",
                    isDark
                      ? "bg-[#0c0d11] border-white/15 text-white focus:border-emerald-400/40"
                      : "bg-white border-slate-200 text-slate-900 focus:border-emerald-400"
                  )}
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
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-sm outline-none border transition",
                    isDark
                      ? "bg-[#0c0d11] border-white/15 text-white focus:border-emerald-400/40"
                      : "bg-white border-slate-200 text-slate-900 focus:border-emerald-400"
                  )}
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-sm outline-none border transition",
                    isDark
                      ? "bg-[#0c0d11] border-white/15 text-white focus:border-emerald-400/40"
                      : "bg-white border-slate-200 text-slate-900 focus:border-emerald-400"
                  )}
                />
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className={cn(
                    "lg:hidden inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition",
                    isDark
                      ? "bg-[#0c0d11] border-white/15 text-white"
                      : "bg-white border-slate-200 text-slate-800"
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Plus {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => alert("Exporter (à brancher)")}
                  className={cn(
                    "hidden lg:inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition",
                    isDark
                      ? "bg-[#0c0d11] border-white/15 text-white hover:border-white/25"
                      : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                  )}
                >
                  <Download className="h-4 w-4" />
                  Exporter
                </button>
                <button
                  onClick={onReset}
                  className={cn(
                    "hidden lg:inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition",
                    isDark
                      ? "bg-[#0c0d11] border-white/15 text-white hover:border-white/25"
                      : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                  )}
                >
                  <RotateCcw className="h-4 w-4" />
                  Réinitialiser
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-4 grid grid-cols-12 gap-3">
              <Metric
                className="col-span-12 sm:col-span-4"
                title="Total retours"
                value={stats.total}
                icon={<Package className="h-4 w-4" />}
                isDark={isDark}
              />
              <Metric
                className="col-span-12 sm:col-span-4"
                title="En attente"
                value={stats.awaiting}
                icon={<Clock className="h-4 w-4" />}
                isDark={isDark}
              />
              <Metric
                className="col-span-12 sm:col-span-4"
                title="Brouillons"
                value={stats.draft}
                icon={<FileText className="h-4 w-4" />}
                isDark={isDark}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 relative">
          <div
            className={cn(
              "rounded-2xl border overflow-hidden shadow-sm",
              isDark ? "border-white/15 bg-neutral-950/70" : "border-slate-200 bg-white"
            )}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead
                  className={cn(
                    "text-[11px] uppercase tracking-wider",
                    isDark
                      ? "bg-neutral-950/80 text-slate-400"
                      : "bg-slate-50 text-slate-500"
                  )}
                >
                  <tr className={cn(isDark ? "border-b border-white/10" : "border-b border-slate-200")}>
                    <SortTh label="Code" active={sortKey === "id"} dir={sortDir} onClick={() => toggleSort("id")} />
                    <SortTh label="Date" active={sortKey === "reportedAt"} dir={sortDir} onClick={() => toggleSort("reportedAt")} />
                    <SortTh label="Signalé par" active={sortKey === "reporter"} dir={sortDir} onClick={() => toggleSort("reporter")} />
                    <SortTh label="Cause" active={sortKey === "cause"} dir={sortDir} onClick={() => toggleSort("cause")} />
                    <SortTh label="Client / Expert" active={sortKey === "client"} dir={sortDir} onClick={() => toggleSort("client")} />
                    <SortTh label="No commande" active={sortKey === "noCommande"} dir={sortDir} onClick={() => toggleSort("noCommande")} />
                    <SortTh label="Tracking" active={sortKey === "tracking"} dir={sortDir} onClick={() => toggleSort("tracking")} />
                    <SortTh label="P.J." active={sortKey === "attachments"} dir={sortDir} onClick={() => toggleSort("attachments")} />
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={cn(isDark ? "divide-y divide-white/8" : "divide-y divide-slate-100")}>
                  {sorted.map((row) => {
                    const hasFiles = (row.attachments?.length ?? 0) > 0;
                    const s = STATUS_TEXT[row.status];
                    return (
                      <tr
                        key={row.id}
                        onMouseEnter={() => setHovered(row.id)}
                        onMouseLeave={() => setHovered(null)}
                        className={cn("relative transition-all duration-200", row.standby && "opacity-60")}
                        style={rowStyle(row.status, stripe)}
                      >
                        <td className={cn("px-5 py-4 font-semibold", s.text)}>
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-1.5 h-6 rounded-full",
                                row.status === "draft" && "bg-slate-300",
                                row.status === "awaiting_physical" && "bg-white/80",
                                row.status === "received_or_no_physical" && "bg-white/80"
                              )}
                            />
                            <span className="font-mono">{row.id}</span>
                          </div>
                        </td>
                        <td className={cn("px-5 py-4", s.text)}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 opacity-70" />
                            {new Date(row.reportedAt).toLocaleDateString("fr-CA")}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <Pill tone="slate">{REPORTER_LABEL[row.reporter]}</Pill>
                        </td>
                        <td className="px-5 py-4">
                          <Pill tone="green">{CAUSE_LABEL[row.cause]}</Pill>
                        </td>
                        <td className={cn("px-5 py-4", s.text)}>
                          <div>
                            <div className="font-medium">{row.client}</div>
                            <div className={cn("text-[11px] opacity-80")}>{row.expert}</div>
                          </div>
                        </td>
                        <td className={cn("px-5 py-4", s.text)}>{row.noCommande ?? "—"}</td>
                        <td className={cn("px-5 py-4", s.text)}>{row.tracking ?? "—"}</td>
                        <td className={cn("px-5 py-4", s.text)}>
                          {hasFiles ? (
                            <div className="inline-flex items-center gap-1.5">
                              <Folder className="h-4 w-4 opacity-80" />
                              <span className="text-xs font-medium">{row.attachments!.length}</span>
                            </div>
                          ) : (
                            <span className={cn("text-xs", isDark ? "text-slate-300" : "text-slate-500")}>—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div
                            className={cn(
                              "flex items-center justify-end gap-1 transition-opacity",
                              hovered === row.id ? "opacity-100" : "opacity-0"
                            )}
                          >
                            <button
                              onClick={() => setOpenId(row.id)}
                              className={cn(
                                "p-2 rounded-lg",
                                row.status === "draft"
                                  ? isDark
                                    ? "hover:bg-white/10 text-slate-300"
                                    : "hover:bg-slate-100 text-slate-700"
                                  : "hover:bg-white/20 text-white"
                              )}
                              title="Consulter"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onToggleStandby(row.id)}
                              className={cn(
                                "p-2 rounded-lg",
                                row.status === "draft"
                                  ? isDark
                                    ? "hover:bg-white/10 text-amber-300"
                                    : "hover:bg-amber-50 text-amber-600"
                                  : "hover:bg-white/20 text-white"
                              )}
                              title={row.standby ? "Retirer du standby" : "Mettre en standby"}
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDelete(row.id)}
                              className={cn(
                                "p-2 rounded-lg",
                                row.status === "draft"
                                  ? isDark
                                    ? "hover:bg-red-500/10 text-red-400"
                                    : "hover:bg-red-50 text-red-600"
                                  : "hover:bg-white/20 text-white"
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

              {sorted.length === 0 && (
                <div className="py-16 text-center">
                  <Package className={cn("h-10 w-10 mx-auto mb-3", isDark ? "text-slate-600" : "text-slate-300")} />
                  <p className={cn(isDark ? "text-slate-400" : "text-slate-500", "text-sm")}>
                    Aucun retour ne correspond à vos filtres
                  </p>
                </div>
              )}
            </div>

            {/* Table footer */}
            <div
              className={cn(
                "px-5 py-2 flex items-center justify-between",
                isDark ? "border-t border-white/10 bg-neutral-950/60" : "border-t border-slate-200 bg-slate-50"
              )}
            >
              <span className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-500")}>
                {sorted.length} résultat{sorted.length > 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <StatusChip status="draft" />
                <StatusChip status="awaiting_physical" />
                <StatusChip status="received_or_no_physical" />
              </div>
            </div>
          </div>
        </div>

        {/* Detail modal */}
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
   Pieces
============================================================================= */
function Metric({
  title,
  value,
  icon,
  className,
  isDark,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  className?: string;
  isDark: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "rounded-2xl p-4 border backdrop-blur-xl",
          isDark ? "bg-neutral-950/70 border-white/15" : "bg-white border-slate-200"
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className={cn("text-[11px] uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-500")}>
              {title}
            </div>
            <div className={cn("mt-1 text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>
              {value}
            </div>
          </div>
          <div className="p-2 rounded-lg" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.12))" }}>
            <div className={cn(isDark ? "text-emerald-300" : "text-emerald-600")}>{icon}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: ReturnStatus }) {
  const s = STATUS_TEXT[status];
  const Icon = status === "draft" ? FileText : status === "awaiting_physical" ? Clock : CheckCircle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border",
        s.badge
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {s.label}
    </span>
  );
}

/** Sortable table header cell with arrows */
function SortTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th className="px-5 py-3 text-left">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider"
        title="Trier"
      >
        <span>{label}</span>
        {active ? (
          dir === "asc" ? (
            <ArrowUpNarrowWide className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownNarrowWide className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronUp className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  );
}

/* =============================================================================
   Detail modal (safe-area fixed, internal scroll)
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
  const hasFiles = (row.attachments?.length ?? 0) > 0;

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-8">
        <div className="w-full max-w-[min(100vw-64px,1100px)] overflow-hidden rounded-2xl border shadow-2xl bg-white dark:bg-neutral-900 border-slate-200 dark:border-white/15 mt-[max(24px,env(safe-area-inset-top))] mb-[max(24px,env(safe-area-inset-bottom))]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-50 to-white dark:from-neutral-900 dark:to-neutral-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-1.5 h-10 rounded-full",
                    row.status === "draft" && "bg-slate-400",
                    row.status === "awaiting_physical" && "bg-black",
                    row.status === "received_or_no_physical" && "bg-emerald-500"
                  )}
                />
                <div>
                  <h2 className="text-lg font-bold">
                    Retour {row.id} — {CAUSE_LABEL[row.cause]}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Signalé le {new Date(row.reportedAt).toLocaleDateString("fr-CA")} par{" "}
                    {REPORTER_LABEL[row.reporter]}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[calc(100vh-220px)] overflow-auto px-6 py-6 space-y-6">
            {row.createdBy && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white grid place-items-center font-medium">
                  {row.createdBy.name.charAt(0)}
                </div>
                <div className="text-sm">
                  <div className="font-medium">{row.createdBy.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(row.createdBy.at).toLocaleString("fr-CA")}
                  </div>
                </div>
              </div>
            )}

            {/* Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Expert" value={row.expert} onChange={(v) => onPatch({ expert: v })} />
              <Field label="Client" value={row.client} onChange={(v) => onPatch({ client: v })} />
              <Field label="No. client" value={row.noClient ?? ""} onChange={(v) => onPatch({ noClient: v || undefined })} />
              <Field label="No. commande" value={row.noCommande ?? ""} onChange={(v) => onPatch({ noCommande: v || undefined })} />
              <Field label="No. tracking" value={row.tracking ?? ""} onChange={(v) => onPatch({ tracking: v || undefined })} />
              <Field label="Transport" value={row.transport ?? ""} onChange={(v) => onPatch({ transport: v || null })} />
              <Field label="Montant" value={row.amount?.toString() ?? ""} onChange={(v) => onPatch({ amount: v ? Number(v) : null })} />
              <Field label="Date commande" type="date" value={row.dateCommande ?? ""} onChange={(v) => onPatch({ dateCommande: v || null })} />
              <Field
                label="Cause"
                as="select"
                value={row.cause}
                onChange={(v) => onPatch({ cause: v as Cause })}
                options={CAUSES_IN_ORDER.map((c) => ({ value: c, label: CAUSE_LABEL[c] }))}
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
                    <div key={a.id} className="rounded-lg border overflow-hidden border-slate-200 dark:border-white/10">
                      <div className="px-3 py-2 text-sm border-b bg-slate-50/60 dark:bg-neutral-900 dark:border-white/10">
                        {a.name}
                      </div>
                      <iframe title={a.name} src={a.url} className="w-full h-72" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">Aucune pièce jointe.</div>
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
                  onClick={onAddProduct}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm border-slate-200 dark:border-white/15 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter produit
                </button>
              </div>

              <div className="space-y-2">
                {(row.products ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr_110px_40px] gap-2 items-center p-3 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-white/10"
                  >
                    <input
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-white/10"
                      placeholder="Code de produit"
                      value={p.codeProduit}
                      onChange={(e) => onChangeProduct(p.id, { codeProduit: e.target.value })}
                    />
                    <input
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-white/10"
                      placeholder="Description du produit"
                      value={p.descriptionProduit}
                      onChange={(e) => onChangeProduct(p.id, { descriptionProduit: e.target.value })}
                    />
                    <input
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-white/10"
                      placeholder="Description du retour"
                      value={p.descriptionRetour ?? ""}
                      onChange={(e) => onChangeProduct(p.id, { descriptionRetour: e.target.value })}
                    />
                    <input
                      type="number"
                      min={0}
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-white/10"
                      placeholder="Quantité"
                      value={p.quantite}
                      onChange={(e) => onChangeProduct(p.id, { quantite: Number(e.target.value || 0) })}
                    />
                    <button
                      className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      onClick={() => onRemoveProduct(p.id)}
                      title="Retirer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {(row.products?.length ?? 0) === 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                    Aucun produit. Ajoutez des lignes à l'aide du bouton ci-haut.
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="font-semibold">Description</h4>
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-white/10"
                rows={4}
                placeholder="Notes internes, contexte, instructions…"
                value={row.description ?? ""}
                onChange={(e) => onPatch({ description: e.target.value })}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-neutral-950/70">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Les changements sont locaux (demo). Connecter au backend PostgreSQL plus tard.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onSaveDraft}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm border-slate-200 dark:border-white/15 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800"
                >
                  <Save className="h-4 w-4" />
                  Enregistrer brouillon
                </button>
                <button
                  onClick={onSendForApproval}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-black"
                  style={{ background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)" }}
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
   Small input component
============================================================================= */
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
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {as === "select" ? (
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-white/15 dark:text-white outline-none focus:border-emerald-400/50"
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
          className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-white/15 dark:text-white outline-none focus:border-emerald-400/50"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
