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
  UploadCloud,
  Sparkles,
  Truck,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachmentsSection } from "@/components/returns/AttachmentsSection";

// 👇 IMPORT TYPES (Assumes you created src/types/returns.ts)
import type { ReturnRow, Reporter, Cause, Attachment, ProductLine, ReturnStatus, ItemSuggestion } from "@/types/returns";

// Labels can stay local for UI display
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

  // -------------------------------------------------------------------------
  //  STRICT COLOR LOGIC (Premium Row Styles)
  // -------------------------------------------------------------------------
  const getRowClasses = (row: ReturnRow) => {
    const base = "shadow-sm hover:shadow-md transition-all duration-200 ease-out hover:scale-[1.005] cursor-pointer group border";

    // 1. Finalized -> Gray
    if (row.finalized) {
       return cn(base, "bg-gray-50/80 text-gray-500 border-gray-200/60 grayscale opacity-80 hover:opacity-100");
    }

    // 2. Draft -> WHITE
    if (row.isDraft || row.status === "draft") {
      return cn(base, "bg-white text-gray-900 border-gray-200/80 hover:border-gray-300");
    }

    // Explicit Cast
    const isPhysical = !!row.physicalReturn;
    const isVerified = !!row.verified;

    // 3. Physical & NOT Verified -> BLACK (Text White)
    if (isPhysical && !isVerified) {
      return cn(base, "bg-gray-950 text-white border-gray-800 shadow-xl shadow-black/20 hover:bg-black");
    }

    // 4. (Physical & Verified) OR (!Physical) -> BRIGHT YELLOW-GREEN
    if ((isPhysical && isVerified) || !isPhysical) {
      return cn(base, "bg-gradient-to-r from-[#84cc16] to-[#74b813] text-white border-[#65a30d]/30 shadow-md shadow-[#84cc16]/15 hover:to-[#65a30d]");
    }

    return cn(base, "bg-white text-gray-900 border-gray-200");
  };

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--bg-base))] pb-20">
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Card */}
        <div className="rounded-3xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))] shadow-sm overflow-hidden mb-8">
          <div className="px-8 py-6">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
                  Gestion des retours
                  <span className="text-[#84cc16] ml-1">.</span>
                </h1>
                <p className="mt-2 text-base text-[hsl(var(--text-secondary))] max-w-2xl">
                  Recherchez, filtrez et inspectez les retours produits.
                </p>
              </div>

              <button
                onClick={() => setOpenNew(true)}
                className={cn(
                  "inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-semibold",
                  "bg-[#84cc16] text-white shadow-lg shadow-[#84cc16]/20",
                  "hover:brightness-105 active:scale-[0.98]",
                  "transition-all duration-200"
                )}
              >
                <Plus className="h-5 w-5" />
                Nouveau retour
              </button>
            </div>

            {/* Filters */}
            <div className="mt-8 flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--text-muted))]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && load()}
                  placeholder="Rechercher..."
                  className={cn(
                    "w-full pl-12 pr-4 py-3 rounded-2xl text-sm font-medium",
                    "bg-[hsl(var(--bg-muted))] border border-transparent",
                    "text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]",
                    "focus:bg-[hsl(var(--bg-surface))] focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 focus:outline-none",
                    "transition-all duration-200"
                  )}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Selects styled as distinct pills */}
                {[
                  { val: cause, setter: setCause, opts: CAUSES_IN_ORDER.map(c => ({v: c, l: CAUSE_LABEL[c]})), all: "Toutes causes" },
                  { val: reporter, setter: setReporter, opts: (["expert", "transporteur", "autre", "client"]).map(r => ({v: r, l: REPORTER_LABEL[r] ?? r})), all: "Tous signaleurs" }
                ].map((filter, i) => (
                  <div key={i} className="relative">
                    <select
                      value={filter.val}
                      onChange={(e) => filter.setter(e.target.value as any)}
                      className={cn(
                        "appearance-none pl-4 pr-10 py-3 rounded-2xl text-sm font-medium cursor-pointer",
                        "bg-[hsl(var(--bg-elevated))] border border-[hsl(var(--border-default))]",
                        "text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:border-[hsl(var(--border-strong))]",
                        "focus:outline-none focus:ring-2 focus:ring-[#84cc16]/20 transition-all duration-200"
                      )}
                    >
                      <option value="all">{filter.all}</option>
                      {filter.opts.map((opt: any) => (
                        <option key={opt.v} value={opt.v}>{opt.l}</option>
                      ))}
                    </select>
                    <ChevronUp className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--text-tertiary))] pointer-events-none rotate-180" />
                  </div>
                ))}

                <button onClick={onReset} className="p-3 rounded-2xl bg-[hsl(var(--bg-elevated))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-muted))] transition-colors" title="Réinitialiser">
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <MetricCard title="Total retours" value={stats.total} icon={Package} />
              <MetricCard title="En attente" value={stats.awaiting} icon={Clock} />
              <MetricCard title="Brouillons" value={stats.draft} icon={FileText} />
            </div>
          </div>
        </div>

        {/* ======================= PREMIUM TABLE ======================= */}
        <div className="mt-8">
          {loading && (
            <div className="py-24 text-center">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-[hsl(var(--bg-surface))] shadow-lg border border-[hsl(var(--border-subtle))]">
                <Loader2 className="h-6 w-6 text-[#84cc16] animate-spin" />
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="w-full">
              {/* Custom Header Row - Detached & Grid Aligned */}
              <div className="grid grid-cols-[100px_140px_140px_160px_1fr_120px_160px_80px_120px] gap-4 px-6 py-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-tertiary))]">
                <SortTh label="Code" sortKey="id" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh label="Date" sortKey="reportedAt" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh label="Signalé par" sortKey="reporter" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh label="Cause" sortKey="cause" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh label="Client / Expert" sortKey="client" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh label="Commande" sortKey="noCommande" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh label="Tracking" sortKey="tracking" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <div className="text-center">P.J.</div>
                <div className="text-right">Actions</div>
              </div>

              {/* Rows as Cards */}
              <div className="space-y-3">
                {sorted.map((row) => {
                  const hasFiles = (row.attachments?.length ?? 0) > 0;
                  const rowClass = getRowClasses(row);

                  return (
                    <div
                      key={row.id}
                      onMouseEnter={() => setHovered(row.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => setOpenId(row.id)}
                      className={cn(
                        "relative grid grid-cols-[100px_140px_140px_160px_1fr_120px_160px_80px_120px] gap-4 items-center px-6 py-4 rounded-2xl text-sm font-medium",
                        rowClass
                      )}
                    >
                      {/* Code */}
                      <div className="font-mono text-base tracking-tight font-bold opacity-90">
                        {row.id}
                      </div>

                      {/* Date */}
                      <div className="opacity-80 flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 opacity-70" />
                        {new Date(row.reportedAt).toLocaleDateString("fr-CA")}
                      </div>

                      {/* Reporter */}
                      <div className="opacity-90 truncate">
                        {REPORTER_LABEL[row.reporter] ?? row.reporter}
                      </div>

                      {/* Cause */}
                      <div className="opacity-90 truncate">
                        {CAUSE_LABEL[row.cause] ?? row.cause}
                      </div>

                      {/* Client/Expert */}
                      <div className="min-w-0 pr-4">
                        <div className="truncate font-semibold text-[15px]">{row.client || "—"}</div>
                        <div className="text-xs opacity-60 truncate mt-0.5">{row.expert}</div>
                      </div>

                      {/* Commande */}
                      <div className="font-mono opacity-80 truncate">
                        {row.noCommande || "—"}
                      </div>

                      {/* Tracking */}
                      <div className="opacity-70 truncate text-xs">
                        {row.tracking || "—"}
                      </div>

                      {/* Attachments */}
                      <div className="flex justify-center">
                        {hasFiles ? (
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20">
                            <Paperclip className="h-4 w-4" />
                          </div>
                        ) : (
                          <span className="opacity-30">—</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleStandby(row.id); }}
                          className="p-2 rounded-full hover:bg-white/20 transition-colors"
                          title="Standby"
                        >
                          <Pause className="h-4 w-4 opacity-70 hover:opacity-100" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
                          className="p-2 rounded-full hover:bg-white/20 transition-colors text-red-100 hover:text-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 opacity-70 hover:opacity-100" />
                        </button>
                        <div className="ml-2">
                           <ChevronUp className="h-4 w-4 opacity-50 rotate-90" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {sorted.length === 0 && (
                  <div className="py-20 text-center rounded-3xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))]">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(var(--bg-muted))] mb-4">
                      <Search className="h-8 w-8 text-[hsl(var(--text-tertiary))]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--text-primary))]">Aucun résultat</h3>
                    <p className="text-[hsl(var(--text-secondary))]">Essayez de modifier vos filtres.</p>
                  </div>
                )}
              </div>

              {/* Table Footer / Pagination */}
              <div className="mt-6 flex items-center justify-between px-2 text-xs text-[hsl(var(--text-tertiary))] font-medium uppercase tracking-widest">
                <div>{sorted.length} RÉSULTATS</div>
              </div>
            </div>
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
   Detail Modal (Updated with PremiumField)
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

  // Use API creator data
  const creatorName = draft.createdBy?.name ?? session?.user?.name ?? REPORTER_LABEL[draft.reporter];
  const creatorAvatar = draft.createdBy?.avatar ?? null;
  const creatorDate = draft.createdBy?.at ? new Date(draft.createdBy.at) : new Date(draft.reportedAt);

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
            <div className="p-4 rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))] space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--text-muted))]">Options de traitement</h4>
              <div className="flex flex-wrap items-center gap-6 border-b border-[hsl(var(--border-subtle))] pb-4">
                <Switch label="Retour physique de la marchandise" checked={isPhysical} onCheckedChange={(c) => setDraft({ ...draft, physicalReturn: c })} />
                {isPhysical && (
                  <button onClick={() => setDraft({ ...draft, verified: !isVerified })} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors", isVerified ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-white border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))]" )}>
                    <CheckCircle className="h-4 w-4" /> {isVerified ? "Vérifié (OK)" : "Marquer comme vérifié"}
                  </button>
                )}
                {(isVerified || !isPhysical) && !isDraft && (
                   <button onClick={() => setDraft({ ...draft, finalized: !isFinalized })} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors", isFinalized ? "bg-gray-100 text-gray-800 border-gray-200" : "bg-white border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))]" )}>
                    <Archive className="h-4 w-4" /> {isFinalized ? "Finalisé (Archivé)" : "Finaliser le retour"}
                   </button>
                )}
              </div>
              <div className="text-sm font-medium pb-2">
                {isPhysical && !isVerified && <span className="text-red-500 flex items-center gap-2"><AlertCircle className="h-4 w-4"/> En attente de vérification physique (Ligne noire)</span>}
                {((isPhysical && isVerified) || !isPhysical) && !isFinalized && <span className="text-emerald-600 flex items-center gap-2"><Check className="h-4 w-4"/> Dossier actif (Ligne verte)</span>}
                {isFinalized && <span className="text-gray-500 flex items-center gap-2"><Archive className="h-4 w-4"/> Dossier clos (Archivé)</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  <div className="space-y-3 p-3 bg-[hsl(var(--bg-surface))] rounded-lg border border-[hsl(var(--border-subtle))]">
                     <Switch label="Pickup" checked={!!draft.isPickup} onCheckedChange={(c) => setDraft({ ...draft, isPickup: c })} />
                     <input disabled={!draft.isPickup} value={draft.noBill ?? ""} onChange={(e) => setDraft({ ...draft, noBill: e.target.value })} className="w-full text-xs p-2 rounded border disabled:opacity-50 disabled:bg-gray-100" placeholder="No. Bill / Bon de transport" />
                  </div>
                  <div className="space-y-3 p-3 bg-[hsl(var(--bg-surface))] rounded-lg border border-[hsl(var(--border-subtle))]">
                     <Switch label="Commande" checked={!!draft.isCommande} onCheckedChange={(c) => setDraft({ ...draft, isCommande: c })} />
                     <input disabled={!draft.isCommande} value={draft.noBonCommande ?? ""} onChange={(e) => setDraft({ ...draft, noBonCommande: e.target.value })} className="w-full text-xs p-2 rounded border disabled:opacity-50 disabled:bg-gray-100" placeholder="No. Bon de commande" />
                  </div>
                  <div className="space-y-3 p-3 bg-[hsl(var(--bg-surface))] rounded-lg border border-[hsl(var(--border-subtle))]">
                     <Switch label="Réclamation" checked={!!draft.isReclamation} onCheckedChange={(c) => setDraft({ ...draft, isReclamation: c })} />
                     <input disabled={!draft.isReclamation} value={draft.noReclamation ?? ""} onChange={(e) => setDraft({ ...draft, noReclamation: e.target.value })} className="w-full text-xs p-2 rounded border disabled:opacity-50 disabled:bg-gray-100" placeholder="No. Réclamation" />
                  </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))]">
              <Avatar className="h-9 w-9">
                <AvatarImage src={creatorAvatar ?? ""} alt={creatorName} />
                <AvatarFallback className="text-xs font-bold bg-accent text-[hsl(var(--bg-base))]">
                  {creatorName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium text-[hsl(var(--text-primary))]">{creatorName}</div>
                <div className="text-xs text-[hsl(var(--text-muted))]">
                  {creatorDate.toLocaleString("fr-CA")}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PremiumField label="Expert" value={draft.expert || ""} onChange={(v) => setDraft({ ...draft, expert: v })} />
              <PremiumField label="Client" value={draft.client || ""} onChange={(v) => setDraft({ ...draft, client: v })} />
              <PremiumField label="No. client" value={draft.noClient ?? ""} onChange={(v) => setDraft({ ...draft, noClient: v || undefined })} />
              <PremiumField label="No. commande" value={draft.noCommande ?? ""} onChange={(v) => setDraft({ ...draft, noCommande: v || undefined })} />
              <PremiumField label="No. tracking" value={draft.tracking ?? ""} onChange={(v) => setDraft({ ...draft, tracking: v || undefined })} />
              <PremiumField label="Transport" value={draft.transport ?? ""} onChange={(v) => setDraft({ ...draft, transport: v || null })} />
              <PremiumField label="Montant" value={draft.amount?.toString() ?? ""} onChange={(v) => setDraft({ ...draft, amount: v ? Number(v) : null })} />
              <PremiumField label="Date commande" type="date" value={draft.dateCommande ?? ""} onChange={(v) => setDraft({ ...draft, dateCommande: v || null })} />
              <PremiumField label="Cause" as="select" value={draft.cause} onChange={(v) => setDraft({ ...draft, cause: v as Cause })} options={CAUSES_IN_ORDER.map((c) => ({ value: c, label: CAUSE_LABEL[c] }))} />
            </div>

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

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2 text-[hsl(var(--text-primary))]">
                <Package className="h-4 w-4" /> Produits (RMA)
              </h4>
              <div className="space-y-2">
                {(draft.products ?? []).map((p, idx) => (
                  <ProductRowPremium
                    key={p.id}
                    product={p}
                    index={idx + 1}
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
                {(draft.products?.length ?? 0) === 0 && <div className="text-sm text-[hsl(var(--text-muted))] py-6 text-center">Aucun produit.</div>}
              </div>
            </div>

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
                <button onClick={() => { onPatched(draft); alert("Brouillon enregistré (local)."); }} className={cn("inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium", "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]", "hover:bg-[hsl(var(--bg-elevated))]")}>
                  <Save className="h-4 w-4" /> Enregistrer
                </button>
                <button onClick={() => { onPatched({ status: "received_or_no_physical" }); alert("Envoyé (local)."); }} className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold", "bg-[hsl(var(--success))] text-white", "hover:brightness-110")}>
                  <Send className="h-4 w-4" /> Envoyer pour approbation
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
   New Return Modal - Premium Redesign
============================================================================= */
function NewReturnModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const { data: session } = useSession();
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
  const [noBill, setNoBill] = React.useState("");
  const [noBonCommande, setNoBonCommande] = React.useState("");
  const [noReclamation, setNoReclamation] = React.useState("");
  const [products, setProducts] = React.useState<ProductLine[]>([]);
  const [nextId, setNextId] = React.useState<string>("...");
  const [reportedAt, setReportedAt] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [filesToUpload, setFilesToUpload] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [orderLookupLoading, setOrderLookupLoading] = React.useState(false);

  const currentUserName = session?.user?.name || "Utilisateur";
  const currentUserInitials = currentUserName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  React.useEffect(() => {
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
    if (!noCommande.trim()) return;
    setOrderLookupLoading(true);
    try {
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
    } finally {
      setOrderLookupLoading(false);
    }
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
          descriptionProduit: p.descriptionProduit?.trim() || "",
          descriptionRetour: p.descriptionRetour?.trim() || "",
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-[1200px] my-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] shadow-2xl shadow-black/50 overflow-hidden">
            {/* Header */}
            <div className="relative px-8 py-6 border-b border-white/10 bg-gradient-to-r from-white/[0.03] to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
                    <span className="font-mono text-lg font-bold text-white tracking-tight">
                      {nextId.replace('R', '')}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      Nouveau retour
                    </h2>
                    <p className="mt-0.5 text-sm text-white/50">
                      Créé par {currentUserName} • {new Date().toLocaleDateString("fr-CA")}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all duration-200 hover:scale-105">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="px-8 py-8 space-y-8">
                {/* Hero Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order Lookup */}
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-2xl opacity-75 blur group-hover:opacity-100 transition duration-300" />
                    <div className="relative p-6 rounded-2xl bg-[#1a1a1a] border border-white/10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-amber-500/20">
                          <Search className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-white">Recherche rapide</h3>
                          <p className="text-xs text-white/50">Entrez un numéro de commande pour auto-remplir</p>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={noCommande}
                          onChange={(e) => setNoCommande(e.target.value)}
                          onBlur={onFetchFromOrder}
                          onKeyDown={(e) => e.key === "Enter" && onFetchFromOrder()}
                          placeholder="No. commande (ex: 92427)"
                          className={cn(
                            "w-full px-5 py-4 rounded-xl text-lg font-mono font-semibold",
                            "bg-black/50 border-2 border-amber-500/50",
                            "text-white placeholder:text-white/30",
                            "focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20",
                            "transition-all duration-200"
                          )}
                        />
                        {orderLookupLoading && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-white/40 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5" />
                        Appuyez Enter ou cliquez ailleurs pour charger les données
                      </p>
                    </div>
                  </div>

                  {/* Physical Toggle */}
                  <div 
                    className={cn(
                      "relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer",
                      physicalReturn 
                        ? "bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/20" 
                        : "bg-white/[0.02] border-white/10 hover:border-white/20"
                    )}
                    onClick={() => setPhysicalReturn(!physicalReturn)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl transition-colors", physicalReturn ? "bg-emerald-500/20" : "bg-white/5")}>
                          <Package className={cn("h-6 w-6 transition-colors", physicalReturn ? "text-emerald-400" : "text-white/40")} />
                        </div>
                        <div>
                          <h3 className={cn("text-base font-semibold transition-colors", physicalReturn ? "text-emerald-400" : "text-white")}>
                            Retour physique de marchandise
                          </h3>
                          <p className="mt-1 text-sm text-white/50 max-w-[280px]">
                            {physicalReturn ? "Ce retour nécessite une vérification à la réception" : "Activez si le client retourne physiquement le produit"}
                          </p>
                        </div>
                      </div>
                      <button type="button" role="switch" aria-checked={physicalReturn} onClick={(e) => { e.stopPropagation(); setPhysicalReturn(!physicalReturn); }} className={cn("relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a]", physicalReturn ? "bg-emerald-500" : "bg-white/20")}>
                        <span className={cn("pointer-events-none block h-7 w-7 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200", physicalReturn ? "translate-x-6" : "translate-x-0")} />
                      </button>
                    </div>
                    {physicalReturn && (
                      <div className="mt-4 pt-4 border-t border-emerald-500/20">
                        <div className="flex items-center gap-2 text-sm text-emerald-400">
                          <AlertCircle className="h-4 w-4" />
                          <span>La ligne apparaîtra en <strong>noir</strong> jusqu'à vérification</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Form */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-white/5">
                      <FileText className="h-4 w-4 text-white/60" />
                    </div>
                    <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Informations du retour</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <PremiumField label="Date de signalement" type="date" value={reportedAt} onChange={setReportedAt} required icon={<Calendar className="h-4 w-4" />} />
                    <PremiumField label="Signalé par" as="select" value={reporter} onChange={(v) => setReporter(v as Reporter)} options={[{ value: "expert", label: "Expert" }, { value: "transporteur", label: "Transporteur" }, { value: "client", label: "Client" }, { value: "autre", label: "Autre" }]} required />
                    <PremiumField label="Cause" as="select" value={cause} onChange={(v) => setCause(v as Cause)} options={CAUSES_IN_ORDER.map((c) => ({ value: c, label: CAUSE_LABEL[c] }))} required />
                    <PremiumField label="No. client" value={noClient} onChange={setNoClient} placeholder="Ex: 12345" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                    <PremiumField label="Expert" value={expert} onChange={setExpert} required placeholder="Nom du représentant" highlight />
                    <PremiumField label="Client" value={client} onChange={setClient} required placeholder="Nom du client" highlight />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-5">
                    <PremiumField label="No. tracking" value={tracking} onChange={setTracking} placeholder="Ex: 1Z999..." icon={<Truck className="h-4 w-4" />} />
                    <PremiumField label="Transporteur" value={transport} onChange={setTransport} placeholder="Ex: Purolator" />
                    <PremiumField label="Montant" value={amount} onChange={setAmount} placeholder="0.00" icon={<DollarSign className="h-4 w-4" />} />
                    <PremiumField label="Date commande" type="date" value={dateCommande} onChange={setDateCommande} />
                  </div>
                </div>

                {/* Products */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10"><Package className="h-4 w-4 text-blue-400" /></div>
                      <div>
                        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Produits (RMA)</h3>
                        <p className="text-xs text-white/40 mt-0.5">{products.length} produit{products.length !== 1 ? "s" : ""} ajouté{products.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <button onClick={addProduct} className={cn("inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold", "bg-blue-500/10 text-blue-400 border border-blue-500/30", "hover:bg-blue-500/20 hover:border-blue-500/50", "transition-all duration-200")}>
                      <Plus className="h-4 w-4" /> Ajouter produit
                    </button>
                  </div>
                  {products.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-white/10 rounded-xl">
                      <Package className="h-10 w-10 mx-auto mb-3 text-white/20" />
                      <p className="text-sm text-white/40">Aucun produit ajouté</p>
                      <p className="text-xs text-white/30 mt-1">Cliquez sur "Ajouter produit" pour commencer</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {products.map((p, idx) => (
                        <ProductRowPremium key={p.id} product={p} index={idx + 1} onChange={(updatedProduct) => { const arr = products.slice(); arr[idx] = updatedProduct; setProducts(arr); }} onRemove={() => removeProduct(p.id)} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Attachments */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10"><Paperclip className="h-4 w-4 text-purple-400" /></div>
                      <div>
                        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Pièces jointes</h3>
                        <p className="text-xs text-white/40 mt-0.5">{filesToUpload.length} fichier{filesToUpload.length !== 1 ? "s" : ""} en attente</p>
                      </div>
                    </div>
                    <div className="relative">
                      <input type="file" id="new-return-upload" multiple className="hidden" onChange={(e) => { if (e.target.files) { setFilesToUpload(prev => [...prev, ...Array.from(e.target.files || [])]); e.target.value = ""; } }} />
                      <label htmlFor="new-return-upload" className={cn("cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold", "bg-purple-500/10 text-purple-400 border border-purple-500/30", "hover:bg-purple-500/20 hover:border-purple-500/50", "transition-all duration-200")}>
                        <UploadCloud className="h-4 w-4" /> Ajouter fichier
                      </label>
                    </div>
                  </div>
                  {filesToUpload.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-white/10 rounded-xl">
                      <UploadCloud className="h-8 w-8 mx-auto mb-2 text-white/20" />
                      <p className="text-sm text-white/40">Glissez vos fichiers ici ou cliquez pour parcourir</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filesToUpload.map((f, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-purple-500/10"><FileText className="h-4 w-4 text-purple-400" /></div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{f.name}</p>
                              <p className="text-xs text-white/40">{(f.size / 1024).toFixed(0)} KB</p>
                            </div>
                          </div>
                          <button onClick={() => setFilesToUpload(prev => prev.filter((_, idx) => idx !== i))} className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-white/5"><FileText className="h-4 w-4 text-white/60" /></div>
                    <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Notes & Description</h3>
                  </div>
                  <textarea className={cn("w-full px-4 py-3 rounded-xl text-sm", "bg-black/30 border border-white/10", "text-white placeholder:text-white/30", "focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10", "transition-all duration-200 resize-none")} rows={4} placeholder="Notes internes, contexte, instructions spéciales..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <OptionCard label="Pickup" description="Bon de transport requis" checked={isPickup} onCheckedChange={setIsPickup} inputValue={noBill} onInputChange={setNoBill} inputPlaceholder="No. Bill / Bon de transport" color="cyan" />
                  <OptionCard label="Commande" description="Lier à un bon de commande" checked={isCommande} onCheckedChange={setIsCommande} inputValue={noBonCommande} onInputChange={setNoBonCommande} inputPlaceholder="No. Bon de commande" color="indigo" />
                  <OptionCard label="Réclamation" description="Ouvrir une réclamation" checked={isReclamation} onCheckedChange={setIsReclamation} inputValue={noReclamation} onInputChange={setNoReclamation} inputPlaceholder="No. Réclamation" color="rose" />
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-white/10 bg-gradient-to-r from-white/[0.02] to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/20">
                    <span className="text-xs font-bold text-emerald-400">{currentUserInitials}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-white/40">Création par </span>
                    <span className="text-white/80 font-medium">{currentUserName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={onClose} className={cn("inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium", "bg-white/5 text-white/70 border border-white/10", "hover:bg-white/10 hover:text-white", "transition-all duration-200")}>
                    <X className="h-4 w-4" /> Annuler
                  </button>
                  <button disabled={busy} onClick={submit} className={cn("inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold", "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white", "hover:from-emerald-400 hover:to-emerald-500", "shadow-lg shadow-emerald-500/25", "transition-all duration-200 hover:scale-[1.02]", busy && "opacity-70 pointer-events-none")}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Créer le retour
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   Premium Field Component
============================================================================= */
function PremiumField({
  label,
  value,
  onChange,
  type = "text",
  as,
  options,
  placeholder,
  required,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  as?: "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <label className="block">
      <span className={cn(
        "text-xs font-semibold uppercase tracking-wider mb-2 block",
        required ? "text-white/70" : "text-white/50"
      )}>
        {label}
        {required && <span className="text-emerald-400 ml-1">*</span>}
      </span>
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
            {icon}
          </div>
        )}
        
        {as === "select" ? (
          <select
            className={cn(
              "w-full px-4 py-3 rounded-xl text-sm",
              "bg-black/30 border border-white/10",
              "text-white",
              "focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10",
              "transition-all duration-200",
              "appearance-none cursor-pointer",
              highlight && "border-emerald-500/30 bg-emerald-500/5"
            )}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            {options?.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#1a1a1a]">
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            className={cn(
              "w-full py-3 rounded-xl text-sm",
              icon ? "pl-10 pr-4" : "px-4",
              "bg-black/30 border border-white/10",
              "text-white placeholder:text-white/30",
              "focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10",
              "transition-all duration-200",
              highlight && "border-emerald-500/30 bg-emerald-500/5"
            )}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        )}
      </div>
    </label>
  );
}

/* =============================================================================
   Premium Product Row
============================================================================= */
function ProductRowPremium({
  product,
  index,
  onChange,
  onRemove
}: {
  product: ProductLine;
  index: number;
  onChange: (p: ProductLine) => void;
  onRemove: () => void;
}) {
  const [suggestions, setSuggestions] = React.useState<ItemSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const debouncedCode = useDebounced(product.codeProduit, 300);

  React.useEffect(() => {
    let active = true;
    const fetchSuggestions = async () => {
      if (!showSuggestions || debouncedCode.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setIsLoading(true);
      try {
        const results = await searchItems(debouncedCode);
        if (active) setSuggestions(results);
      } catch (error) {
        console.error("Autocomplete error:", error);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchSuggestions();
    return () => { active = false; };
  }, [debouncedCode, showSuggestions]);

  const selectSuggestion = (s: ItemSuggestion) => {
    onChange({
      ...product,
      codeProduit: s.code,
      descriptionProduit: s.descr || product.descriptionProduit
    });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="p-4 rounded-xl bg-black/20 border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex items-center gap-4">
        {/* Index Badge */}
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-bold shrink-0">
          {index}
        </div>
        
        {/* Fields Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[180px_1fr_1fr_80px] gap-3">
          {/* Code Produit with Autocomplete */}
          <div className="relative">
            <input
              className={cn(
                "w-full px-3 py-2.5 rounded-lg text-sm font-mono",
                "bg-black/30 border border-white/10",
                "text-white placeholder:text-white/30",
                "focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20",
                "transition-all duration-200"
              )}
              placeholder="Code produit"
              value={product.codeProduit}
              onChange={(e) => {
                onChange({ ...product, codeProduit: e.target.value });
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (product.codeProduit.length >= 2) setShowSuggestions(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              autoComplete="off"
            />
            
            {showSuggestions && (suggestions.length > 0 || isLoading) && (
              <div className="absolute z-50 top-full left-0 mt-1 w-[280px] max-h-48 overflow-y-auto rounded-lg border border-white/20 bg-[#1a1a1a] shadow-xl">
                {isLoading && suggestions.length === 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/50">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Recherche...
                  </div>
                )}
                {suggestions.map((s) => (
                  <button
                    key={s.code}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 border-b border-white/5 last:border-0 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      selectSuggestion(s);
                    }}
                  >
                    <div className="font-mono font-semibold text-white">{s.code}</div>
                    {s.descr && <div className="text-xs text-white/50 truncate">{s.descr}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description Produit */}
          <input
            className={cn(
              "w-full px-3 py-2.5 rounded-lg text-sm",
              "bg-black/30 border border-white/10",
              "text-white placeholder:text-white/30",
              "focus:outline-none focus:border-white/30",
              "transition-all duration-200"
            )}
            placeholder="Description produit"
            value={product.descriptionProduit || ""}
            onChange={(e) => onChange({ ...product, descriptionProduit: e.target.value })}
          />

          {/* Description Retour */}
          <input
            className={cn(
              "w-full px-3 py-2.5 rounded-lg text-sm",
              "bg-black/30 border border-white/10",
              "text-white placeholder:text-white/30",
              "focus:outline-none focus:border-white/30",
              "transition-all duration-200"
            )}
            placeholder="Raison du retour"
            value={product.descriptionRetour ?? ""}
            onChange={(e) => onChange({ ...product, descriptionRetour: e.target.value })}
          />

          {/* Quantité */}
          <input
            type="number"
            min={0}
            className={cn(
              "w-full px-3 py-2.5 rounded-lg text-sm text-center font-mono",
              "bg-black/30 border border-white/10",
              "text-white placeholder:text-white/30",
              "focus:outline-none focus:border-white/30",
              "transition-all duration-200"
            )}
            placeholder="Qté"
            value={product.quantite}
            onChange={(e) => onChange({ ...product, quantite: Number(e.target.value || 0) })}
          />
        </div>

        {/* Delete Button */}
        <button
          onClick={onRemove}
          className="p-2.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* =============================================================================
   Option Card Component
============================================================================= */
function OptionCard({
  label,
  description,
  checked,
  onCheckedChange,
  inputValue,
  onInputChange,
  inputPlaceholder,
  color,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
  inputValue: string;
  onInputChange: (v: string) => void;
  inputPlaceholder: string;
  color: "cyan" | "indigo" | "rose";
}) {
  const colorClasses = {
    cyan: {
      bg: checked ? "bg-cyan-500/10" : "bg-white/[0.02]",
      border: checked ? "border-cyan-500/50" : "border-white/10",
      icon: "text-cyan-400",
      iconBg: "bg-cyan-500/20",
      toggle: checked ? "bg-cyan-500" : "bg-white/20",
    },
    indigo: {
      bg: checked ? "bg-indigo-500/10" : "bg-white/[0.02]",
      border: checked ? "border-indigo-500/50" : "border-white/10",
      icon: "text-indigo-400",
      iconBg: "bg-indigo-500/20",
      toggle: checked ? "bg-indigo-500" : "bg-white/20",
    },
    rose: {
      bg: checked ? "bg-rose-500/10" : "bg-white/[0.02]",
      border: checked ? "border-rose-500/50" : "border-white/10",
      icon: "text-rose-400",
      iconBg: "bg-rose-500/20",
      toggle: checked ? "bg-rose-500" : "bg-white/20",
    },
  };

  const c = colorClasses[color];

  return (
    <div 
      className={cn(
        "p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer",
        c.bg,
        c.border,
        "hover:border-opacity-80"
      )}
      onClick={() => onCheckedChange(!checked)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", c.iconBg)}>
            <Check className={cn("h-4 w-4", c.icon)} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">{label}</h4>
            <p className="text-xs text-white/50">{description}</p>
          </div>
        </div>
        
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={(e) => {
            e.stopPropagation();
            onCheckedChange(!checked);
          }}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200",
            c.toggle
          )}
        >
          <span
            className={cn(
              "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 mt-0.5 ml-0.5",
              checked ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>
      
      <input 
        disabled={!checked}
        value={inputValue}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onInputChange(e.target.value)}
        className={cn(
          "w-full px-3 py-2.5 rounded-lg text-sm",
          "bg-black/30 border border-white/10",
          "text-white placeholder:text-white/30",
          "focus:outline-none focus:border-white/30",
          "transition-all duration-200",
          !checked && "opacity-40 cursor-not-allowed"
        )}
        placeholder={inputPlaceholder}
      />
    </div>
  );
}
