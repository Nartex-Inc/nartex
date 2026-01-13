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
  Loader2,
  Check,
  Archive,
  AlertCircle,
  Paperclip,
  UploadCloud
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachmentsSection } from "@/components/returns/AttachmentsSection";

// 👇 IMPORT TYPES INSTEAD OF REDEFINING
import type { ReturnRow, Reporter, Cause, Attachment, ProductLine, ReturnStatus, ItemSuggestion } from "@/types/returns";

// NOTE: Re-defining labels is fine for frontend UI usage
const REPORTER_LABEL: Record<string, string> = {
  expert: "Expert",
  transporteur: "Transporteur",
  client: "Client",
  prise_commande: "Prise de commande",
  autre: "Autre",
};

const CAUSE_LABEL: Record<string, string> = {
  production: "Production",
  pompe: "Pompe",
  autre_cause: "Autre cause",
  exposition_sinto: "Exposition Sinto",
  transporteur: "Transporteur",
  expert: "Expert",
  expedition: "Expédition",
  analyse: "Analyse",
  defect: "Défectueux",
  surplus_inventaire: "Surplus d'inventaire",
  prise_commande: "Prise de commande",
  rappel: "Rappel",
  redirection: "Redirection",
  fournisseur: "Fournisseur",
  autre: "Autre",
};

const CAUSES_IN_ORDER: Cause[] = [
  "production",
  "transporteur",
  "pompe",
  "exposition_sinto",
  "expedition",
  "fournisseur",
  "expert",
  "autre_cause",
  "autre",
];

const STATUS_CONFIG: Record<
  ReturnStatus,
  { label: string; icon: React.ElementType }
> = {
  draft: { label: "Brouillon", icon: FileText },
  awaiting_physical: { label: "En attente", icon: Clock },
  received_or_no_physical: { label: "Reçu", icon: CheckCircle },
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

    if (!res.ok) return []; 

    const json = await res.json();
    if (json.ok && Array.isArray(json.data)) {
      return json.data as ReturnRow[];
    }
    return [];
  } catch (error) {
    return [];
  }
}

async function createReturn(payload: any) {
  const res = await fetch(`/api/returns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error("Création échouée");
  return json.data; 
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

async function uploadAttachment(returnId: string, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("files", file);

  const res = await fetch(`/api/returns/${encodeURIComponent(returnId)}/attachments`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Upload failed");
  return json.attachments[0];
}

async function lookupOrder(noCommande: string): Promise<any | null> {
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

async function searchItems(q: string): Promise<ItemSuggestion[]> {
  if (!q.trim()) return [];
  const res = await fetch(`/api/items?q=${encodeURIComponent(q)}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.suggestions ?? []) as ItemSuggestion[];
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
   Switch Component
============================================================================= */
function Switch({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange: (c: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg-base))]",
          checked ? "bg-accent" : "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-default))]"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
      {label && <span className="text-sm font-medium text-[hsl(var(--text-primary))]">{label}</span>}
    </div>
  );
}

/* =============================================================================
   Page
============================================================================= */
type SortKey = "id" | "reportedAt" | "reporter" | "cause" | "client" | "noCommande" | "tracking" | "attachments";
type SortDir = "asc" | "desc";

