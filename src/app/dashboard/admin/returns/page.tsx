// src/app/dashboard/admin/returns/page.tsx
"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { cn } from "@/lib/utils";

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
   Status styling using design tokens
============================================================================= */
const STATUS_CONFIG: Record<
  ReturnStatus,
  { label: string; bgClass: string; textClass: string; borderClass: string; icon: React.ElementType }
> = {
  draft: {
    label: "Brouillon",
    bgClass: "bg-[hsl(var(--bg-muted))]",
    textClass: "text-[hsl(var(--text-secondary))]",
    borderClass: "border-[hsl(var(--border-default))]",
    icon: FileText,
  },
  awaiting_physical: {
    label: "En attente",
    bgClass: "bg-[hsl(var(--warning-muted))]",
    textClass: "text-[hsl(var(--warning))]",
    borderClass: "border-[hsl(var(--warning)/0.3)]",
    icon: Clock,
  },
  received_or_no_physical: {
    label: "Reçu",
    bgClass: "bg-[hsl(var(--success-muted))]",
    textClass: "text-[hsl(var(--success))]",
    borderClass: "border-[hsl(var(--success)/0.3)]",
    icon: CheckCircle,
  },
};

/* =============================================================================
   Fetch utils
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
  if (params.reporter && params.reporter !== "all") usp.set("reporter", params.reporter);
  if (params.dateFrom) usp.set("dateFrom", params.dateFrom);
  if (params.dateTo) usp.set("dateTo", params.dateTo);
  usp.set("take", String(params.take ?? 200));

  try {
    const res = await fetch(`/api/returns?${usp.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`API Error: ${res.status}`);
      return []; // Return empty array instead of crashing
    }

    const json = await res.json();
    
    // The critical fix: check for 'data' property and ensure it is an array
    if (json.ok && Array.isArray(json.data)) {
      return json.data as ReturnRow[];
    }
    
    console.warn("Invalid API response format", json);
    return [];
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
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

type OrderLookup = {
  sonbr: string | number;
  orderDate?: string | null;
  totalamt: number | null;
  customerName?: string | null;
  carrierName?: string | null;
  salesrepName?: string | null;
  tracking?: string | null;
  noClient?: string | null;
};

async function lookupOrder(noCommande: string): Promise<OrderLookup | null> {
  if (!noCommande.trim()) return null;
  const res = await fetch(
    `/api/prextra/order?no_commande=${encodeURIComponent(noCommande.trim())}`,
    { cache: "no-store", credentials: "include" }
  );
  if (!res.ok) return null;
  const json = await res.json();
  if (!json || json.exists === false) return null;

  const normalizedNoClient = json.noClient ?? json.custCode ?? json.CustCode ?? json.customerCode ?? null;

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

type ItemSuggestion = { code: string; descr?: string | null };

async function searchItems(q: string): Promise<ItemSuggestion[]> {
  if (!q.trim()) return [];
  const res = await fetch(`/api/items?q=${encodeURIComponent(q)}&take=10`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) return [];
  const json = await res.json();
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
type SortKey = "id" | "reportedAt" | "reporter" | "cause" | "client" | "noCommande" | "tracking" | "attachments";
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
  const selected = React.useMemo(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [query, cause, reporter, dateFrom, dateTo]);

  React.useEffect(() => {
    load();
  }, [load]);

  // sorting
  const sorted = React.useMemo(() => {
    const get = (r: ReturnRow) => {
      switch (sortKey) {
        case "id": return r.id;
        case "reportedAt": return r.reportedAt;
        case "reporter": return REPORTER_LABEL[r.reporter];
        case "cause": return CAUSE_LABEL[r.cause];
        case "client": return `${r.client} ${r.expert}`;
        case "noCommande": return r.noCommande ?? "";
        case "tracking": return r.tracking ?? "";
        case "attachments": return r.attachments?.length ?? 0;
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
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== code));
    try {
      await deleteReturn(code);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "La suppression a échoué";
      alert(message);
      setRows(prev);
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

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--bg-base))]">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
        {/* ─────────────────────────────────────────────────────────────────────
           Header Card
           ───────────────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))] overflow-hidden">
          <div className="px-6 py-5">
            {/* Title Row */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
                  Gestion des retours
                  <span className="text-[hsl(var(--accent))]">.</span>
                </h1>
                <p className="mt-1 text-sm text-[hsl(var(--text-tertiary))]">
                  Recherchez, filtrez et inspectez les retours produits.
                </p>
              </div>

              <button
                onClick={() => setOpenNew(true)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold",
                  "bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]",
                  "hover:brightness-110 active:scale-[0.98]",
                  "transition-all duration-150",
                  "shadow-sm shadow-[hsl(var(--accent)/0.25)]"
                )}
              >
                <Plus className="h-4 w-4" />
                Nouveau retour
              </button>
            </div>

            {/* Search + Filters */}
            <div className="mt-5 flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--text-muted))]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && load()}
                  placeholder="Rechercher par code, client, expert, commande…"
                  className={cn(
                    "w-full pl-11 pr-4 py-2.5 rounded-xl text-sm",
                    "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]",
                    "text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]",
                    "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-transparent",
                    "transition-all duration-200"
                  )}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={cause}
                  onChange={(e) => setCause(e.target.value as Cause | "all")}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-sm",
                    "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]",
                    "text-[hsl(var(--text-primary))]",
                    "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
                  )}
                >
                  <option value="all">Toutes les causes</option>
                  {CAUSES_IN_ORDER.map((c) => (
                    <option key={c} value={c}>{CAUSE_LABEL[c]}</option>
                  ))}
                </select>

                <select
                  value={reporter}
                  onChange={(e) => setReporter(e.target.value as Reporter | "all")}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-sm",
                    "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]",
                    "text-[hsl(var(--text-primary))]",
                    "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
                  )}
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
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-sm",
                    "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]",
                    "text-[hsl(var(--text-primary))]",
                    "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
                  )}
                />

                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-sm",
                    "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]",
                    "text-[hsl(var(--text-primary))]",
                    "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
                  )}
                />

                <button
                  onClick={() => load()}
                  className={cn(
                    "hidden lg:inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium",
                    "bg-[hsl(var(--bg-elevated))] border border-[hsl(var(--border-default))]",
                    "text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]",
                    "hover:bg-[hsl(var(--bg-muted))] transition-colors"
                  )}
                >
                  <Download className="h-4 w-4" />
                  Rafraîchir
                </button>

                <button
                  onClick={onReset}
                  className={cn(
                    "hidden lg:inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium",
                    "bg-[hsl(var(--bg-elevated))] border border-[hsl(var(--border-default))]",
                    "text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]",
                    "hover:bg-[hsl(var(--bg-muted))] transition-colors"
                  )}
                >
                  <RotateCcw className="h-4 w-4" />
                  Réinitialiser
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard title="Total retours" value={stats.total} icon={Package} />
              <MetricCard title="En attente" value={stats.awaiting} icon={Clock} />
              <MetricCard title="Brouillons" value={stats.draft} icon={FileText} />
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
           Table
           ───────────────────────────────────────────────────────────────────── */}
        <div className="mt-6 rounded-2xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))] overflow-hidden">
          {loading && (
            <div className="py-16 text-center">
              <div className="inline-flex items-center gap-3 text-sm text-[hsl(var(--text-tertiary))]">
                <div className="h-5 w-5 border-2 border-[hsl(var(--accent))] border-t-transparent rounded-full animate-spin" />
                Chargement des retours…
              </div>
            </div>
          )}

          {error && (
            <div className="py-16 text-center text-sm text-[hsl(var(--danger))]">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[hsl(var(--bg-muted))] border-b border-[hsl(var(--border-subtle))]">
                    <tr>
                      <SortTh label="Code" sortKey="id" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Date" sortKey="reportedAt" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Signalé par" sortKey="reporter" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Cause" sortKey="cause" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Client / Expert" sortKey="client" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="No commande" sortKey="noCommande" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Tracking" sortKey="tracking" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="P.J." sortKey="attachments" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[hsl(var(--border-subtle))]">
                    {sorted.map((row) => {
                      const hasFiles = (row.attachments?.length ?? 0) > 0;
                      const statusConfig = STATUS_CONFIG[row.status];
                      const StatusIcon = statusConfig.icon;

                      return (
                        <tr
                          key={row.id}
                          onMouseEnter={() => setHovered(row.id)}
                          onMouseLeave={() => setHovered(null)}
                          className={cn(
                            "transition-colors duration-150",
                            row.standby && "opacity-50",
                            hovered === row.id ? "bg-[hsl(var(--bg-elevated))]" : "bg-[hsl(var(--bg-surface))]"
                          )}
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-1.5 h-6 rounded-full", statusConfig.bgClass)} />
                              <span className="font-mono font-semibold text-[hsl(var(--text-primary))]">
                                {row.id}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-[hsl(var(--text-secondary))]">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 opacity-60" />
                              {new Date(row.reportedAt).toLocaleDateString("fr-CA")}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium",
                              "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))] border border-[hsl(var(--border-subtle))]"
                            )}>
                              {REPORTER_LABEL[row.reporter]}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium",
                              "bg-[hsl(var(--accent-muted))] text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.2)]"
                            )}>
                              {CAUSE_LABEL[row.cause]}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-[hsl(var(--text-primary))] font-medium">{row.client}</div>
                            <div className="text-[11px] text-[hsl(var(--text-muted))]">{row.expert}</div>
                          </td>
                          <td className="px-4 py-3.5 text-[hsl(var(--text-secondary))] font-mono">
                            {row.noCommande ?? "—"}
                          </td>
                          <td className="px-4 py-3.5 text-[hsl(var(--text-secondary))]">
                            {row.tracking ?? "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            {hasFiles ? (
                              <div className="inline-flex items-center gap-1.5 text-[hsl(var(--text-secondary))]">
                                <Folder className="h-4 w-4" />
                                <span className="text-xs font-medium">{row.attachments!.length}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-[hsl(var(--text-muted))]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className={cn(
                              "flex items-center justify-end gap-1 transition-opacity duration-150",
                              hovered === row.id ? "opacity-100" : "opacity-0"
                            )}>
                              <button
                                onClick={() => setOpenId(row.id)}
                                className="p-2 rounded-lg text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-muted))] transition-colors"
                                title="Consulter"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => onToggleStandby(row.id)}
                                className="p-2 rounded-lg text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning-muted))] transition-colors"
                                title={row.standby ? "Retirer du standby" : "Mettre en standby"}
                              >
                                <Pause className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => onDelete(row.id)}
                                className="p-2 rounded-lg text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))] transition-colors"
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
                    <Package className="h-12 w-12 mx-auto mb-3 text-[hsl(var(--text-muted))]" />
                    <p className="text-sm text-[hsl(var(--text-tertiary))]">
                      Aucun retour ne correspond à vos filtres
                    </p>
                  </div>
                )}
              </div>

              {/* Table Footer */}
              <div className="px-4 py-3 flex items-center justify-between border-t border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))]">
                <span className="text-xs text-[hsl(var(--text-muted))]">
                  {sorted.length} résultat{sorted.length > 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge status="draft" />
                  <StatusBadge status="awaiting_physical" />
                  <StatusBadge status="received_or_no_physical" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detail Modal */}
        {selected && (
          <DetailModal
            row={selected}
            onClose={() => setOpenId(null)}
            onPatched={(patch) =>
              setRows((prev) => prev.map((r) => (r.id === selected.id ? { ...r, ...patch } : r)))
            }
          />
        )}

        {/* New Return Modal */}
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
   Components
