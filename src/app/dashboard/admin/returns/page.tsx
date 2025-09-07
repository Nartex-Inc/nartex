// src/app/dashboard/admin/returns/page.tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Search,
  Eye,
  Trash2,
  Pause,
  RotateCcw,
  Download,
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
  // optional weight info
  poidsUnitaire?: number | null;
  poidsTotal?: number | null;
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

const ROW_SHADES = {
  greenPrimary: "#22c55e",
  greenAlternate: "#16a34a",
  blackPrimary: "#000000",
  blackAlternate: "#0b0b0b",
  whitePrimary: "#ffffff",
  whiteAlternate: "#fafafa",
};

function rowStyle(
  status: ReturnStatus,
  stripe = false
): React.CSSProperties | undefined {
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
  const base = stripe ? ROW_SHADES.greenAlternate : ROW_SHADES.greenPrimary;
  return {
    backgroundColor: base,
    backgroundImage:
      "linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.10) 100%)",
  };
}

/* =============================================================================
   Fetch utils (simple, no SWR)
============================================================================= */
async function fetchReturns(params: {
  q?: string;
  cause?: string;
  reporter?: string;
  dateFrom?: string;
  dateTo?: string;
  take?: number;
}): Promise<ReturnRow[]> {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (params.cause && params.cause !== "all") usp.set("cause", params.cause);
  if (params.reporter && params.reporter !== "all")
    usp.set("reporter", params.reporter);
  if (params.dateFrom) usp.set("dateFrom", params.dateFrom);
  if (params.dateTo) usp.set("dateTo", params.dateTo);
  usp.set("take", String(params.take ?? 200));

  const res = await fetch(`/api/returns?${usp.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  const json = await res.json();
  if (!json.ok) throw new Error("Erreur de chargement des retours");
  return json.rows as ReturnRow[];
}

async function createReturn(payload: {
  reporter: Reporter;
  cause: Cause;
  expert: string;
  client: string;
  noClient?: string | null;
  noCommande?: string | null;
  tracking?: string | null;
  amount?: number | null;
  dateCommande?: string | null;
  transport?: string | null;
  description?: string | null;
  products?: {
    codeProduit: string;
    descriptionProduit: string;
    descriptionRetour?: string;
    quantite: number;
  }[];
}) {
  const res = await fetch(`/api/returns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error("Création échouée");
  return json.return;
}

type OrderLookup = {
  sonbr: string | number;
  orderDate?: string | null; // ISO
  totalamt: number | null;
  customerName?: string | null;
  carrierName?: string | null;
  salesrepName?: string | null;
  tracking?: string | null;
  noClient?: string | null;
};

async function deleteReturn(code: string): Promise<void> {
  const res = await fetch(`/api/returns/${encodeURIComponent(code)}`, {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "Suppression échouée");
  }
}

async function lookupOrder(noCommande: string): Promise<OrderLookup | null> {
  if (!noCommande.trim()) return null;
  const res = await fetch(
    `/api/prextra/order?no_commande=${encodeURIComponent(noCommande.trim())}`,
    { cache: "no-store", credentials: "include" }
  );
  if (!res.ok) return null;
  const json = await res.json();
  if (!json || json.exists === false) return null;

  // normalize + be permissive with key variants
  const normalizedNoClient =
    json.noClient ??
    json.custCode ??
    json.CustCode ??
    json.customerCode ??
    null;

  return {
    sonbr: json.sonbr ?? json.sonNbr ?? noCommande,
    orderDate: json.orderDate ?? json.OrderDate ?? null,
    totalamt: json.totalamt ?? json.totalAmt ?? null,
    customerName: json.customerName ?? json.CustomerName ?? null,
    carrierName: json.carrierName ?? json.CarrierName ?? null,
    salesrepName: json.salesrepName ?? json.SalesrepName ?? null,
    tracking: json.tracking ?? json.TrackingNumber ?? null,
    noClient: normalizedNoClient,
  };
}

type ItemSuggestion = {
  code: string;
  descr?: string | null;
};

async function searchItems(q: string): Promise<ItemSuggestion[]> {
  if (!q.trim()) return [];
  const res = await fetch(`/api/items?q=${encodeURIComponent(q)}&take=10`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) return [];
  const json = await res.json();
  // normalize
  return (json.items ?? []) as ItemSuggestion[];
}

async function getItem(code: string): Promise<{ code: string; descr?: string | null; weight?: number | null } | null> {
  if (!code.trim()) return null;
  const res = await fetch(`/api/items?code=${encodeURIComponent(code.trim())}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) return null;
  const json = await res.json();
  return (json.item as { code: string; descr?: string | null; weight?: number | null } | null) ?? null;
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
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

  // filters
  const [query, setQuery] = React.useState("");
  const [cause, setCause] = React.useState<"all" | Cause>("all");
  const [reporter, setReporter] = React.useState<"all" | Reporter>("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");

  // data
  const [rows, setRows] = React.useState<ReturnRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // selection
  const [openId, setOpenId] = React.useState<string | null>(null);
  const selected = React.useMemo(
    () => rows.find((r) => r.id === openId) ?? null,
    [rows, openId]
  );
  const [hovered, setHovered] = React.useState<string | null>(null);

  // sort
  const [sortKey, setSortKey] = React.useState<SortKey>("reportedAt");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  // new return modal
  const [openNew, setOpenNew] = React.useState(false);

  // load
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReturns({
        q: query,
        cause,
        reporter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        take: 200,
      });
      setRows(data);
    } catch (e: any) {
      setError(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }, [query, cause, reporter, dateFrom, dateTo]);

  React.useEffect(() => {
    load();
  }, [load]);

  // filtering already applied server-side, but we keep a light client sort
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
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      const sa = String(va ?? "");
      const sb = String(vb ?? "");
      const res = sa.localeCompare(sb, "fr", { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? res : -res;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const stats = React.useMemo(
    () => ({
      total: rows.length,
      draft: rows.filter((r) => r.status === "draft").length,
      awaiting: rows.filter((r) => r.status === "awaiting_physical").length,
      received: rows.filter((r) => r.status === "received_or_no_physical").length,
    }),
    [rows]
  );

  // actions
  const onToggleStandby = (id: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, standby: !r.standby } : r)));
  const onDelete = async (code: string) => {
    if (!confirm(`Supprimer le retour ${code} ?`)) return;
  
    const prev = rows; // keep for rollback
    setRows((r) => r.filter((x) => x.id !== code)); // optimistic remove
  
    try {
      await deleteReturn(code); // <- persist in DB
    } catch (e: any) {
      alert(e?.message || "La suppression a échoué. Restauration de la ligne.");
      setRows(prev); // rollback if API failed
    }
  };
  const onReset = () => {
    setQuery("");
    setCause("all");
    setReporter("all");
    setDateFrom("");
    setDateTo("");
  };
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

  // zebra by status
  const striped = React.useMemo(() => {
    let last: ReturnStatus | null = null;
    let toggle = false;
    return sorted.map((r) => {
      if (r.status === last) {
        toggle = !toggle;
      } else {
        toggle = false;
        last = r.status;
      }
      return { row: r, stripe: toggle };
    });
  }, [sorted]);

  return (
    <div className={cn("min-h-[100svh]", isDark ? "bg-[#050507]" : "bg-white")}>
      {isDark && (
        <div className="fixed inset-0 pointer-events-none opacity-25">
          <div className="absolute -top-10 right-20 w-96 h-96 rounded-full blur-3xl bg-emerald-400" />
          <div className="absolute bottom-0 left-1/3 w-[28rem] h-[28rem] rounded-full blur-[100px] bg-emerald-700/50" />
        </div>
      )}

      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-7 relative z-10">
        {/* Header */}
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
                onClick={() => setOpenNew(true)}
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
                  onKeyDown={(e) => e.key === "Enter" && load()}
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
                  onClick={() => setOpenNew(true)}
                  className={cn(
                    "lg:hidden inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition",
                    isDark
                      ? "bg-[#0c0d11] border-white/15 text-white"
                      : "bg-white border-slate-200 text-slate-800"
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Nouveau
                </button>
                <button
                  onClick={() => load()}
                  className={cn(
                    "hidden lg:inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition",
                    isDark
                      ? "bg-[#0c0d11] border-white/15 text-white hover:border-white/25"
                      : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                  )}
                >
                  <Download className="h-4 w-4" />
                  Rafraîchir
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
            {loading && (
              <div className="py-10 text-center text-sm">
                Chargement des retours…
              </div>
            )}
            {error && (
              <div className="py-10 text-center text-sm text-red-600">
                {error}
              </div>
            )}

            {!loading && !error && (
              <>
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
                      <tr
                        className={cn(
                          isDark ? "border-b border-white/10" : "border-b border-slate-200"
                        )}
                      >
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
                      {striped.map(({ row, stripe }) => {
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
                              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-slate-200 text-slate-700 border-slate-300 dark:bg-white/10 dark:text-slate-100 dark:border-white/20">
                                {REPORTER_LABEL[row.reporter]}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/20">
                                {CAUSE_LABEL[row.cause]}
                              </span>
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
                              <div className={cn("flex items-center justify-end gap-1 transition-opacity", hovered === row.id ? "opacity-100" : "opacity-0")}>
                                <button
                                  onClick={() => setOpenId(row.id)}
                                  className={cn("p-2 rounded-lg", row.status === "draft" ? (isDark ? "hover:bg-white/10 text-slate-300" : "hover:bg-slate-100 text-slate-700") : "hover:bg-white/20 text-white")}
                                  title="Consulter"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => onToggleStandby(row.id)}
                                  className={cn("p-2 rounded-lg", row.status === "draft" ? (isDark ? "hover:bg-white/10 text-amber-300" : "hover:bg-amber-50 text-amber-600") : "hover:bg-white/20 text-white")}
                                  title={row.standby ? "Retirer du standby" : "Mettre en standby"}
                                >
                                  <Pause className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => onDelete(row.id)}
                                  className={cn("p-2 rounded-lg", row.status === "draft" ? (isDark ? "hover:bg-red-500/10 text-red-400" : "hover:bg-red-50 text-red-600") : "hover:bg-white/20 text-white")}
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
                <div className={cn("px-5 py-2 flex items-center justify-between", isDark ? "border-t border-white/10 bg-neutral-950/60" : "border-t border-slate-200 bg-slate-50")}>
                  <span className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-500")}>
                    {sorted.length} résultat{sorted.length > 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusChip status="draft" />
                    <StatusChip status="awaiting_physical" />
                    <StatusChip status="received_or_no_physical" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Detail modal (read-only editing demo) */}
        {selected && (
          <DetailModal
            row={selected}
            onClose={() => setOpenId(null)}
            onPatched={(patch) =>
              setRows((prev) =>
                prev.map((r) => (r.id === selected.id ? { ...r, ...patch } : r))
              )
            }
          />
        )}

        {/* New return modal */}
        {openNew && (
          <NewReturnModal
            onClose={() => setOpenNew(false)}
            onCreated={async () => {
              setOpenNew(false);
              await load();
            }}
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
      <div className={cn("rounded-2xl p-4 border backdrop-blur-xl", isDark ? "bg-neutral-950/70 border-white/15" : "bg-white border-slate-200")}>
        <div className="flex items-center justify-between">
          <div>
            <div className={cn("text-[11px] uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-500")}>{title}</div>
            <div className={cn("mt-1 text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>{value}</div>
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
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border", s.badge)}>
      <Icon className="h-3.5 w-3.5" />
      {s.label}
    </span>
  );
}

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
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider" title="Trier">
        <span>{label}</span>
        {active ? (dir === "asc" ? <ArrowUpNarrowWide className="h-3.5 w-3.5" /> : <ArrowDownNarrowWide className="h-3.5 w-3.5" />) : <ChevronUp className="h-3.5 w-3.5 opacity-40" />}
      </button>
    </th>
  );
}

/* =============================================================================
   Detail modal (read/edit locally)
============================================================================= */
function DetailModal({
  row,
  onClose,
  onPatched,
}: {
  row: ReturnRow;
  onClose: () => void;
  onPatched: (patch: Partial<ReturnRow>) => void;
}) {
  const [draft, setDraft] = React.useState<ReturnRow>(row);
  React.useEffect(() => setDraft(row), [row]);

  const hasFiles = (draft.attachments?.length ?? 0) > 0;

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
                    draft.status === "draft" && "bg-slate-400",
                    draft.status === "awaiting_physical" && "bg-black",
                    draft.status === "received_or_no_physical" && "bg-emerald-500"
                  )}
                />
                <div>
                  <h2 className="text-lg font-bold">
                    Retour {draft.id} — {CAUSE_LABEL[draft.cause]}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Signalé le {new Date(draft.reportedAt).toLocaleDateString("fr-CA")} par {REPORTER_LABEL[draft.reporter]}
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
            {draft.createdBy && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white grid place-items-center font-medium">
                  {draft.createdBy.name.charAt(0)}
                </div>
                <div className="text-sm">
                  <div className="font-medium">{draft.createdBy.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(draft.createdBy.at).toLocaleString("fr-CA")}
                  </div>
                </div>
              </div>
            )}

            {/* Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Expert" value={draft.expert} onChange={(v) => setDraft({ ...draft, expert: v })} />
              <Field label="Client" value={draft.client} onChange={(v) => setDraft({ ...draft, client: v })} />
              <Field label="No. client" value={draft.noClient ?? ""} onChange={(v) => setDraft({ ...draft, noClient: v || undefined })} />
              <Field label="No. commande" value={draft.noCommande ?? ""} onChange={(v) => setDraft({ ...draft, noCommande: v || undefined })} />
              <Field label="No. tracking" value={draft.tracking ?? ""} onChange={(v) => setDraft({ ...draft, tracking: v || undefined })} />
              <Field label="Transport" value={draft.transport ?? ""} onChange={(v) => setDraft({ ...draft, transport: v || null })} />
              <Field label="Montant" value={draft.amount?.toString() ?? ""} onChange={(v) => setDraft({ ...draft, amount: v ? Number(v) : null })} />
              <Field label="Date commande" type="date" value={draft.dateCommande ?? ""} onChange={(v) => setDraft({ ...draft, dateCommande: v || null })} />
              <Field
                label="Cause"
                as="select"
                value={draft.cause}
                onChange={(v) => setDraft({ ...draft, cause: v as Cause })}
                options={CAUSES_IN_ORDER.map((c) => ({ value: c, label: CAUSE_LABEL[c] }))}
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                <h4 className="font-semibold">Fichiers joints</h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">({draft.attachments?.length ?? 0})</span>
              </div>
              {hasFiles ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {draft.attachments!.map((a) => (
                    <div key={a.id} className="rounded-lg border overflow-hidden border-slate-200 dark:border-white/10">
                      <div className="px-3 py-2 text-sm border-b bg-slate-50/60 dark:bg-neutral-900 dark:border-white/10">{a.name}</div>
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
              </div>

              <div className="space-y-2">
                {(draft.products ?? []).map((p, idx) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-1 md:grid-cols-[220px_1fr_1fr_110px_40px] gap-2 items-center p-3 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-white/10"
                  >
                    <ProductCodeField
                      value={p.codeProduit}
                      onSelect={(code, descr, weight) => {
                        const arr = (draft.products ?? []).slice();
                        const current = arr[idx] ?? p;
                        const unit = weight ?? current.poidsUnitaire ?? null;

                        arr[idx] = {
                          ...current,
                          codeProduit: code,
                          descriptionProduit: current.descriptionProduit || descr || "",
                          poidsUnitaire: unit,
                          poidsTotal: unit != null ? unit * (current.quantite || 0) : current.poidsTotal ?? null,
                        };

                        setDraft({ ...draft, products: arr });
                      }}
                      onChange={(code) => {
                        const arr = (draft.products ?? []).slice();
                        arr[idx] = { ...arr[idx], codeProduit: code };
                        setDraft({ ...draft, products: arr });
                      }}
                    />

                    <input
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-white/10"
                      placeholder="Description du produit"
                      value={p.descriptionProduit}
                      onChange={(e) => {
                        const arr = (draft.products ?? []).slice();
                        arr[idx] = { ...arr[idx], descriptionProduit: e.target.value };
                        setDraft({ ...draft, products: arr });
                      }}
                    />

                    <input
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-white/10"
                      placeholder="Description du retour"
                      value={p.descriptionRetour ?? ""}
                      onChange={(e) => {
                        const arr = (draft.products ?? []).slice();
                        arr[idx] = { ...arr[idx], descriptionRetour: e.target.value };
                        setDraft({ ...draft, products: arr });
                      }}
                    />

                    <input
                      type="number"
                      min={0}
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-white/10"
                      placeholder="Quantité"
                      value={p.quantite}
                      onChange={(e) => {
                        const qte = Number(e.target.value || 0);
                        const arr = (draft.products ?? []).slice();
                        const unit = arr[idx]?.poidsUnitaire ?? null;
                        arr[idx] = {
                          ...arr[idx],
                          quantite: qte,
                          poidsTotal: unit != null ? unit * qte : null,
                        };
                        setDraft({ ...draft, products: arr });
                      }}
                    />

                    <button
                      className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      onClick={() => {
                        const arr = (draft.products ?? []).filter((x) => x.id !== p.id);
                        setDraft({ ...draft, products: arr });
                      }}
                      title="Retirer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {(draft.products?.length ?? 0) === 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">Aucun produit.</div>
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
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-neutral-950/70">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400">Lecture/édition locale pour l’instant.</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onPatched(draft);
                    alert("Brouillon enregistré (local).");
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm border-slate-200 dark:border-white/15 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800"
                >
                  <Save className="h-4 w-4" />
                  Enregistrer
                </button>
                <button
                  onClick={() => {
                    onPatched({ status: "received_or_no_physical" });
                    alert("Envoyé pour approbation (local).");
                  }}
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
   New Return modal (real POST + order auto-fill + item autocomplete)
============================================================================= */
function NewReturnModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [reporter, setReporter] = React.useState<Reporter>("expert");
  const [cause, setCause] = React.useState<Cause>("production");
  const [expert, setExpert] = React.useState("");
  const [client, setClient] = React.useState("");
  const [noClient, setNoClient] = React.useState("");
  const [noCommande, setNoCommande] = React.useState("");
  const [tracking, setTracking] = React.useState("");
  const [transport, setTransport] = React.useState("");
  const [amount, setAmount] = React.useState<string>("");
  const [dateCommande, setDateCommande] = React.useState<string>("");
  const [description, setDescription] = React.useState("");
  const [products, setProducts] = React.useState<ProductLine[]>([]);
  const [busy, setBusy] = React.useState(false);

  const addProduct = () =>
    setProducts((p) => [
      ...p,
      { id: `np-${Date.now()}`, codeProduit: "", descriptionProduit: "", descriptionRetour: "", quantite: 1 },
    ]);
  const removeProduct = (pid: string) => setProducts((p) => p.filter((x) => x.id !== pid));

  const onFetchFromOrder = async () => {
    const data = await lookupOrder(noCommande);
    if (!data) return;
    if (data.customerName) setClient(data.customerName);
    if (data.salesrepName) setExpert(data.salesrepName);
    if (data.carrierName) setTransport(data.carrierName);
    if (data.tracking) setTracking(data.tracking);
    if (data.orderDate) setDateCommande(String(data.orderDate).slice(0, 10));
    if (data.totalamt != null) setAmount(String(data.totalamt));

    // Always set, and coerce to string (handles null/number/undefined safely)
    const customerCode = (data.noClient ?? "") as string | number;
    setNoClient(String(customerCode));
  };

  const submit = async () => {
    if (!expert.trim() || !client.trim()) {
      alert("Expert et client sont requis.");
      return;
    }
    setBusy(true);
    try {
      await createReturn({
        reporter,
        cause,
        expert: expert.trim(),
        client: client.trim(),
        noClient: noClient.trim() || null,
        noCommande: noCommande.trim() || null,
        tracking: tracking.trim() || null,
        amount: amount ? Number(amount) : null,
        dateCommande: dateCommande || null,
        transport: transport.trim() || null,
        description: description.trim() || null,
        products: products.map((p) => ({
          codeProduit: p.codeProduit.trim(),
          descriptionProduit: p.descriptionProduit.trim(),
          descriptionRetour: p.descriptionRetour?.trim(),
          quantite: p.quantite,
        })),
      });
      await onCreated();
    } catch (e: any) {
      alert(e?.message || "Erreur à la création");
    } finally {
      setBusy(false);
    }
  };

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[210]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-8">
        <div className="w-full max-w-[min(100vw-64px,1100px)] overflow-hidden rounded-2xl border shadow-2xl bg-white dark:bg-neutral-900 border-slate-200 dark:border-white/15 mt-[max(24px,env(safe-area-inset-top))] mb-[max(24px,env(safe-area-inset-bottom))]">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-50 to-white dark:from-neutral-900 dark:to-neutral-950">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Nouveau retour</h2>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-220px)] overflow-auto px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Signalé par" as="select" value={reporter} onChange={(v) => setReporter(v as Reporter)} options={[
                { value: "expert", label: "Expert" },
                { value: "transporteur", label: "Transporteur" },
                { value: "autre", label: "Autre" },
              ]} />
              <Field label="Cause" as="select" value={cause} onChange={(v) => setCause(v as Cause)} options={CAUSES_IN_ORDER.map((c) => ({ value: c, label: CAUSE_LABEL[c] }))} />
              <Field label="Expert" value={expert} onChange={setExpert} />
              <Field label="Client" value={client} onChange={setClient} />
              <Field label="No. client" value={noClient} onChange={setNoClient} />

              {/* No. commande: triggers auto-fill on blur */}
              <Field label="No. commande" value={noCommande} onChange={setNoCommande} onBlur={onFetchFromOrder} type="text" />

              {/* Manual button too */}
              <button
                onClick={onFetchFromOrder}
                className="self-end h-[38px] rounded-lg border px-3 text-sm border-slate-200 dark:border-white/15 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800"
                title="Autoremplir à partir du no_commande"
              >
                Remplir depuis commande
              </button>

              <Field label="No. tracking" value={tracking} onChange={setTracking} />
              <Field label="Transport" value={transport} onChange={setTransport} />
              <Field label="Montant" value={amount} onChange={setAmount} />
              <Field label="Date commande" type="date" value={dateCommande} onChange={setDateCommande} />
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Produits</h4>
              <div className="space-y-2">
                {products.map((p, idx) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-1 md:grid-cols-[220px_1fr_1fr_110px_40px] gap-2 items-center p-3 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-white/10"
                  >
                    <ProductCodeField
                      value={p.codeProduit}
                      onSelect={(code, descr, weight) => {
                        const arr = products.slice();
                        const current = arr[idx];
                        const unit = weight ?? current.poidsUnitaire ?? null;

                        arr[idx] = {
                          ...current,
                          codeProduit: code,
                          descriptionProduit: current.descriptionProduit || descr || "",
                          poidsUnitaire: unit,
                          poidsTotal: unit != null ? unit * (current.quantite || 0) : current.poidsTotal ?? null,
                        };

                        setProducts(arr);
                      }}
                      onChange={(code) => {
                        const arr = products.slice();
                        arr[idx] = { ...arr[idx], codeProduit: code };
                        setProducts(arr);
                      }}
                    />
                    <input
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-white/10"
                      placeholder="Description du produit"
                      value={p.descriptionProduit}
                      onChange={(e) => {
                        const arr = products.slice();
                        arr[idx] = { ...arr[idx], descriptionProduit: e.target.value };
                        setProducts(arr);
                      }}
                    />
                    <input
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-white/10"
                      placeholder="Description du retour"
                      value={p.descriptionRetour ?? ""}
                      onChange={(e) => {
                        const arr = products.slice();
                        arr[idx] = { ...arr[idx], descriptionRetour: e.target.value };
                        setProducts(arr);
                      }}
                    />
                    <input
                      type="number"
                      min={0}
                      className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-white/10"
                      placeholder="Quantité"
                      value={p.quantite}
                      onChange={(e) => {
                        const qte = Number(e.target.value || 0);
                        const arr = products.slice();
                        const unit = arr[idx]?.poidsUnitaire ?? null;
                        arr[idx] = {
                          ...arr[idx],
                          quantite: qte,
                          poidsTotal: unit != null ? unit * qte : arr[idx].poidsTotal ?? null,
                        };
                        setProducts(arr);
                      }}
                    />
                    <button
                      className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      onClick={() => removeProduct(p.id)}
                      title="Retirer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                    Aucun produit. Ajoutez des lignes ci-dessous.
                  </div>
                )}
              </div>
              <button
                onClick={addProduct}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm border-slate-200 dark:border-white/15 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800"
              >
                <Plus className="h-4 w-4" />
                Ajouter produit
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Description</h4>
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-white/10"
                rows={4}
                placeholder="Notes internes, contexte, instructions…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-neutral-950/70">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Le code retour sera généré automatiquement (R{idPlaceholder()}).
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm border-slate-200 dark:border-white/15 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800"
                >
                  <X className="h-4 w-4" />
                  Annuler
                </button>
                <button
                  disabled={busy}
                  onClick={submit}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-black",
                    busy && "opacity-70 pointer-events-none"
                  )}
                  style={{ background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)" }}
                >
                  <Send className="h-4 w-4" />
                  Créer le retour
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function idPlaceholder() {
  // purely cosmetic; server will assign
  return "xxxx";
}

/* =============================================================================
   Small input components
============================================================================= */
function Field({
  label,
  value,
  onChange,
  type = "text",
  as,
  options,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  as?: "select";
  options?: { value: string; label: string }[];
  onBlur?: () => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {as === "select" ? (
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-white/15 dark:text-white outline-none focus:border-emerald-400/50"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
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
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
      )}
    </label>
  );
}

/* =============================================================================
   Product code autocomplete field
============================================================================= */
function ProductCodeField({
  value,
  onChange,
  onSelect, // (code, descr?, weight?)
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (code: string, descr?: string | null, weight?: number | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState(value);
  const debounced = useDebounced(q, 250);
  const [items, setItems] = React.useState<ItemSuggestion[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setQ(value);
  }, [value]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!debounced.trim()) {
        setItems([]);
        return;
      }
      setLoading(true);
      const res = await searchItems(debounced);
      if (!alive) return;
      setItems(res);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [debounced]);

  const resolveExact = React.useCallback(async () => {
    const code = q.trim();
    if (!code) return;
    const item = await getItem(code);
    if (item) {
      onSelect(item.code, item.descr ?? null, item.weight ?? null);
    }
  }, [q, onSelect]);

  return (
    <div className="relative">
      <input
        className="w-full rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-900 dark:border-white/10"
        placeholder="Code de produit"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Let clicks on the dropdown register first
          setTimeout(() => setOpen(false), 150);
          // Try to resolve an exact code when the field loses focus
          resolveExact();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            resolveExact();
            setOpen(false);
          }
        }}
      />

      {open && (items.length > 0 || loading) && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white dark:bg-neutral-900 text-sm shadow-lg border-slate-200 dark:border-white/10 max-h-64 overflow-auto">
          {loading && <div className="px-3 py-2 text-slate-500">Recherche…</div>}
          {!loading &&
            items.map((it) => (
              <button
                key={it.code}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={async () => {
                  const exact = await getItem(it.code); // fetch full record (descr + weight)
                  onSelect(
                    it.code,
                    it.descr ?? exact?.descr ?? null,
                    exact?.weight ?? null
                  );
                  setQ(it.code);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/10"
                title={it.descr ?? ""}
              >
                <div className="font-mono">{it.code}</div>
                {it.descr && (
                  <div className="text-[11px] opacity-70 line-clamp-1">{it.descr}</div>
                )}
              </button>
            ))}
          {!loading && items.length === 0 && (
            <div className="px-3 py-2 text-slate-500">Aucun résultat</div>
          )}
        </div>
      )}
    </div>
  );
}