export default function ReturnsPage() {
  const { resolvedTheme } = useTheme();

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

  const sorted = React.useMemo(() => {
    const validRows = rows.filter(r => {
      // Corrupted: both draft and finalized
      if (r.isDraft && r.finalized) return false; 
      return true;
    });

    const get = (r: ReturnRow) => {
      switch (sortKey) {
        case "id": return r.id;
        case "reportedAt": return r.reportedAt;
        case "reporter": return REPORTER_LABEL[r.reporter] || r.reporter; 
        case "cause": return CAUSE_LABEL[r.cause] || r.cause; 
        case "client": return `${r.client} ${r.expert}`;
        case "noCommande": return r.noCommande ?? "";
        case "tracking": return r.tracking ?? "";
        case "attachments": return r.attachments?.length ?? 0;
      }
    };
    const copy = [...validRows];
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

  const onToggleStandby = (id: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, standby: !r.standby } : r)));

  const onDelete = async (code: string) => {
    if (!confirm(`Supprimer le retour ${code} ?`)) return;
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== code));
    try {
      await deleteReturn(code);
    } catch (e: unknown) {
      alert("La suppression a échoué");
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

  const getRowClasses = (row: ReturnRow) => {
    if (row.finalized) {
       return "bg-gray-100 text-gray-500 border-b border-gray-200 grayscale";
    }

    if (row.isDraft || row.status === "draft") {
      return "bg-white text-black border-b border-gray-200 hover:brightness-95";
    }

    const isPhysical = !!row.physicalReturn;
    const isVerified = !!row.verified;

    if (isPhysical && !isVerified) {
      return "bg-black text-white border-b border-gray-800 hover:bg-neutral-900";
    }

    if ((isPhysical && isVerified) || !isPhysical) {
      return "bg-[#84cc16] text-white border-b border-[#65a30d] hover:bg-[#65a30d]";
    }

    return "bg-white text-black border-b border-gray-200";
  };

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--bg-base))]">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Card */}
        <div className="rounded-2xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))] overflow-hidden">
          <div className="px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
                  Gestion des retours
                  <span className="text-accent">.</span>
                </h1>
                <p className="mt-1 text-sm text-[hsl(var(--text-tertiary))]">
                  Recherchez, filtrez et inspectez les retours produits.
                </p>
              </div>

              <button
                onClick={() => setOpenNew(true)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold",
                  "bg-accent text-[hsl(var(--bg-base))]",
                  "hover:brightness-110 active:scale-[0.98]",
                  "transition-all duration-150",
                  "shadow-sm shadow-accent/25"
                )}
              >
                <Plus className="h-4 w-4" />
                Nouveau retour
              </button>
            </div>

            {/* Filters */}
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
                    "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
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
                    "focus:outline-none focus:ring-2 focus:ring-accent"
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
                    "focus:outline-none focus:ring-2 focus:ring-accent"
                  )}
                >
                  <option value="all">Tous les signaleurs</option>
                  {(["expert", "transporteur", "autre", "client"] as string[]).map((r) => (
                    <option key={r} value={r}>{REPORTER_LABEL[r] ?? r}</option>
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
                    "focus:outline-none focus:ring-2 focus:ring-accent"
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
                    "focus:outline-none focus:ring-2 focus:ring-accent"
                  )}
                />

                <button onClick={() => load()} className="hidden lg:inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-[hsl(var(--bg-elevated))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-muted))] transition-colors">
                  <Download className="h-4 w-4" />
                  Rafraîchir
                </button>

                <button onClick={onReset} className="hidden lg:inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-[hsl(var(--bg-elevated))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-muted))] transition-colors">
                  <RotateCcw className="h-4 w-4" />
                  Réinitialiser
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard title="Total retours" value={stats.total} icon={Package} />
              <MetricCard title="En attente" value={stats.awaiting} icon={Clock} />
              <MetricCard title="Brouillons" value={stats.draft} icon={FileText} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 rounded-2xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))] overflow-hidden">
          {loading && (
            <div className="py-16 text-center">
              <div className="inline-flex items-center gap-3 text-sm text-[hsl(var(--text-tertiary))]">
                <div className="h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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
                  {/* HEADER: Always Accent Color */}
                  <thead className="!bg-accent !text-white border-b border-accent/20">
                    <tr>
                      <SortTh label="Code" sortKey="id" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Date" sortKey="reportedAt" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Signalé par" sortKey="reporter" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Cause" sortKey="cause" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Client / Expert" sortKey="client" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="No commande" sortKey="noCommande" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Tracking" sortKey="tracking" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="P.J." sortKey="attachments" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-white/80">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sorted.map((row) => {
                      const hasFiles = (row.attachments?.length ?? 0) > 0;
                      const rowClass = getRowClasses(row);

                      return (
                        <tr
                          key={row.id}
                          onMouseEnter={() => setHovered(row.id)}
                          onMouseLeave={() => setHovered(null)}
                          className={cn("transition-colors duration-150 h-[72px]", rowClass)}
                        >
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-mono font-semibold text-inherit">
                              {row.id}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-inherit/90 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 opacity-60" />
                              {new Date(row.reportedAt).toLocaleDateString("fr-CA")}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {REPORTER_LABEL[row.reporter] ?? row.reporter}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {CAUSE_LABEL[row.cause] ?? row.cause}
                          </td>
                          <td className="px-4 py-3.5 max-w-[250px]">
                            <div className="font-medium text-inherit truncate" title={row.client}>{row.client}</div>
                            <div className="text-[11px] text-inherit/70 truncate" title={row.expert}>{row.expert}</div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-inherit/90 whitespace-nowrap">
                            {row.noCommande ?? "—"}
                          </td>
                          <td className="px-4 py-3.5 text-inherit/90 whitespace-nowrap">
                            {row.tracking ?? "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            {hasFiles ? (
                              <div className="inline-flex items-center gap-1.5 text-inherit">
                                <Folder className="h-4 w-4" />
                                <span className="text-xs font-medium">{row.attachments!.length}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-inherit/50">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className={cn(
                              "flex items-center justify-end gap-1 transition-opacity duration-150",
                              hovered === row.id ? "opacity-100" : "opacity-0"
                            )}>
                              <button
                                onClick={() => setOpenId(row.id)}
                                className="p-2 rounded-lg transition-colors hover:bg-white/20 text-inherit"
                                title="Consulter"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => onToggleStandby(row.id)}
                                className="p-2 rounded-lg transition-colors hover:bg-white/20 text-inherit"
                                title={row.standby ? "Retirer du standby" : "Mettre en standby"}
                              >
                                <Pause className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => onDelete(row.id)}
                                className="p-2 rounded-lg transition-colors hover:bg-white/20 text-inherit"
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
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-white text-black text-xs border border-gray-200">Brouillon</span>
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-black text-white text-xs">Physique (Non vérifié)</span>
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#84cc16] text-white text-xs">Vérifié / Non Physique</span>
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

  const creatorName = draft.createdBy?.name ?? session?.user?.name ?? REPORTER_LABEL[draft.reporter];

  const isPhysical = !!draft.physicalReturn;
  const isVerified = !!draft.verified;
  const isFinalized = !!draft.finalized;
  const isDraft = !!draft.isDraft;

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
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[hsl(var(--bg-muted))]">
                  <span className="font-mono font-bold text-[hsl(var(--text-primary))]">
                    {draft.id.replace('R', '')}
                  </span>
                </div>
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
            
            {/* LOGIC TOGGLES */}
            <div className="p-4 rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))] space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--text-muted))]">Options de traitement</h4>
              
              {/* Top Row: Physical Return & Verification */}
              <div className="flex flex-wrap items-center gap-6 border-b border-[hsl(var(--border-subtle))] pb-4">
                <Switch 
                   label="Retour physique de la marchandise" 
                   checked={isPhysical} 
                   onCheckedChange={(c) => setDraft({ ...draft, physicalReturn: c })} 
                />
                
                {isPhysical && (
                  <button
                    onClick={() => setDraft({ ...draft, verified: !isVerified })}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      isVerified
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : "bg-white border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))]"
                    )}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isVerified ? "Vérifié (OK)" : "Marquer comme vérifié"}
                  </button>
                )}

                {(isVerified || !isPhysical) && !isDraft && (
                   <button
                    onClick={() => setDraft({ ...draft, finalized: !isFinalized })}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      isFinalized
                        ? "bg-gray-100 text-gray-800 border-gray-200"
                        : "bg-white border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))]"
                    )}
                   >
                    <Archive className="h-4 w-4" />
                    {isFinalized ? "Finalisé (Archivé)" : "Finaliser le retour"}
                   </button>
                )}
              </div>
              
              {/* Contextual Status Message */}
              <div className="text-sm font-medium pb-2">
                {isPhysical && !isVerified && <span className="text-red-500 flex items-center gap-2"><AlertCircle className="h-4 w-4"/> En attente de vérification physique (Ligne noire)</span>}
                {((isPhysical && isVerified) || !isPhysical) && !isFinalized && <span className="text-emerald-600 flex items-center gap-2"><Check className="h-4 w-4"/> Dossier actif (Ligne verte)</span>}
                {isFinalized && <span className="text-gray-500 flex items-center gap-2"><Archive className="h-4 w-4"/> Dossier clos (Archivé)</span>}
              </div>

              {/* Bottom Row: Admin Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  <div className="space-y-3 p-3 bg-[hsl(var(--bg-surface))] rounded-lg border border-[hsl(var(--border-subtle))]">
                     <Switch label="Pickup" checked={!!draft.isPickup} onCheckedChange={(c) => setDraft({ ...draft, isPickup: c })} />
                     <input 
                       disabled={!draft.isPickup} 
                       value={draft.noBill ?? ""} 
                       onChange={(e) => setDraft({ ...draft, noBill: e.target.value })}
                       className="w-full text-xs p-2 rounded border disabled:opacity-50 disabled:bg-gray-100"
                       placeholder="No. Bill / Bon de transport"
                     />
                  </div>

                  <div className="space-y-3 p-3 bg-[hsl(var(--bg-surface))] rounded-lg border border-[hsl(var(--border-subtle))]">
                     <Switch label="Commande" checked={!!draft.isCommande} onCheckedChange={(c) => setDraft({ ...draft, isCommande: c })} />
                     <input 
                       disabled={!draft.isCommande} 
                       value={draft.noBonCommande ?? ""} 
                       onChange={(e) => setDraft({ ...draft, noBonCommande: e.target.value })}
                       className="w-full text-xs p-2 rounded border disabled:opacity-50 disabled:bg-gray-100"
                       placeholder="No. Bon de commande"
                     />
                  </div>

                  <div className="space-y-3 p-3 bg-[hsl(var(--bg-surface))] rounded-lg border border-[hsl(var(--border-subtle))]">
                     <Switch label="Réclamation" checked={!!draft.isReclamation} onCheckedChange={(c) => setDraft({ ...draft, isReclamation: c })} />
                     <input 
                       disabled={!draft.isReclamation} 
                       value={draft.noReclamation ?? ""} 
                       onChange={(e) => setDraft({ ...draft, noReclamation: e.target.value })}
                       className="w-full text-xs p-2 rounded border disabled:opacity-50 disabled:bg-gray-100"
                       placeholder="No. Réclamation"
                     />
                  </div>
              </div>
            </div>

            {/* Creator Info */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))]">
              <Avatar className="h-9 w-9">
                <AvatarImage src={session?.user?.image ?? ""} alt={creatorName} />
                <AvatarFallback className="text-xs font-bold bg-accent text-[hsl(var(--bg-base))]">
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

            {/* Attachments Section */}
            <AttachmentsSection
              returnCode={draft.id}
              attachments={draft.attachments?.map(a => ({ id: a.id, name: a.name, url: a.url, downloadUrl: a.downloadUrl })) || []}
              onAttachmentsChange={(newAttachments) => {
                const typedAttachments = newAttachments as Attachment[]; 
                setDraft(prev => ({ ...prev, attachments: typedAttachments }));
                onPatched({ attachments: typedAttachments });
              }}
              readOnly={draft.finalized}
            />

            {/* Products */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2 text-[hsl(var(--text-primary))]">
                <Package className="h-4 w-4" /> Produits (RMA)
              </h4>

              <div className="space-y-2">
                {(draft.products ?? []).map((p, idx) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    onChange={(updatedProduct) => {
                      const arr = (draft.products ?? []).slice();
                      arr[idx] = updatedProduct;
                      setDraft({ ...draft, products: arr });
                    }}
                    onRemove={() => {
                      const arr = (draft.products ?? []).filter((x) => x.id !== p.id);
                      setDraft({ ...draft, products: arr });
                    }}
                  />
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
                className="w-full rounded-xl border border-[hsl(var(--border-subtle))] px-3 py-2 text-sm bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-accent"
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
  const [physicalReturn, setPhysicalReturn] = React.useState(false); 
  const [isPickup, setIsPickup] = React.useState(false);
  const [isCommande, setIsCommande] = React.useState(false);
  const [isReclamation, setIsReclamation] = React.useState(false);
  
  // New string fields for toggles
  const [noBill, setNoBill] = React.useState("");
  const [noBonCommande, setNoBonCommande] = React.useState("");
  const [noReclamation, setNoReclamation] = React.useState("");

  const [products, setProducts] = React.useState<ProductLine[]>([]);
  
  const [nextId, setNextId] = React.useState<string>("...");
  const [reportedAt, setReportedAt] = React.useState<string>(new Date().toISOString().slice(0, 10));

  const [filesToUpload, setFilesToUpload] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    // Fetch the next ID when the modal mounts
    const fetchNextId = async () => {
      try {
        const res = await fetch("/api/returns?mode=next_id");
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.nextId) {
            setNextId(`R${json.nextId}`);
          }
        }
      } catch (error) {
        console.error("Failed to fetch next ID", error);
      }
    };
    fetchNextId();
  }, []);

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
    if (!expert.trim() || !client.trim() || !reportedAt) {
      alert("Expert, client et date de signalement sont requis.");
      return;
    }
    setBusy(true);
    try {
      const createdReturn = await createReturn({
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
        
        physicalReturn, 
        isPickup,      
        isCommande,    
        isReclamation, 
        
        noBill: isPickup ? noBill : null,
        noBonCommande: isCommande ? noBonCommande : null,
        noReclamation: isReclamation ? noReclamation : null,

        reportedAt, 
        products: products.map((p) => ({
          codeProduit: p.codeProduit.trim(),
          descriptionProduit: p.descriptionProduit.trim(),
          descriptionRetour: p.descriptionRetour?.trim(),
          quantite: p.quantite,
        })),
      });

      if (filesToUpload.length > 0 && createdReturn?.codeRetour) {
        for (const file of filesToUpload) {
          await uploadAttachment(String(createdReturn.codeRetour), file);
        }
      }

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
            
            {/* Top Row: Physical & No Commande */}
            <div className="p-4 rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))] flex items-center justify-between gap-6">
               <div className="flex-1">
                 <Switch 
                   label="Retour physique de la marchandise"
                   checked={physicalReturn}
                   onCheckedChange={setPhysicalReturn}
                 />
                 {physicalReturn && <p className="mt-2 text-xs text-[hsl(var(--text-muted))]">Ce retour apparaîtra en évidence (ligne noire) jusqu'à sa réception.</p>}
               </div>
               
               <div className="w-full sm:max-w-[300px]">
                 <Field 
                   label="No. commande" 
                   value={noCommande} 
                   onChange={setNoCommande} 
                   onBlur={onFetchFromOrder} 
                   placeholder="Ex: 92427"
                 />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field
                label="Code de retour"
                value={nextId}
                onChange={() => {}} 
                readOnly
                className="bg-[hsl(var(--bg-muted))/50] text-[hsl(var(--text-secondary))] font-mono"
              />
              <Field 
                label="Date de signalement" 
                type="date" 
                value={reportedAt} 
                onChange={setReportedAt} 
                required
              />
              <Field
                label="Signalé par"
                as="select"
                value={reporter}
                onChange={(v) => setReporter(v as Reporter)}
                options={[
                  { value: "expert", label: "Expert" },
                  { value: "transporteur", label: "Transporteur" },
                  { value: "client", label: "Client" },
                  { value: "autre", label: "Autre" },
                ]}
                required
              />
              <Field
                label="Cause"
                as="select"
                value={cause}
                onChange={(v) => setCause(v as Cause)}
                options={CAUSES_IN_ORDER.map((c) => ({ value: c, label: CAUSE_LABEL[c] }))}
                required
              />
              <Field label="Expert" value={expert} onChange={setExpert} required />
              <Field label="Client" value={client} onChange={setClient} required />
              <Field label="No. client" value={noClient} onChange={setNoClient} />
              
              <Field label="No. tracking" value={tracking} onChange={setTracking} />
              <Field label="Transport" value={transport} onChange={setTransport} />
              <Field label="Montant" value={amount} onChange={setAmount} />
              <Field label="Date commande" type="date" value={dateCommande} onChange={setDateCommande} />
            </div>

            {/* Attachments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-[hsl(var(--text-tertiary))]" />
                  <h4 className="font-semibold text-[hsl(var(--text-primary))]">Fichiers à joindre</h4>
                  <span className="text-xs text-[hsl(var(--text-muted))]">({filesToUpload.length})</span>
                </div>
                
                <div className="relative">
                  <input 
                    type="file" 
                    id="new-return-upload" 
                    multiple 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files) {
                        setFilesToUpload(prev => [...prev, ...Array.from(e.target.files || [])]);
                        e.target.value = ""; 
                      }
                    }}
                  />
                  <label 
                    htmlFor="new-return-upload"
                    className={cn(
                      "cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))]",
                      "hover:bg-[hsl(var(--bg-muted))]"
                    )}
                  >
                    <UploadCloud className="h-4 w-4" />
                    Ajouter un fichier
                  </label>
                </div>
              </div>
              
              {filesToUpload.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filesToUpload.map((f, i) => (
                    <div key={i} className="flex justify-between items-center px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))]">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="h-3.5 w-3.5 text-[hsl(var(--text-tertiary))]" />
                        <span className="truncate max-w-[200px]">{f.name}</span>
                        <span className="text-xs text-[hsl(var(--text-muted))]">({(f.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button 
                        onClick={() => setFilesToUpload(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-1 rounded-md text-[hsl(var(--text-muted))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[hsl(var(--text-muted))] text-center py-2 italic">
                  Les fichiers seront uploadés à la création du retour.
                </div>
              )}
            </div>

            {/* Products */}
            <div className="space-y-3">
              <h4 className="font-semibold text-[hsl(var(--text-primary))]">Produits</h4>
              <div className="space-y-2">
                {products.map((p, idx) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    onChange={(updatedProduct) => {
                      const arr = products.slice();
                      arr[idx] = updatedProduct;
                      setProducts(arr);
                    }}
                    onRemove={() => removeProduct(p.id)}
                  />
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

            {/* Description */}
            <div className="space-y-2">
              <h4 className="font-semibold text-[hsl(var(--text-primary))]">Description</h4>
              <textarea
                className="w-full rounded-xl border border-[hsl(var(--border-subtle))] px-3 py-2 text-sm bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-accent"
                rows={4}
                placeholder="Notes internes, contexte, instructions…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            {/* Bottom Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[hsl(var(--border-subtle))]">
                <div className="space-y-3 p-3 bg-[hsl(var(--bg-muted))] rounded-lg border border-[hsl(var(--border-subtle))]">
                   <Switch label="Pickup" checked={isPickup} onCheckedChange={setIsPickup} />
                   <input 
                     disabled={!isPickup} 
                     value={noBill} 
                     onChange={(e) => setNoBill(e.target.value)}
                     className="w-full text-xs p-2 rounded border disabled:opacity-50 disabled:bg-gray-100"
                     placeholder="No. Bill / Bon de transport"
                   />
                </div>

                <div className="space-y-3 p-3 bg-[hsl(var(--bg-muted))] rounded-lg border border-[hsl(var(--border-subtle))]">
                   <Switch label="Commande" checked={isCommande} onCheckedChange={setIsCommande} />
                   <input 
                     disabled={!isCommande} 
                     value={noBonCommande} 
                     onChange={(e) => setNoBonCommande(e.target.value)}
                     className="w-full text-xs p-2 rounded border disabled:opacity-50 disabled:bg-gray-100"
                     placeholder="No. Bon de commande"
                   />
                </div>

                <div className="space-y-3 p-3 bg-[hsl(var(--bg-muted))] rounded-lg border border-[hsl(var(--border-subtle))]">
                   <Switch label="Réclamation" checked={isReclamation} onCheckedChange={setIsReclamation} />
                   <input 
                     disabled={!isReclamation} 
                     value={noReclamation} 
                     onChange={(e) => setNoReclamation(e.target.value)}
                     className="w-full text-xs p-2 rounded border disabled:opacity-50 disabled:bg-gray-100"
                     placeholder="No. Réclamation"
                   />
                </div>
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
                  {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
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
  const [physicalReturn, setPhysicalReturn] = React.useState(false); 
  const [isPickup, setIsPickup] = React.useState(false);
  const [isCommande, setIsCommande] = React.useState(false);
  const [isReclamation, setIsReclamation] = React.useState(false);

  const [products, setProducts] = React.useState<ProductLine[]>([]);
  
  const [nextId, setNextId] = React.useState<string>("...");
  const [reportedAt, setReportedAt] = React.useState<string>(new Date().toISOString().slice(0, 10));

  const [filesToUpload, setFilesToUpload] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    // Fetch the next ID when the modal mounts
    const fetchNextId = async () => {
      try {
        const res = await fetch("/api/returns?mode=next_id");
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.nextId) {
            setNextId(`R${json.nextId}`);
          }
        }
      } catch (error) {
        console.error("Failed to fetch next ID", error);
      }
    };
    fetchNextId();
  }, []);

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
    if (!expert.trim() || !client.trim() || !reportedAt) {
      alert("Expert, client et date de signalement sont requis.");
      return;
    }
    setBusy(true);
    try {
      // 1. Create the return
      const createdReturn = await createReturn({
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
        physicalReturn, // Pass new field
        isPickup,      
        isCommande,    
        isReclamation, 
        reportedAt, // Pass editable date
        products: products.map((p) => ({
          codeProduit: p.codeProduit.trim(),
          descriptionProduit: p.descriptionProduit.trim(),
          descriptionRetour: p.descriptionRetour?.trim(),
          quantite: p.quantite,
        })),
      });

      // 2. Upload files if any, linking them to the new return ID
      if (filesToUpload.length > 0 && createdReturn?.codeRetour) {
        for (const file of filesToUpload) {
          await uploadAttachment(String(createdReturn.codeRetour), file);
        }
      }

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
            
            {/* Options block */}
            <div className="p-4 rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))] flex flex-col sm:flex-row gap-6">
               <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4">
                 <Switch 
                   label="Retour physique"
                   checked={physicalReturn}
                   onCheckedChange={setPhysicalReturn}
                 />
                 <Switch 
                   label="Pickup"
                   checked={isPickup}
                   onCheckedChange={setIsPickup}
                 />
                 <Switch 
                   label="Commande"
                   checked={isCommande}
                   onCheckedChange={setIsCommande}
                 />
                 <Switch 
                   label="Réclamation"
                   checked={isReclamation}
                   onCheckedChange={setIsReclamation}
                 />
                 {physicalReturn && <p className="col-span-2 mt-2 text-xs text-[hsl(var(--text-muted))]">Ce retour apparaîtra en évidence (ligne noire) jusqu'à sa réception.</p>}
               </div>
               
               <div className="w-full sm:max-w-[300px]">
                 <Field 
                   label="No. commande" 
                   value={noCommande} 
                   onChange={setNoCommande} 
                   onBlur={onFetchFromOrder} 
                   placeholder="Ex: 92427"
                 />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field
                label="Code de retour"
                value={nextId}
                onChange={() => {}} // No-op
                readOnly
                className="bg-[hsl(var(--bg-muted))/50] text-[hsl(var(--text-secondary))] font-mono"
              />
              <Field 
                label="Date de signalement" 
                type="date" 
                value={reportedAt} 
                onChange={setReportedAt} 
                required
              />
              <Field
                label="Signalé par"
                as="select"
                value={reporter}
                onChange={(v) => setReporter(v as Reporter)}
                options={[
                  { value: "expert", label: "Expert" },
                  { value: "transporteur", label: "Transporteur" },
                  { value: "client", label: "Client" },
                  { value: "autre", label: "Autre" },
                ]}
                required
              />
              <Field
                label="Cause"
                as="select"
                value={cause}
                onChange={(v) => setCause(v as Cause)}
                options={CAUSES_IN_ORDER.map((c) => ({ value: c, label: CAUSE_LABEL[c] }))}
                required
              />
              <Field label="Expert" value={expert} onChange={setExpert} required />
              <Field label="Client" value={client} onChange={setClient} required />
              <Field label="No. client" value={noClient} onChange={setNoClient} />
              
              <Field label="No. tracking" value={tracking} onChange={setTracking} />
              <Field label="Transport" value={transport} onChange={setTransport} />
              <Field label="Montant" value={amount} onChange={setAmount} />
              <Field label="Date commande" type="date" value={dateCommande} onChange={setDateCommande} />
            </div>

            {/* Attachments (Queue) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-[hsl(var(--text-tertiary))]" />
                  <h4 className="font-semibold text-[hsl(var(--text-primary))]">Fichiers à joindre</h4>
                  <span className="text-xs text-[hsl(var(--text-muted))]">({filesToUpload.length})</span>
                </div>
                
                <div className="relative">
                  <input 
                    type="file" 
                    id="new-return-upload" 
                    multiple 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files) {
                        setFilesToUpload(prev => [...prev, ...Array.from(e.target.files || [])]);
                        e.target.value = ""; // reset
                      }
                    }}
                  />
                  <label 
                    htmlFor="new-return-upload"
                    className={cn(
                      "cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))]",
                      "hover:bg-[hsl(var(--bg-muted))]"
                    )}
                  >
                    <UploadCloud className="h-4 w-4" />
                    Ajouter un fichier
                  </label>
                </div>
              </div>
              
              {filesToUpload.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filesToUpload.map((f, i) => (
                    <div key={i} className="flex justify-between items-center px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))]">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="h-3.5 w-3.5 text-[hsl(var(--text-tertiary))]" />
                        <span className="truncate max-w-[200px]">{f.name}</span>
                        <span className="text-xs text-[hsl(var(--text-muted))]">({(f.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button 
                        onClick={() => setFilesToUpload(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-1 rounded-md text-[hsl(var(--text-muted))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[hsl(var(--text-muted))] text-center py-2 italic">
                  Les fichiers seront uploadés à la création du retour.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-[hsl(var(--text-primary))]">Produits</h4>
              <div className="space-y-2">
                {products.map((p, idx) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    onChange={(updatedProduct) => {
                      const arr = products.slice();
                      arr[idx] = updatedProduct;
                      setProducts(arr);
                    }}
                    onRemove={() => removeProduct(p.id)}
                  />
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
                className="w-full rounded-xl border border-[hsl(var(--border-subtle))] px-3 py-2 text-sm bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-accent"
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
                  {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
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
  readOnly,
  className,
  placeholder,
  required
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  as?: "select";
  options?: { value: string; label: string }[];
  onBlur?: () => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {as === "select" ? (
        <select
          className={cn(
            "rounded-xl border px-3 py-2.5 text-sm",
            "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-subtle))]",
            "text-[hsl(var(--text-primary))]",
            "focus:outline-none focus:ring-2 focus:ring-accent",
            readOnly && "pointer-events-none opacity-80",
            required && "border-emerald-500/50",
            className
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={readOnly}
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
            "focus:outline-none focus:ring-2 focus:ring-accent",
            readOnly && "pointer-events-none opacity-80",
            required && "border-emerald-500/50",
            className
          )}
          value={value}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          autoComplete="off"
          placeholder={placeholder}
        />
      )}
    </label>
  );
}