============================================================================= */
function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-elevated))] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[hsl(var(--text-muted))]">
            {title}
          </div>
          <div className="mt-1 text-2xl font-bold text-[hsl(var(--text-primary))] font-mono-data">
            {value}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-[hsl(var(--accent-muted))]">
          <Icon className="h-5 w-5 text-[hsl(var(--accent))]" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReturnStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border",
      config.bgClass, config.textClass, config.borderClass
    )}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function SortTh({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === currentKey;
  return (
    <th className="px-4 py-3 text-left">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold",
          active ? "text-[hsl(var(--text-primary))]" : "text-[hsl(var(--text-muted))]"
        )}
      >
        <span>{label}</span>
        {active ? (
          dir === "asc" ? <ArrowUpNarrowWide className="h-3.5 w-3.5" /> : <ArrowDownNarrowWide className="h-3.5 w-3.5" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  );
}

/* =============================================================================
   Detail Modal
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
  const { data: session } = useSession();
  const [draft, setDraft] = React.useState<ReturnRow>(row);
  React.useEffect(() => setDraft(row), [row]);

  const hasFiles = (draft.attachments?.length ?? 0) > 0;
  const creatorName = draft.createdBy?.name ?? session?.user?.name ?? REPORTER_LABEL[draft.reporter];

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-[1100px] rounded-2xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-2xl my-8">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-elevated))]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-1.5 h-10 rounded-full",
                  STATUS_CONFIG[draft.status].bgClass
                )} />
                <div>
                  <h2 className="text-lg font-bold text-[hsl(var(--text-primary))]">
                    Retour {draft.id} — {CAUSE_LABEL[draft.cause]}
                  </h2>
                  <p className="text-xs text-[hsl(var(--text-tertiary))]">
                    Signalé par {creatorName} — {new Date(draft.reportedAt).toLocaleDateString("fr-CA")}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))]">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-6 py-6 space-y-6">
            {/* Creator Info */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))]">
              <Avatar className="h-9 w-9">
                <AvatarImage src={session?.user?.image ?? ""} alt={creatorName} />
                <AvatarFallback className="text-xs font-bold bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]">
                  {creatorName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium text-[hsl(var(--text-primary))]">{creatorName}</div>
                <div className="text-xs text-[hsl(var(--text-muted))]">
                  {new Date(draft.createdBy?.at ?? draft.reportedAt).toLocaleString("fr-CA")}
                </div>
              </div>
            </div>

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
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-[hsl(var(--text-tertiary))]" />
                <h4 className="font-semibold text-[hsl(var(--text-primary))]">Fichiers joints</h4>
                <span className="text-xs text-[hsl(var(--text-muted))]">({draft.attachments?.length ?? 0})</span>
              </div>
              {hasFiles ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {draft.attachments!.map((a) => (
                    <div key={a.id} className="rounded-xl border border-[hsl(var(--border-subtle))] overflow-hidden">
                      <div className="px-3 py-2 text-sm border-b border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))]">{a.name}</div>
                      <iframe title={a.name} src={a.url} className="w-full h-72" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[hsl(var(--text-muted))]">Aucune pièce jointe.</div>
              )}
            </div>

            {/* Products */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2 text-[hsl(var(--text-primary))]">
                <Package className="h-4 w-4" />
                Produits (RMA)
              </h4>

              <div className="space-y-2">
                {(draft.products ?? []).map((p, idx) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-1 md:grid-cols-[200px_1fr_1fr_100px_40px] gap-2 items-center p-3 rounded-xl bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]"
                  >
                    <input
                      className="rounded-lg border border-[hsl(var(--border-subtle))] px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]"
                      placeholder="Code produit"
                      value={p.codeProduit}
                      onChange={(e) => {
                        const arr = (draft.products ?? []).slice();
                        arr[idx] = { ...arr[idx], codeProduit: e.target.value };
                        setDraft({ ...draft, products: arr });
                      }}
                    />
                    <input
                      className="rounded-lg border border-[hsl(var(--border-subtle))] px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]"
                      placeholder="Description produit"
                      value={p.descriptionProduit}
                      onChange={(e) => {
                        const arr = (draft.products ?? []).slice();
                        arr[idx] = { ...arr[idx], descriptionProduit: e.target.value };
                        setDraft({ ...draft, products: arr });
                      }}
                    />
                    <input
                      className="rounded-lg border border-[hsl(var(--border-subtle))] px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]"
                      placeholder="Description retour"
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
                      className="rounded-lg border border-[hsl(var(--border-subtle))] px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]"
                      placeholder="Qté"
                      value={p.quantite}
                      onChange={(e) => {
                        const arr = (draft.products ?? []).slice();
                        arr[idx] = { ...arr[idx], quantite: Number(e.target.value || 0) };
                        setDraft({ ...draft, products: arr });
                      }}
                    />
                    <button
                      className="p-2 rounded-lg text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))]"
                      onClick={() => {
                        const arr = (draft.products ?? []).filter((x) => x.id !== p.id);
                        setDraft({ ...draft, products: arr });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {(draft.products?.length ?? 0) === 0 && (
                  <div className="text-sm text-[hsl(var(--text-muted))] py-6 text-center">Aucun produit.</div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="font-semibold text-[hsl(var(--text-primary))]">Description</h4>
              <textarea
                className="w-full rounded-xl border border-[hsl(var(--border-subtle))] px-3 py-2 text-sm bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
                rows={4}
                placeholder="Notes internes, contexte, instructions…"
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))]">
            <div className="flex items-center justify-between">
              <div className="text-xs text-[hsl(var(--text-muted))]">Lecture/édition locale.</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onPatched(draft); alert("Brouillon enregistré (local)."); }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium",
                    "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]",
                    "hover:bg-[hsl(var(--bg-elevated))]"
                  )}
                >
                  <Save className="h-4 w-4" />
                  Enregistrer
                </button>
                <button
                  onClick={() => { onPatched({ status: "received_or_no_physical" }); alert("Envoyé (local)."); }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold",
                    "bg-[hsl(var(--success))] text-white",
                    "hover:brightness-110"
                  )}
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
   New Return Modal
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
    setProducts((p) => [...p, { id: `np-${Date.now()}`, codeProduit: "", descriptionProduit: "", descriptionRetour: "", quantite: 1 }]);

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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur à la création";
      alert(message);
    } finally {
      setBusy(false);
    }
  };

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[210]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-[1100px] rounded-2xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-2xl my-8">
          <div className="px-6 py-4 border-b border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-elevated))]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[hsl(var(--text-primary))]">Nouveau retour</h2>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))]">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field
                label="Signalé par"
                as="select"
                value={reporter}
                onChange={(v) => setReporter(v as Reporter)}
                options={[
                  { value: "expert", label: "Expert" },
                  { value: "transporteur", label: "Transporteur" },
                  { value: "autre", label: "Autre" },
                ]}
              />
              <Field
                label="Cause"
                as="select"
                value={cause}
                onChange={(v) => setCause(v as Cause)}
                options={CAUSES_IN_ORDER.map((c) => ({ value: c, label: CAUSE_LABEL[c] }))}
              />
              <Field label="Expert" value={expert} onChange={setExpert} />
              <Field label="Client" value={client} onChange={setClient} />
              <Field label="No. client" value={noClient} onChange={setNoClient} />
              <Field label="No. commande" value={noCommande} onChange={setNoCommande} onBlur={onFetchFromOrder} />
              <button
                onClick={onFetchFromOrder}
                className={cn(
                  "self-end h-[42px] rounded-xl border px-3 text-sm font-medium",
                  "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-secondary))]",
                  "hover:bg-[hsl(var(--bg-elevated))]"
                )}
              >
                Remplir depuis commande
              </button>
              <Field label="No. tracking" value={tracking} onChange={setTracking} />
              <Field label="Transport" value={transport} onChange={setTransport} />
              <Field label="Montant" value={amount} onChange={setAmount} />
              <Field label="Date commande" type="date" value={dateCommande} onChange={setDateCommande} />
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-[hsl(var(--text-primary))]">Produits</h4>
              <div className="space-y-2">
                {products.map((p, idx) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-1 md:grid-cols-[200px_1fr_1fr_100px_40px] gap-2 items-center p-3 rounded-xl bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]"
                  >
                    <input
                      className="rounded-lg border border-[hsl(var(--border-subtle))] px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]"
                      placeholder="Code produit"
                      value={p.codeProduit}
                      onChange={(e) => {
                        const arr = products.slice();
                        arr[idx] = { ...arr[idx], codeProduit: e.target.value };
                        setProducts(arr);
                      }}
                    />
                    <input
                      className="rounded-lg border border-[hsl(var(--border-subtle))] px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]"
                      placeholder="Description produit"
                      value={p.descriptionProduit}
                      onChange={(e) => {
                        const arr = products.slice();
                        arr[idx] = { ...arr[idx], descriptionProduit: e.target.value };
                        setProducts(arr);
                      }}
                    />
                    <input
                      className="rounded-lg border border-[hsl(var(--border-subtle))] px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]"
                      placeholder="Description retour"
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
                      className="rounded-lg border border-[hsl(var(--border-subtle))] px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]"
                      placeholder="Qté"
                      value={p.quantite}
                      onChange={(e) => {
                        const arr = products.slice();
                        arr[idx] = { ...arr[idx], quantite: Number(e.target.value || 0) };
                        setProducts(arr);
                      }}
                    />
                    <button
                      className="p-2 rounded-lg text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))]"
                      onClick={() => removeProduct(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className="text-sm text-[hsl(var(--text-muted))] py-6 text-center">
                    Aucun produit. Ajoutez des lignes ci-dessous.
                  </div>
                )}
              </div>
              <button
                onClick={addProduct}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium",
                  "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-secondary))]",
                  "hover:bg-[hsl(var(--bg-elevated))]"
                )}
              >
                <Plus className="h-4 w-4" />
                Ajouter produit
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-[hsl(var(--text-primary))]">Description</h4>
              <textarea
                className="w-full rounded-xl border border-[hsl(var(--border-subtle))] px-3 py-2 text-sm bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
                rows={4}
                placeholder="Notes internes, contexte, instructions…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))]">
            <div className="flex items-center justify-between">
              <div className="text-xs text-[hsl(var(--text-muted))]">
                Le code retour sera généré automatiquement.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium",
                    "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]",
                    "hover:bg-[hsl(var(--bg-elevated))]"
                  )}
                >
                  <X className="h-4 w-4" />
                  Annuler
                </button>
                <button
                  disabled={busy}
                  onClick={submit}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold",
                    "bg-[hsl(var(--success))] text-white",
                    "hover:brightness-110",
                    busy && "opacity-70 pointer-events-none"
                  )}
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

/* =============================================================================
   Field Component
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
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider">
        {label}
      </span>
      {as === "select" ? (
        <select
          className={cn(
            "rounded-xl border px-3 py-2.5 text-sm",
            "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-subtle))]",
            "text-[hsl(var(--text-primary))]",
            "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        >
          {options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-sm",
            "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-subtle))]",
            "text-[hsl(var(--text-primary))]",
            "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
          )}
          value={value}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
      )}
    </label>
  );
}
