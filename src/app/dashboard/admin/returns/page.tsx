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

// 👇 IMPORT TYPES 
import type { ReturnRow, Reporter, Cause, Attachment, ProductLine, ReturnStatus, ItemSuggestion } from "@/types/returns";

// =============================================================================
//   CONSTANTS & LABELS
// =============================================================================

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
  { label: string; icon: React.ElementType; color: string }
> = {
  draft: { label: "Brouillon", icon: FileText, color: "text-zinc-500" },
  awaiting_physical: { label: "En attente", icon: Clock, color: "text-amber-500" },
  received_or_no_physical: { label: "Reçu", icon: CheckCircle, color: "text-emerald-500" },
};

// =============================================================================
//   API UTILS
// =============================================================================

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

// =============================================================================
//   SHARED UI COMPONENTS
// =============================================================================

function Switch({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange: (c: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
          checked ? "bg-emerald-600" : "bg-zinc-200"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
      {label && <span className="text-sm font-medium text-zinc-700">{label}</span>}
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", className)}>
      {children}
    </span>
  );
}

// =============================================================================
//   MAIN PAGE COMPONENT
// =============================================================================

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
      // Safety check
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
  //  STRICT COLOR LOGIC (Refined for UI)
  // -------------------------------------------------------------------------
  const getRowStyles = (row: ReturnRow) => {
    if (row.finalized) {
       return "bg-zinc-50 text-zinc-400 border-zinc-100 grayscale-[0.8]";
    }

    if (row.isDraft || row.status === "draft") {
      return "bg-white text-zinc-900 hover:bg-zinc-50";
    }

    const isPhysical = !!row.physicalReturn;
    const isVerified = !!row.verified;

    // Physical & NOT Verified -> BLACK (Attention needed)
    if (isPhysical && !isVerified) {
      return "bg-zinc-900 text-zinc-50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 shadow-md transform scale-[1.002] z-10 my-0.5 rounded-lg";
    }

    // (Physical & Verified) OR (!Physical) -> GREEN (Good to go)
    if ((isPhysical && isVerified) || !isPhysical) {
      // Using a modern vibrant green background
      return "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-500 hover:border-emerald-600 shadow-md transform scale-[1.002] z-10 my-0.5 rounded-lg";
    }

    return "bg-white text-zinc-900";
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20 font-sans">
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              Retours <span className="text-emerald-600">.</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-500 max-w-lg">
              Gérez les demandes de retours, les réceptions physiques et les analyses d'experts en un seul endroit.
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex gap-4 mr-4">
                <div className="text-center">
                    <span className="block text-2xl font-bold text-zinc-900">{stats.total}</span>
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Total</span>
                </div>
                <div className="w-px h-10 bg-zinc-200"></div>
                <div className="text-center">
                    <span className="block text-2xl font-bold text-amber-500">{stats.awaiting}</span>
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">En attente</span>
                </div>
             </div>
            <button
              onClick={() => setOpenNew(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-zinc-900 text-white font-semibold text-sm shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 hover:scale-[1.02] transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              Nouveau retour
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Rechercher (Client, Commande, Expert, Code...)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <select
                  value={cause}
                  onChange={(e) => setCause(e.target.value as Cause | "all")}
                  className="px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm font-medium text-zinc-700 focus:ring-2 focus:ring-zinc-900 outline-none cursor-pointer hover:bg-zinc-50"
                >
                  <option value="all">Toutes les causes</option>
                  {CAUSES_IN_ORDER.map((c) => (
                    <option key={c} value={c}>{CAUSE_LABEL[c]}</option>
                  ))}
                </select>

                <select
                  value={reporter}
                  onChange={(e) => setReporter(e.target.value as Reporter | "all")}
                  className="px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm font-medium text-zinc-700 focus:ring-2 focus:ring-zinc-900 outline-none cursor-pointer hover:bg-zinc-50"
                >
                  <option value="all">Tous les signaleurs</option>
                  {(["expert", "transporteur", "autre", "client"] as string[]).map((r) => (
                    <option key={r} value={r}>{REPORTER_LABEL[r] ?? r}</option>
                  ))}
                </select>

                <div className="flex items-center bg-zinc-50 rounded-xl border border-zinc-200 p-0.5">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-transparent border-none text-xs px-2 py-2 focus:ring-0 text-zinc-600 w-32"
                    />
                    <span className="text-zinc-300 mx-1">→</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="bg-transparent border-none text-xs px-2 py-2 focus:ring-0 text-zinc-600 w-32"
                    />
                </div>

                <div className="h-8 w-px bg-zinc-200 mx-2 hidden lg:block"></div>

                <button onClick={() => load()} className="p-2.5 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors" title="Rafraîchir">
                   <RotateCcw className="h-4 w-4" />
                </button>
                 <button onClick={onReset} className="p-2.5 rounded-xl text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors" title="Réinitialiser">
                   <X className="h-4 w-4" />
                </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
              <p className="text-zinc-500 text-sm font-medium">Chargement des données...</p>
            </div>
          )}

          {error && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-red-500">
               <AlertCircle className="h-10 w-10 mb-4" />
               <p>{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-500 uppercase bg-zinc-50/50 border-b border-zinc-200 sticky top-0 z-20 backdrop-blur-md">
                    <tr>
                      <SortTh label="ID" sortKey="id" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Date" sortKey="reportedAt" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Cause" sortKey="cause" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Client / Expert" sortKey="client" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Référence" sortKey="noCommande" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Tracking" sortKey="tracking" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <th className="px-6 py-4 font-semibold tracking-wider text-center">Fichiers</th>
                      <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100/50 p-2">
                    {sorted.map((row) => {
                       const styles = getRowStyles(row);
                       const hasFiles = (row.attachments?.length ?? 0) > 0;
                       
                       return (
                        <tr 
                            key={row.id} 
                            onMouseEnter={() => setHovered(row.id)}
                            onMouseLeave={() => setHovered(null)}
                            className={cn("transition-all duration-200 group relative", styles)}
                        >
                            <td className="px-6 py-4 font-mono font-bold whitespace-nowrap">
                                {row.id.replace('R', '')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap opacity-90">
                                {new Date(row.reportedAt).toLocaleDateString("fr-CA")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className={cn("bg-white/20 border-white/20 text-current backdrop-blur-sm")}>
                                    {CAUSE_LABEL[row.cause]}
                                </Badge>
                            </td>
                            <td className="px-6 py-4 max-w-[250px]">
                                <div className="font-bold truncate">{row.client}</div>
                                <div className="text-xs opacity-70 truncate">{row.expert}</div>
                            </td>
                            <td className="px-6 py-4 font-mono opacity-90 whitespace-nowrap">
                                {row.noCommande || "—"}
                            </td>
                            <td className="px-6 py-4 opacity-90 whitespace-nowrap">
                                {row.tracking ? (
                                    <div className="flex items-center gap-1.5">
                                        <Truck className="h-3 w-3" />
                                        {row.tracking}
                                    </div>
                                ) : "—"}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {hasFiles && (
                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/20 text-current text-xs font-medium">
                                        <Paperclip className="h-3 w-3" />
                                        {row.attachments!.length}
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right relative">
                                <div className={cn(
                                    "flex items-center justify-end gap-1 transition-opacity duration-200",
                                    hovered === row.id ? "opacity-100" : "opacity-0 md:opacity-100" // Always show on mobile or rely on hover
                                )}>
                                    <button onClick={() => setOpenId(row.id)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-current transition-colors" title="Ouvrir">
                                        <Eye className="h-4 w-4" />
                                    </button>
                                     <button onClick={() => onDelete(row.id)} className="p-2 rounded-lg bg-white/10 hover:bg-red-500 hover:text-white text-current transition-colors" title="Supprimer">
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
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                    <Package className="h-12 w-12 mb-4 opacity-20" />
                    <p>Aucun résultat trouvé</p>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
                 <div>
                    Affichage de <strong>{sorted.length}</strong> retours
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-zinc-900"></span>
                        <span>Physique (Non vérifié)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                        <span>Vérifié / Complet</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-white border border-zinc-300"></span>
                        <span>Brouillon</span>
                    </div>
                 </div>
              </div>
            </>
          )}
        </div>
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
  );
}

// =============================================================================
//   HELPER COMPONENTS FOR TABLE
// =============================================================================

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
    <th className="px-6 py-4 font-semibold tracking-wider text-left cursor-pointer select-none group hover:text-zinc-800 transition-colors" onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-2">
        {label}
        <span className={cn("transition-opacity", active ? "opacity-100 text-emerald-600" : "opacity-0 group-hover:opacity-50")}>
            {active && dir === "asc" ? <ArrowUpNarrowWide className="h-3.5 w-3.5" /> : <ArrowDownNarrowWide className="h-3.5 w-3.5" />}
        </span>
      </div>
    </th>
  );
}


// =============================================================================
//   DETAIL MODAL
// =============================================================================

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
  const creatorAvatar = draft.createdBy?.avatar ?? null;
  const creatorDate = draft.createdBy?.at ? new Date(draft.createdBy.at) : new Date(draft.reportedAt);

  const isPhysical = !!draft.physicalReturn;
  const isVerified = !!draft.verified;
  const isFinalized = !!draft.finalized;
  
  // Prevent scrolling background
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-100 flex items-start justify-between bg-zinc-50/50">
            <div className="flex items-center gap-5">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-white flex items-center justify-center font-mono text-2xl font-bold shadow-lg shadow-zinc-900/10">
                    {draft.id.replace('R', '')}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-3">
                        Retour {draft.id} 
                        <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200">{CAUSE_LABEL[draft.cause]}</Badge>
                    </h2>
                    <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                        <span>Créé par <strong className="font-medium text-zinc-700">{creatorName}</strong></span>
                        <span>•</span>
                        <span>{creatorDate.toLocaleDateString("fr-CA")}</span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors">
                <X className="h-6 w-6" />
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
            
            {/* Control Panel */}
            <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Switch label="Retour physique requis" checked={isPhysical} onCheckedChange={(c) => setDraft({ ...draft, physicalReturn: c })} />
                        {isPhysical && (
                            <div className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors", 
                                isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                                {isVerified ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                {isVerified ? "Vérifié" : "En attente"}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {isPhysical && (
                            <button 
                                onClick={() => setDraft({ ...draft, verified: !isVerified })}
                                className={cn("px-4 py-2 rounded-xl text-sm font-medium border transition-all", 
                                isVerified 
                                    ? "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50" 
                                    : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20")}
                            >
                                {isVerified ? "Marquer non vérifié" : "Valider la réception"}
                            </button>
                        )}
                         <button 
                                onClick={() => setDraft({ ...draft, finalized: !isFinalized })}
                                className={cn("px-4 py-2 rounded-xl text-sm font-medium border transition-all", 
                                isFinalized 
                                    ? "bg-zinc-800 text-white border-zinc-800" 
                                    : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50")}
                            >
                                {isFinalized ? "Dossier Clos" : "Archiver le dossier"}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-200">
                    <StatusToggle 
                        label="Pickup" 
                        active={!!draft.isPickup} 
                        onClick={() => setDraft({...draft, isPickup: !draft.isPickup})}
                        details={
                             <input disabled={!draft.isPickup} value={draft.noBill ?? ""} onChange={(e) => setDraft({ ...draft, noBill: e.target.value })} className="w-full mt-2 text-xs p-2 rounded border bg-white disabled:bg-zinc-100" placeholder="No. Bon de transport" />
                        }
                    />
                     <StatusToggle 
                        label="Commande" 
                        active={!!draft.isCommande} 
                        onClick={() => setDraft({...draft, isCommande: !draft.isCommande})}
                        details={
                             <input disabled={!draft.isCommande} value={draft.noBonCommande ?? ""} onChange={(e) => setDraft({ ...draft, noBonCommande: e.target.value })} className="w-full mt-2 text-xs p-2 rounded border bg-white disabled:bg-zinc-100" placeholder="No. Bon de commande" />
                        }
                    />
                     <StatusToggle 
                        label="Réclamation" 
                        active={!!draft.isReclamation} 
                        onClick={() => setDraft({...draft, isReclamation: !draft.isReclamation})}
                        details={
                             <input disabled={!draft.isReclamation} value={draft.noReclamation ?? ""} onChange={(e) => setDraft({ ...draft, noReclamation: e.target.value })} className="w-full mt-2 text-xs p-2 rounded border bg-white disabled:bg-zinc-100" placeholder="No. Réclamation" />
                        }
                    />
                </div>
            </div>

            {/* Main Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <DetailField label="Expert" value={draft.expert || ""} onChange={(v) => setDraft({ ...draft, expert: v })} icon={<Avatar className="h-5 w-5 mr-2"><AvatarImage src=""/><AvatarFallback className="text-[9px] bg-zinc-200">EX</AvatarFallback></Avatar>} />
                 <DetailField label="Client" value={draft.client || ""} onChange={(v) => setDraft({ ...draft, client: v })} />
                 <DetailField label="No. Client" value={draft.noClient ?? ""} onChange={(v) => setDraft({ ...draft, noClient: v })} />
                 <DetailField label="No. Commande" value={draft.noCommande ?? ""} onChange={(v) => setDraft({ ...draft, noCommande: v })} />
                 <DetailField label="Tracking" value={draft.tracking ?? ""} onChange={(v) => setDraft({ ...draft, tracking: v })} icon={<Truck className="h-4 w-4 mr-2 text-zinc-400" />} />
                 <DetailField label="Transporteur" value={draft.transport ?? ""} onChange={(v) => setDraft({ ...draft, transport: v })} />
                 <DetailField label="Montant" type="number" value={draft.amount?.toString() ?? ""} onChange={(v) => setDraft({ ...draft, amount: v ? Number(v) : null })} icon={<DollarSign className="h-4 w-4 mr-2 text-zinc-400" />} />
                 <DetailField label="Date Commande" type="date" value={draft.dateCommande ?? ""} onChange={(v) => setDraft({ ...draft, dateCommande: v })} />
            </div>
            
            <div className="border-t border-zinc-100 pt-6">
                <div className="flex items-center gap-2 mb-4">
                    <Paperclip className="h-5 w-5 text-zinc-400" />
                    <h3 className="font-semibold text-zinc-900">Pièces jointes</h3>
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
            </div>

            <div className="border-t border-zinc-100 pt-6">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="h-5 w-5 text-zinc-400" />
                    <h3 className="font-semibold text-zinc-900">Produits (RMA)</h3>
                </div>
                 <div className="space-y-3">
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
                      <div className="text-center py-8 border-2 border-dashed border-zinc-100 rounded-xl text-zinc-400">
                          Aucun produit associé à ce retour.
                      </div>
                  )}
                </div>
            </div>

            <div className="border-t border-zinc-100 pt-6">
                 <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-zinc-400" />
                    <h3 className="font-semibold text-zinc-900">Notes internes</h3>
                </div>
                <textarea
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all resize-none"
                    rows={4}
                    placeholder="Ajoutez des notes, instructions ou observations..."
                    value={draft.description ?? ""}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
            </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
            <span className="text-xs text-zinc-400">Dernière modification locale. N'oubliez pas d'enregistrer.</span>
            <div className="flex items-center gap-3">
                 <button 
                    onClick={() => { onPatched(draft); }} 
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg shadow-zinc-900/10 hover:scale-[1.02] transition-all"
                >
                    <Save className="h-4 w-4" />
                    Enregistrer les modifications
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}

function StatusToggle({ label, active, onClick, details }: { label: string, active: boolean, onClick: () => void, details?: React.ReactNode }) {
    return (
        <div className={cn("p-4 rounded-xl border transition-all duration-200", active ? "bg-white border-zinc-300 shadow-sm" : "bg-zinc-50 border-transparent opacity-80")}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-zinc-900">{label}</span>
                <button onClick={onClick} className={cn("w-10 h-6 rounded-full relative transition-colors", active ? "bg-zinc-900" : "bg-zinc-200")}>
                    <span className={cn("absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm", active ? "translate-x-4" : "")} />
                </button>
            </div>
            {details}
        </div>
    )
}

function DetailField({ label, value, onChange, type = "text", icon }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{label}</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {icon}
                </div>
                <input 
                    type={type} 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    className={cn(
                        "w-full h-11 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all pl-3",
                        icon && "pl-10"
                    )}
                />
            </div>
        </div>
    )
}

function ProductRow({ product, onChange, onRemove }: { product: ProductLine; onChange: (p: ProductLine) => void; onRemove: () => void; }) {
  const [suggestions, setSuggestions] = React.useState<ItemSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  
  const debouncedCode = useDebounced(product.codeProduit, 300);

  React.useEffect(() => {
    let active = true;
    const fetchSuggestions = async () => {
      if (!showSuggestions || debouncedCode.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const results = await searchItems(debouncedCode);
        if (active) setSuggestions(results);
      } catch (error) { console.error(error); }
    };
    fetchSuggestions();
    return () => { active = false; };
  }, [debouncedCode, showSuggestions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_1fr_100px_40px] gap-2 items-start p-3 rounded-xl bg-zinc-50 border border-zinc-100 group hover:border-zinc-300 transition-colors">
      <div className="relative">
        <input
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm bg-white font-mono"
          placeholder="Code"
          value={product.codeProduit}
          onChange={(e) => {
            onChange({ ...product, codeProduit: e.target.value });
            setShowSuggestions(true);
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
         {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 mt-1 w-[300px] max-h-60 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-xl py-1">
            {suggestions.map((s) => (
              <button
                key={s.code}
                className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50"
                onClick={() => {
                   onChange({ ...product, codeProduit: s.code, descriptionProduit: s.descr || product.descriptionProduit });
                   setShowSuggestions(false);
                }}
              >
                <div className="font-bold text-zinc-900">{s.code}</div>
                <div className="text-xs text-zinc-500 truncate">{s.descr}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <input className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm bg-white" placeholder="Description" value={product.descriptionProduit || ""} onChange={(e) => onChange({ ...product, descriptionProduit: e.target.value })} />
      <input className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm bg-white" placeholder="Raison" value={product.descriptionRetour ?? ""} onChange={(e) => onChange({ ...product, descriptionRetour: e.target.value })} />
      <input type="number" min={0} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm bg-white text-center" placeholder="Qté" value={product.quantite} onChange={(e) => onChange({ ...product, quantite: Number(e.target.value || 0) })} />
      <button className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50" onClick={onRemove}><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}


// =============================================================================
//   NEW RETURN MODAL - PREMIUM DARK DESIGN
// =============================================================================

function NewReturnModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> | void; }) {
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
          if (json.ok && json.nextId) setNextId(`R${json.nextId}`);
        }
      } catch (error) { console.error("Failed to fetch next ID", error); }
    };
    fetchNextId();
  }, []);

  const addProduct = () => setProducts((p) => [...p, { id: `np-${Date.now()}`, codeProduit: "", descriptionProduit: "", descriptionRetour: "", quantite: 1 }]);
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
        reporter, cause, expert: expert.trim(), client: client.trim(),
        noClient: noClient.trim() || null, noCommande: noCommande.trim() || null,
        tracking: tracking.trim() || null, amount: amount ? Number(amount) : null,
        dateCommande: dateCommande || null, transport: transport.trim() || null,
        description: description.trim() || null, physicalReturn, isPickup, isCommande, isReclamation,
        noBill: isPickup ? noBill : null, noBonCommande: isCommande ? noBonCommande : null, noReclamation: isReclamation ? noReclamation : null,
        reportedAt,
        products: products.map((p) => ({ ...p, codeProduit: p.codeProduit.trim(), descriptionProduit: p.descriptionProduit?.trim() || "", descriptionRetour: p.descriptionRetour?.trim() || "" })),
      });

      if (filesToUpload.length > 0 && createdReturn?.codeRetour) {
        for (const file of filesToUpload) await uploadAttachment(String(createdReturn.codeRetour), file);
      }
      await onCreated();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur à la création";
      alert(message);
    } finally {
      setBusy(false);
    }
  };

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
                    <span className="font-mono text-lg font-bold text-white tracking-tight">{nextId.replace('R', '')}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Nouveau retour</h2>
                    <p className="mt-0.5 text-sm text-white/50">Créé par {currentUserName} • {new Date().toLocaleDateString("fr-CA")}</p>
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
                
                {/* Hero: Order Lookup + Physical */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Lookup */}
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-2xl opacity-75 blur group-hover:opacity-100 transition duration-300" />
                    <div className="relative p-6 rounded-2xl bg-[#1a1a1a] border border-white/10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-amber-500/20"><Search className="h-5 w-5 text-amber-400" /></div>
                        <div><h3 className="text-base font-semibold text-white">Recherche rapide</h3><p className="text-xs text-white/50">Entrez un numéro de commande</p></div>
                      </div>
                      <div className="relative">
                        <input
                          type="text" value={noCommande} onChange={(e) => setNoCommande(e.target.value)} onBlur={onFetchFromOrder} onKeyDown={(e) => e.key === "Enter" && onFetchFromOrder()}
                          placeholder="No. commande (ex: 92427)"
                          className="w-full px-5 py-4 rounded-xl text-lg font-mono font-semibold bg-black/50 border-2 border-amber-500/50 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 transition-all duration-200"
                        />
                        {orderLookupLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="h-5 w-5 text-amber-400 animate-spin" /></div>}
                      </div>
                    </div>
                  </div>

                  {/* Physical Toggle */}
                  <div className={cn("relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer", physicalReturn ? "bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-white/[0.02] border-white/10 hover:border-white/20")} onClick={() => setPhysicalReturn(!physicalReturn)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl transition-colors", physicalReturn ? "bg-emerald-500/20" : "bg-white/5")}><Package className={cn("h-6 w-6 transition-colors", physicalReturn ? "text-emerald-400" : "text-white/40")} /></div>
                        <div>
                          <h3 className={cn("text-base font-semibold transition-colors", physicalReturn ? "text-emerald-400" : "text-white")}>Retour physique</h3>
                          <p className="mt-1 text-sm text-white/50 max-w-[280px]">{physicalReturn ? "Nécessite vérification réception" : "Retour administratif uniquement"}</p>
                        </div>
                      </div>
                      <Switch checked={physicalReturn} onCheckedChange={setPhysicalReturn} />
                    </div>
                  </div>
                </div>

                {/* Main Form */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center gap-3 mb-6"><div className="p-2 rounded-lg bg-white/5"><FileText className="h-4 w-4 text-white/60" /></div><h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Informations</h3></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <PremiumField label="Date" type="date" value={reportedAt} onChange={setReportedAt} required icon={<Calendar className="h-4 w-4" />} />
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
                    <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Package className="h-4 w-4 text-blue-400" /></div><h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Produits (RMA)</h3></div>
                    <button onClick={addProduct} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all duration-200"><Plus className="h-4 w-4" /> Ajouter produit</button>
                  </div>
                  {products.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-white/10 rounded-xl"><Package className="h-10 w-10 mx-auto mb-3 text-white/20" /><p className="text-sm text-white/40">Aucun produit ajouté</p></div>
                  ) : (
                    <div className="space-y-3">{products.map((p, idx) => (<ProductRowPremium key={p.id} product={p} index={idx + 1} onChange={(updatedProduct) => { const arr = products.slice(); arr[idx] = updatedProduct; setProducts(arr); }} onRemove={() => removeProduct(p.id)} />))}</div>
                  )}
                </div>

                {/* Attachments */}
                 <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                     <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-purple-500/10"><Paperclip className="h-4 w-4 text-purple-400" /></div><h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Pièces jointes</h3></div>
                     <div className="relative">
                        <input type="file" id="new-return-upload" multiple className="hidden" onChange={(e) => { if (e.target.files) { setFilesToUpload(prev => [...prev, ...Array.from(e.target.files || [])]); e.target.value = ""; } }} />
                        <label htmlFor="new-return-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all duration-200"><UploadCloud className="h-4 w-4" /> Ajouter fichier</label>
                     </div>
                  </div>
                  {filesToUpload.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{filesToUpload.map((f, i) => (<div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10"><div className="flex items-center gap-3 min-w-0"><FileText className="h-4 w-4 text-purple-400" /><div className="min-w-0"><p className="text-sm font-medium text-white truncate">{f.name}</p></div></div><button onClick={() => setFilesToUpload(prev => prev.filter((_, idx) => idx !== i))} className="p-2 rounded-lg text-white/40 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div>))}</div>}
                 </div>

                {/* Description & Options */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                    <textarea className="w-full px-4 py-3 rounded-xl text-sm bg-black/30 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 transition-all duration-200 resize-none mb-6" rows={4} placeholder="Notes internes, contexte..." value={description} onChange={(e) => setDescription(e.target.value)} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <OptionCard label="Pickup" description="Bon de transport requis" checked={isPickup} onCheckedChange={setIsPickup} inputValue={noBill} onInputChange={setNoBill} inputPlaceholder="No. Bill" color="cyan" />
                        <OptionCard label="Commande" description="Lier à une commande" checked={isCommande} onCheckedChange={setIsCommande} inputValue={noBonCommande} onInputChange={setNoBonCommande} inputPlaceholder="No. Bon" color="indigo" />
                        <OptionCard label="Réclamation" description="Ouvrir une réclamation" checked={isReclamation} onCheckedChange={setIsReclamation} inputValue={noReclamation} onInputChange={setNoReclamation} inputPlaceholder="No. Récl." color="rose" />
                    </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-white/10 bg-gradient-to-r from-white/[0.02] to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/20"><span className="text-xs font-bold text-emerald-400">{currentUserInitials}</span></div><div className="text-sm"><span className="text-white/40">Création par </span><span className="text-white/80 font-medium">{currentUserName}</span></div></div>
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200">Annuler</button>
                    <button disabled={busy} onClick={submit} className={cn("inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:scale-[1.02]", busy && "opacity-70 pointer-events-none")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Créer le retour</button>
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function PremiumField({ label, value, onChange, type = "text", as, options, placeholder, required, icon, highlight }: any) {
  return (
    <label className="block">
      <span className={cn("text-xs font-semibold uppercase tracking-wider mb-2 block", required ? "text-white/70" : "text-white/50")}>{label}{required && <span className="text-emerald-400 ml-1">*</span>}</span>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">{icon}</div>}
        {as === "select" ? (
          <select className={cn("w-full px-4 py-3 rounded-xl text-sm bg-black/30 border border-white/10 text-white focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 transition-all duration-200 appearance-none cursor-pointer", highlight && "border-emerald-500/30 bg-emerald-500/5")} value={value} onChange={(e) => onChange(e.target.value)}>
            {options?.map((o: any) => (<option key={o.value} value={o.value} className="bg-[#1a1a1a]">{o.label}</option>))}
          </select>
        ) : (
          <input type={type} className={cn("w-full py-3 rounded-xl text-sm bg-black/30 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 transition-all duration-200", icon ? "pl-10 pr-4" : "px-4", highlight && "border-emerald-500/30 bg-emerald-500/5")} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        )}
      </div>
    </label>
  );
}

function ProductRowPremium({ product, index, onChange, onRemove }: { product: ProductLine; index: number; onChange: (p: ProductLine) => void; onRemove: () => void; }) {
  const [suggestions, setSuggestions] = React.useState<ItemSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const debouncedCode = useDebounced(product.codeProduit, 300);

  React.useEffect(() => {
    let active = true;
    const fetch = async () => {
      if (!showSuggestions || debouncedCode.trim().length < 2) { setSuggestions([]); return; }
      try { const r = await searchItems(debouncedCode); if (active) setSuggestions(r); } catch (e) { console.error(e); }
    };
    fetch();
    return () => { active = false; };
  }, [debouncedCode, showSuggestions]);

  return (
    <div className="p-4 rounded-xl bg-black/20 border border-white/10 hover:border-white/20 transition-colors flex items-center gap-4">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-bold shrink-0">{index}</div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[180px_1fr_1fr_80px] gap-3">
        <div className="relative">
          <input className="w-full px-3 py-2.5 rounded-lg text-sm font-mono bg-black/30 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20" placeholder="Code" value={product.codeProduit} onChange={(e) => { onChange({ ...product, codeProduit: e.target.value }); setShowSuggestions(true); }} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 mt-1 w-[280px] max-h-48 overflow-y-auto rounded-lg border border-white/20 bg-[#1a1a1a] shadow-xl">{suggestions.map((s) => (<button key={s.code} className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 border-b border-white/5 last:border-0" onClick={(e) => { e.preventDefault(); onChange({ ...product, codeProduit: s.code, descriptionProduit: s.descr || product.descriptionProduit }); setShowSuggestions(false); }}><div className="font-mono font-semibold text-white">{s.code}</div><div className="text-xs text-white/50 truncate">{s.descr}</div></button>))}</div>
          )}
        </div>
        <input className="w-full px-3 py-2.5 rounded-lg text-sm bg-black/30 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" placeholder="Description" value={product.descriptionProduit || ""} onChange={(e) => onChange({ ...product, descriptionProduit: e.target.value })} />
        <input className="w-full px-3 py-2.5 rounded-lg text-sm bg-black/30 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" placeholder="Raison" value={product.descriptionRetour ?? ""} onChange={(e) => onChange({ ...product, descriptionRetour: e.target.value })} />
        <input type="number" min={0} className="w-full px-3 py-2.5 rounded-lg text-sm bg-black/30 border border-white/10 text-white text-center focus:outline-none focus:border-white/30" placeholder="Qté" value={product.quantite} onChange={(e) => onChange({ ...product, quantite: Number(e.target.value || 0) })} />
      </div>
      <button onClick={onRemove} className="p-2.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

function OptionCard({ label, description, checked, onCheckedChange, inputValue, onInputChange, inputPlaceholder, color }: any) {
  const c = { cyan: "cyan", indigo: "indigo", rose: "rose" }[color as string] || "cyan";
  const colors: Record<string, string> = { cyan: "text-cyan-400", indigo: "text-indigo-400", rose: "text-rose-400" };
  const bgs: Record<string, string> = { cyan: "bg-cyan-500", indigo: "bg-indigo-500", rose: "bg-rose-500" };
  
  return (
    <div className={cn("p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer hover:border-opacity-80", checked ? `bg-${c}-500/10 border-${c}-500/50` : "bg-white/[0.02] border-white/10")} onClick={() => onCheckedChange(!checked)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3"><div className={cn("p-2 rounded-lg", `bg-${c}-500/20`)}><Check className={cn("h-4 w-4", colors[c])} /></div><div><h4 className="text-sm font-semibold text-white">{label}</h4><p className="text-xs text-white/50">{description}</p></div></div>
        <div className={cn("w-10 h-6 rounded-full relative transition-colors", checked ? bgs[c] : "bg-white/20")}><span className={cn("absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm", checked ? "translate-x-4" : "")} /></div>
      </div>
      <input disabled={!checked} value={inputValue} onClick={(e) => e.stopPropagation()} onChange={(e) => onInputChange(e.target.value)} className={cn("w-full px-3 py-2.5 rounded-lg text-sm bg-black/30 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all", !checked && "opacity-40 cursor-not-allowed")} placeholder={inputPlaceholder} />
    </div>
  );
}
