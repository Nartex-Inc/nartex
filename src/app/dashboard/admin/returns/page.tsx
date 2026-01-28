"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import {
  Search,
  Eye,
  Trash2,
  RotateCcw,
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
  Paperclip,
  UploadCloud,
  Truck,
  DollarSign,
  Filter,
  Archive,
  History,
  Shield,
  AlertCircle,
  Warehouse,
  CreditCard,
  Scale,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachmentsSection } from "@/components/returns/AttachmentsSection";

import type { ReturnRow, Reporter, Cause, Attachment, ProductLine, ItemSuggestion } from "@/types/returns";

// =============================================================================
//   TYPES
// =============================================================================

type UserRole = "Gestionnaire" | "Vérificateur" | "Facturation" | "Expert" | "Analyste";

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

const RESTOCK_RATES = ["0%", "5%", "10%", "20%", "100%"];

const WAREHOUSES = [
  "Entrepôt Principal",
  "Entrepôt B",
  "Entrepôt C",
  "Retour fournisseur",
  "Déchets",
];

// =============================================================================
//   API UTILS
// =============================================================================

async function fetchReturns(params: {
  q?: string;
  cause?: string;
  reporter?: string;
  dateFrom?: string;
  dateTo?: string;
  history?: boolean;
  take?: number;
}): Promise<{ rows: ReturnRow[]; userRole?: UserRole }> {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (params.cause && params.cause !== "all") usp.set("cause", params.cause);
  if (params.reporter && params.reporter !== "all") usp.set("reporter", params.reporter);
  if (params.dateFrom) usp.set("dateFrom", params.dateFrom);
  if (params.dateTo) usp.set("dateTo", params.dateTo);
  if (params.history) usp.set("history", "true");
  usp.set("take", String(params.take ?? 200));

  try {
    const res = await fetch(`/api/returns?${usp.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return { rows: [] };

    const json = await res.json();
    if (json.ok && Array.isArray(json.data)) {
      return { rows: json.data as ReturnRow[], userRole: json.userRole };
    }
    return { rows: [] };
  } catch (error) {
    return { rows: [] };
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
  if (!json.ok) throw new Error(json.error || "Création échouée");
  return json.data;
}

async function updateReturn(code: string, payload: any) {
  const res = await fetch(`/api/returns/${encodeURIComponent(code)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Mise à jour échouée");
  return json.data;
}

async function verifyReturn(code: string, products: any[]) {
  const res = await fetch(`/api/returns/${encodeURIComponent(code)}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ products }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Vérification échouée");
  return json.data;
}

async function finalizeReturn(code: string, payload: any) {
  const res = await fetch(`/api/returns/${encodeURIComponent(code)}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Finalisation échouée");
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
  return json;
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

function Switch({ checked, onCheckedChange, label, disabled }: { 
  checked: boolean; 
  onCheckedChange: (c: boolean) => void; 
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          checked 
            ? "bg-neutral-900 dark:bg-white" 
            : "bg-neutral-200 dark:bg-neutral-700",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full shadow-sm transition-transform duration-200",
            checked 
              ? "translate-x-4 bg-white dark:bg-neutral-900" 
              : "translate-x-0 bg-white dark:bg-neutral-400"
          )}
        />
      </button>
      {label && <span className={cn(
        "text-sm font-medium",
        disabled ? "text-neutral-400" : "text-neutral-700 dark:text-neutral-300"
      )}>{label}</span>}
    </div>
  );
}

function Badge({ children, variant = "default", className }: { 
  children: React.ReactNode; 
  variant?: "default" | "success" | "warning" | "muted" | "info"; 
  className?: string 
}) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
      variant === "default" && "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
      variant === "success" && "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400",
      variant === "warning" && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      variant === "muted" && "bg-neutral-50 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-500",
      variant === "info" && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      className
    )}>
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
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();

  // User role from session
  const userRole = (session?.user as { role?: string })?.role as UserRole | undefined;

  // History/Archive toggle
  const [showHistory, setShowHistory] = React.useState(false);

  // Filters
  const [query, setQuery] = React.useState("");
  const [cause, setCause] = React.useState<"all" | Cause>("all");
  const [reporter, setReporter] = React.useState<"all" | Reporter>("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [showFilters, setShowFilters] = React.useState(false);

  // Data
  const [rows, setRows] = React.useState<ReturnRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Selection
  const [openId, setOpenId] = React.useState<string | null>(null);
  const selected = React.useMemo(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);

  // Sort
  const [sortKey, setSortKey] = React.useState<SortKey>("reportedAt");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  // New return modal
  const [openNew, setOpenNew] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows: data } = await fetchReturns({
        q: query,
        cause,
        reporter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        history: showHistory,
        take: 200,
      });
      setRows(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [query, cause, reporter, dateFrom, dateTo, showHistory]);

  React.useEffect(() => {
    load();
  }, [load]);

  const sorted = React.useMemo(() => {
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

  const stats = React.useMemo(() => {
    // Stats depend on role
    if (userRole === "Vérificateur") {
      return {
        total: rows.length,
        awaitingVerification: rows.length, // All rows for this role are awaiting verification
      };
    }
    if (userRole === "Facturation") {
      return {
        total: rows.length,
        readyForFinalization: rows.length, // All rows for this role are ready
      };
    }
    return {
      total: rows.length,
      draft: rows.filter((r) => r.isDraft).length,
      awaiting: rows.filter((r) => r.physicalReturn && !r.verified && !r.finalized && !r.isDraft).length,
      ready: rows.filter((r) => (!r.physicalReturn || r.verified) && !r.finalized && !r.isDraft).length,
    };
  }, [rows, userRole]);

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

  const hasActiveFilters = cause !== "all" || reporter !== "all" || dateFrom || dateTo;

  // =======================================================================
  // ROW STATUS & STYLING
  // =======================================================================
  type RowStatus = "draft" | "awaiting_physical" | "ready" | "finalized";
  
  const getRowStatus = (row: ReturnRow): RowStatus => {
    if (row.finalized) return "finalized";
    if (row.isDraft) return "draft";
    if (row.physicalReturn && !row.verified) return "awaiting_physical";
    return "ready";
  };

  // =======================================================================
  // ROLE-BASED UI HELPERS
  // =======================================================================
  
  const canCreateReturn = userRole === "Gestionnaire";
  const canDeleteReturn = userRole === "Gestionnaire";
  const canVerifyReturn = userRole === "Vérificateur";
  const canFinalizeReturn = userRole === "Facturation";
  const canEditReturn = userRole === "Gestionnaire";
  const isReadOnly = userRole === "Analyste" || userRole === "Expert";

  // Get page title based on role
  const getPageTitle = () => {
    switch (userRole) {
      case "Vérificateur": return "Vérification des retours";
      case "Facturation": return "Finalisation des retours";
      default: return showHistory ? "Historique des retours" : "Retours";
    }
  };

  // Get page subtitle based on role
  const getPageSubtitle = () => {
    switch (userRole) {
      case "Vérificateur": return "Retours physiques en attente de vérification";
      case "Facturation": return "Retours prêts à être finalisés";
      case "Expert": return "Vos retours en cours";
      default: return showHistory ? "Retours archivés et finalisés" : "Gérez les demandes de retours";
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                  {getPageTitle()}
                </h1>
                {userRole && (
                  <Badge variant="info" className="capitalize">
                    <Shield className="h-3 w-3 mr-1" />
                    {userRole}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {getPageSubtitle()}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Archive/History Toggle - Only for Gestionnaire, Facturation, Analyste */}
              {(userRole === "Gestionnaire" || userRole === "Facturation" || userRole === "Analyste") && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    showHistory
                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  )}
                >
                  {showHistory ? <Archive className="h-4 w-4" /> : <History className="h-4 w-4" />}
                  {showHistory ? "Historique actif" : "Voir l'historique"}
                </button>
              )}

              {/* New Return Button - Only for Gestionnaire */}
              {canCreateReturn && !showHistory && (
                <button
                  onClick={() => setOpenNew(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nouveau retour
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total" value={stats.total} />
            {userRole === "Gestionnaire" && (
              <>
                <StatCard label="Brouillons" value={(stats as any).draft ?? 0} variant="muted" />
                <StatCard label="En attente" value={(stats as any).awaiting ?? 0} variant="warning" />
                <StatCard label="Prêts" value={(stats as any).ready ?? 0} variant="success" />
              </>
            )}
            {userRole === "Vérificateur" && (
              <StatCard label="À vérifier" value={(stats as any).awaitingVerification ?? stats.total} variant="warning" />
            )}
            {userRole === "Facturation" && (
              <StatCard label="À finaliser" value={(stats as any).readyForFinalization ?? stats.total} variant="success" />
            )}
          </div>
        </header>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Rechercher par client, commande, expert..."
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-1 transition-shadow"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "inline-flex items-center gap-2 px-4 h-10 rounded-lg border text-sm font-medium transition-colors",
                hasActiveFilters
                  ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                  : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              )}
            >
              <Filter className="h-4 w-4" />
              Filtres
              {hasActiveFilters && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white">
                  {[cause !== "all", reporter !== "all", dateFrom, dateTo].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => load()}
                className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                title="Rafraîchir"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              {hasActiveFilters && (
                <button
                  onClick={onReset}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 transition-colors"
                  title="Réinitialiser"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Cause</label>
                <select
                  value={cause}
                  onChange={(e) => setCause(e.target.value as Cause | "all")}
                  className="h-9 px-3 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                >
                  <option value="all">Toutes</option>
                  {CAUSES_IN_ORDER.map((c) => (
                    <option key={c} value={c}>{CAUSE_LABEL[c]}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Signaleur</label>
                <select
                  value={reporter}
                  onChange={(e) => setReporter(e.target.value as Reporter | "all")}
                  className="h-9 px-3 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                >
                  <option value="all">Tous</option>
                  {(["expert", "transporteur", "client", "autre"] as string[]).map((r) => (
                    <option key={r} value={r}>{REPORTER_LABEL[r] ?? r}</option>
                  ))}
                </select>
              </div>

              <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 hidden sm:block" />

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Du</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 px-3 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Au</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 px-3 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Table Card */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="h-8 w-8 text-neutral-400 animate-spin mb-3" />
              <p className="text-sm text-neutral-500">Chargement...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-24 text-red-600 dark:text-red-400">
              <AlertCircle className="h-8 w-8 mb-3" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800">
                      <SortTh label="ID" sortKey="id" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Date" sortKey="reportedAt" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Cause" sortKey="cause" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Client / Expert" sortKey="client" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Commande" sortKey="noCommande" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Tracking" sortKey="tracking" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Fichiers</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {sorted.map((row) => {
                      const status = getRowStatus(row);
                      const hasFiles = (row.attachments?.length ?? 0) > 0;

                      return (
                        <tr
                          key={row.id}
                          onClick={() => setOpenId(row.id)}
                          className={cn(
                            "group cursor-pointer transition-colors",
                            // Draft: White/Light background - ONLY visible to Gestionnaire
                            status === "draft" && "bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800",
                            // Awaiting physical: Black/Dark background
                            status === "awaiting_physical" && "bg-neutral-900 dark:bg-neutral-950 text-white hover:bg-neutral-800 dark:hover:bg-neutral-900",
                            // Ready: Bright lime/green background
                            status === "ready" && "bg-lime-400 dark:bg-lime-500 text-neutral-900 hover:bg-lime-500 dark:hover:bg-lime-400",
                            // Finalized: Muted
                            status === "finalized" && "bg-neutral-100 dark:bg-neutral-900/50 text-neutral-400 dark:text-neutral-600"
                          )}
                        >
                          <td className="px-4 py-3 font-mono font-medium whitespace-nowrap">
                            {row.id.replace('R', '')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {new Date(row.reportedAt).toLocaleDateString("fr-CA")}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
                              status === "awaiting_physical" && "bg-white/20 text-white",
                              status === "ready" && "bg-neutral-900/10 text-neutral-900",
                              status === "draft" && "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400",
                              status === "finalized" && "bg-neutral-200/50 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-500"
                            )}>
                              {CAUSE_LABEL[row.cause]}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <div className={cn(
                              "font-medium truncate",
                              status === "finalized" && "text-neutral-400 dark:text-neutral-500"
                            )}>
                              {row.client}
                            </div>
                            <div className={cn(
                              "text-xs truncate",
                              status === "awaiting_physical" && "text-white/70",
                              status === "ready" && "text-neutral-900/70",
                              status === "draft" && "text-neutral-500",
                              status === "finalized" && "text-neutral-400 dark:text-neutral-600"
                            )}>
                              {row.expert}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono whitespace-nowrap">
                            {row.noCommande || "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {row.tracking ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Truck className="h-3.5 w-3.5 opacity-70" />
                                <span className="font-mono text-xs">{row.tracking}</span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {hasFiles && (
                              <span className={cn(
                                "inline-flex items-center gap-1 text-xs font-medium",
                                status === "awaiting_physical" && "text-white/80",
                                status === "ready" && "text-neutral-900/80"
                              )}>
                                <Paperclip className="h-3.5 w-3.5" />
                                {row.attachments!.length}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* View/Edit Button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenId(row.id); }}
                                className={cn(
                                  "p-1.5 rounded-md transition-colors",
                                  status === "awaiting_physical" && "hover:bg-white/20 text-white",
                                  status === "ready" && "hover:bg-neutral-900/10 text-neutral-900",
                                  (status === "draft" || status === "finalized") && "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                                )}
                                title={canVerifyReturn ? "Vérifier" : canFinalizeReturn ? "Finaliser" : "Consulter"}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              
                              {/* Delete Button - Only for Gestionnaire on non-verified/non-finalized */}
                              {canDeleteReturn && !row.verified && !row.finalized && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
                                  className={cn(
                                    "p-1.5 rounded-md transition-colors",
                                    status === "awaiting_physical" && "hover:bg-red-500/30 text-white hover:text-red-200",
                                    status === "ready" && "hover:bg-red-500/20 text-neutral-900 hover:text-red-600",
                                    (status === "draft" || status === "finalized") && "hover:bg-red-50 dark:hover:bg-red-950 text-neutral-500 hover:text-red-600 dark:hover:text-red-400"
                                  )}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {sorted.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
                    <Package className="h-10 w-10 mb-3 opacity-50" />
                    <p className="text-sm">
                      {showHistory ? "Aucun retour archivé" : "Aucun retour à traiter"}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Legend */}
              <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex items-center justify-between text-xs text-neutral-500">
                <span>{sorted.length} retour{sorted.length !== 1 ? "s" : ""}</span>
                {userRole === "Gestionnaire" && !showHistory && (
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-lime-400 dark:bg-lime-500" />
                      Prêt
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-neutral-900 dark:bg-neutral-950" />
                      En attente
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900" />
                      Brouillon
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail/Edit/Verify/Finalize Modal */}
      {selected && (
        <DetailModal
          row={selected}
          userRole={userRole}
          onClose={() => setOpenId(null)}
          onPatched={(patch) =>
            setRows((prev) => prev.map((r) => (r.id === selected.id ? { ...r, ...patch } : r)))
          }
          onRefresh={load}
        />
      )}

      {/* New Return Modal - Only for Gestionnaire */}
      {openNew && canCreateReturn && (
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
//   HELPER COMPONENTS
// =============================================================================

function StatCard({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "success" | "warning" | "muted" }) {
  return (
    <div className={cn(
      "px-4 py-3 rounded-lg border",
      variant === "default" && "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
      variant === "success" && "border-lime-200 dark:border-lime-900/50 bg-lime-50 dark:bg-lime-950/30",
      variant === "warning" && "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30",
      variant === "muted" && "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50"
    )}>
      <div className={cn(
        "text-2xl font-semibold tabular-nums",
        variant === "default" && "text-neutral-900 dark:text-white",
        variant === "success" && "text-lime-700 dark:text-lime-400",
        variant === "warning" && "text-amber-700 dark:text-amber-400",
        variant === "muted" && "text-neutral-500 dark:text-neutral-400"
      )}>
        {value}
      </div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{label}</div>
    </div>
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
    <th
      className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide cursor-pointer select-none hover:text-neutral-900 dark:hover:text-white transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        {active && (
          dir === "asc"
            ? <ArrowUpNarrowWide className="h-3.5 w-3.5 text-neutral-900 dark:text-white" />
            : <ArrowDownNarrowWide className="h-3.5 w-3.5 text-neutral-900 dark:text-white" />
        )}
      </span>
    </th>
  );
}

// =============================================================================
//   DETAIL MODAL - Handles View/Edit/Verify/Finalize based on role
// =============================================================================

function DetailModal({
  row,
  userRole,
  onClose,
  onPatched,
  onRefresh,
}: {
  row: ReturnRow;
  userRole?: UserRole;
  onClose: () => void;
  onPatched: (patch: Partial<ReturnRow>) => void;
  onRefresh: () => Promise<void>;
}) {
  const { data: session } = useSession();
  const [draft, setDraft] = React.useState<ReturnRow>(row);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => setDraft(row), [row]);

  // =======================================================================
  // ROLE-BASED PERMISSIONS
  // =======================================================================
  const canEdit = userRole === "Gestionnaire" && !row.verified && !row.finalized;
  const canVerify = userRole === "Vérificateur" && row.physicalReturn && !row.verified && !row.finalized;
  const canFinalize = userRole === "Facturation" && !row.finalized && (!row.physicalReturn || row.verified);
  const isReadOnly = row.finalized || (userRole !== "Gestionnaire" && userRole !== "Vérificateur" && userRole !== "Facturation");

  // Show verification fields if:
  // - User is Vérificateur and can verify, OR
  // - Return is already verified (readonly)
  const showVerificationFields = canVerify || row.verified;

  // Show finalization fields if:
  // - User is Facturation and can finalize, OR
  // - Return is already finalized (readonly)
  const showFinalizationFields = canFinalize || row.finalized;

  const creatorName = draft.createdBy?.name ?? session?.user?.name ?? REPORTER_LABEL[draft.reporter];
  const creatorDate = draft.createdBy?.at ? new Date(draft.createdBy.at) : new Date(draft.reportedAt);

  // Prevent scrolling background
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // =======================================================================
  // HANDLERS
  // =======================================================================

  const handleSave = async () => {
    if (!canEdit) return;
    setBusy(true);
    try {
      await updateReturn(draft.id, {
        reporter: draft.reporter,
        cause: draft.cause,
        expert: draft.expert,
        client: draft.client,
        noClient: draft.noClient,
        noCommande: draft.noCommande,
        tracking: draft.tracking,
        amount: draft.amount,
        dateCommande: draft.dateCommande,
        transport: draft.transport,
        description: draft.description,
        physicalReturn: draft.physicalReturn,
        isPickup: draft.isPickup,
        isCommande: draft.isCommande,
        isReclamation: draft.isReclamation,
        noBill: draft.noBill,
        noBonCommande: draft.noBonCommande,
        noReclamation: draft.noReclamation,
        products: draft.products,
      });
      onPatched(draft);
      onClose();
    } catch (e: any) {
      alert(e.message || "Erreur lors de la sauvegarde");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!canVerify) return;
    
    // Validate all products have quantiteRecue
    const missingQty = (draft.products ?? []).some(p => p.quantiteRecue === null || p.quantiteRecue === undefined);
    if (missingQty) {
      alert("Veuillez entrer la quantité reçue pour tous les produits");
      return;
    }

    setBusy(true);
    try {
      await verifyReturn(draft.id, (draft.products ?? []).map(p => ({
        codeProduit: p.codeProduit,
        quantiteRecue: p.quantiteRecue ?? 0,
        qteDetruite: p.qteDetruite ?? 0,
        qteInventaire: (p.quantiteRecue ?? 0) - (p.qteDetruite ?? 0),
      })));
      await onRefresh();
      onClose();
    } catch (e: any) {
      alert(e.message || "Erreur lors de la vérification");
    } finally {
      setBusy(false);
    }
  };

  const handleFinalize = async () => {
    if (!canFinalize) return;
    setBusy(true);
    try {
      await finalizeReturn(draft.id, {
        products: (draft.products ?? []).map(p => ({
          codeProduit: p.codeProduit,
          quantiteRecue: p.quantiteRecue ?? 0,
          qteInventaire: p.qteInventaire ?? 0,
          qteDetruite: p.qteDetruite ?? 0,
          tauxRestock: p.tauxRestock ?? 0,
        })),
        warehouseOrigin: draft.warehouseOrigin,
        warehouseDestination: draft.warehouseDestination,
        noCredit: draft.noCredit,
        noCredit2: draft.noCredit2,
        noCredit3: draft.noCredit3,
        creditedTo: draft.creditedTo,
        creditedTo2: draft.creditedTo2,
        creditedTo3: draft.creditedTo3,
        transportAmount: draft.transportAmount,
        restockingAmount: draft.restockingAmount,
        chargeTransport: !!draft.transportAmount,
        villeShipto: draft.villeShipto,
      });
      await onRefresh();
      onClose();
    } catch (e: any) {
      alert(e.message || "Erreur lors de la finalisation");
    } finally {
      setBusy(false);
    }
  };

  // =======================================================================
  // RENDER
  // =======================================================================

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-neutral-900 rounded-xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800">

        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-mono text-lg font-semibold">
              {draft.id.replace('R', '')}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-3">
                {canVerify ? "Vérification" : canFinalize ? "Finalisation" : row.finalized ? "Consultation" : "Retour"} {draft.id}
                <Badge>{CAUSE_LABEL[draft.cause]}</Badge>
                {row.verified && <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Vérifié</Badge>}
                {row.finalized && <Badge variant="muted"><Archive className="h-3 w-3 mr-1" />Archivé</Badge>}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Par {creatorName} · {creatorDate.toLocaleDateString("fr-CA")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Status Info */}
          {(row.verified || row.finalized) && (
            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-2">
              {row.verifiedBy && (
                <div className="flex items-center gap-2 text-sm">
                  <BadgeCheck className="h-4 w-4 text-lime-600" />
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Vérifié par <strong>{row.verifiedBy.name}</strong>
                    {row.verifiedBy.at && ` le ${new Date(row.verifiedBy.at).toLocaleDateString("fr-CA")}`}
                  </span>
                </div>
              )}
              {row.finalizedBy && (
                <div className="flex items-center gap-2 text-sm">
                  <Archive className="h-4 w-4 text-neutral-500" />
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Finalisé par <strong>{row.finalizedBy.name}</strong>
                    {row.finalizedBy.at && ` le ${new Date(row.finalizedBy.at).toLocaleDateString("fr-CA")}`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Physical Return Toggle - Only editable by Gestionnaire before verification */}
          <div className={cn(
            "p-4 rounded-lg border",
            draft.physicalReturn
              ? "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30"
              : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className={cn("h-5 w-5", draft.physicalReturn ? "text-amber-600" : "text-neutral-400")} />
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-white">
                    Retour physique
                  </div>
                  <div className="text-xs text-neutral-500">
                    {draft.physicalReturn ? "La marchandise doit être vérifiée" : "Retour administratif uniquement"}
                  </div>
                </div>
              </div>
              <Switch
                checked={!!draft.physicalReturn}
                onCheckedChange={(c) => canEdit && setDraft({ ...draft, physicalReturn: c })}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Basic Info Fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Expert" value={draft.expert || ""} onChange={(v) => canEdit && setDraft({ ...draft, expert: v })} disabled={!canEdit} />
            <Field label="Client" value={draft.client || ""} onChange={(v) => canEdit && setDraft({ ...draft, client: v })} disabled={!canEdit} />
            <Field label="No. Client" value={draft.noClient ?? ""} onChange={(v) => canEdit && setDraft({ ...draft, noClient: v })} disabled={!canEdit} />
            <Field label="No. Commande" value={draft.noCommande ?? ""} onChange={(v) => canEdit && setDraft({ ...draft, noCommande: v })} disabled={!canEdit} />
            <Field label="Tracking" value={draft.tracking ?? ""} onChange={(v) => canEdit && setDraft({ ...draft, tracking: v })} icon={<Truck className="h-4 w-4" />} disabled={!canEdit} />
            <Field label="Transporteur" value={draft.transport ?? ""} onChange={(v) => canEdit && setDraft({ ...draft, transport: v })} disabled={!canEdit} />
            <Field label="Montant" value={draft.amount?.toString() ?? ""} onChange={(v) => canEdit && setDraft({ ...draft, amount: v ? Number(v) : null })} type="number" icon={<DollarSign className="h-4 w-4" />} disabled={!canEdit} />
            <Field label="Date Commande" value={draft.dateCommande ?? ""} onChange={(v) => canEdit && setDraft({ ...draft, dateCommande: v })} type="date" disabled={!canEdit} />
          </div>

          {/* Attachments */}
          <section>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-neutral-400" />
              Pièces jointes
            </h3>
            <AttachmentsSection
              returnCode={draft.id}
              attachments={draft.attachments?.map(a => ({ id: a.id, name: a.name, url: a.url, downloadUrl: a.downloadUrl })) || []}
              onAttachmentsChange={(newAttachments) => {
                const typedAttachments = newAttachments as Attachment[];
                setDraft(prev => ({ ...prev, attachments: typedAttachments }));
                onPatched({ attachments: typedAttachments });
              }}
              readOnly={isReadOnly}
            />
          </section>

          {/* Products Section */}
          <section>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-neutral-400" />
              Produits (RMA)
            </h3>
            <div className="space-y-3">
              {(draft.products ?? []).map((p, idx) => (
                <ProductDetailRow
                  key={p.id}
                  product={p}
                  showVerificationFields={showVerificationFields}
                  showFinalizationFields={showFinalizationFields}
                  canEditBase={canEdit}
                  canEditVerification={canVerify}
                  canEditFinalization={canFinalize}
                  onChange={(updatedProduct) => {
                    const arr = (draft.products ?? []).slice();
                    arr[idx] = updatedProduct;
                    setDraft({ ...draft, products: arr });
                  }}
                />
              ))}
              {(draft.products?.length ?? 0) === 0 && (
                <div className="py-8 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-400 text-sm">
                  Aucun produit
                </div>
              )}
            </div>
          </section>

          {/* ================================================================
              VERIFICATION SECTION - Only visible during/after verification
          ================================================================ */}
          {showVerificationFields && (
            <section className={cn(
              "p-4 rounded-lg border",
              canVerify
                ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
                : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950"
            )}>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-amber-600" />
                Vérification à l'entrepôt
                {!canVerify && row.verified && (
                  <Badge variant="success" className="ml-2">Complété</Badge>
                )}
              </h3>
              
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                {canVerify 
                  ? "Entrez les quantités reçues et détruites pour chaque produit ci-dessus."
                  : "Les quantités ont été vérifiées et enregistrées."}
              </div>
            </section>
          )}

          {/* ================================================================
              FINALIZATION SECTION - Only visible during/after finalization
          ================================================================ */}
          {showFinalizationFields && (
            <>
              {/* Inventory Transfer */}
              <section className={cn(
                "p-4 rounded-lg border",
                canFinalize
                  ? "border-lime-300 dark:border-lime-800 bg-lime-50 dark:bg-lime-950/30"
                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950"
              )}>
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-lime-600" />
                  Transfert d'inventaire
                  {!canFinalize && row.finalized && (
                    <Badge variant="muted" className="ml-2">Complété</Badge>
                  )}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5 block">
                      Entrepôt de départ
                    </label>
                    <select
                      value={draft.warehouseOrigin || ""}
                      onChange={(e) => canFinalize && setDraft({ ...draft, warehouseOrigin: e.target.value })}
                      disabled={!canFinalize}
                      className={cn(
                        "w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2",
                        !canFinalize
                          ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                          : "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:ring-neutral-900 dark:focus:ring-white"
                      )}
                    >
                      <option value="">Sélectionner...</option>
                      {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5 block">
                      Entrepôt de destination
                    </label>
                    <select
                      value={draft.warehouseDestination || ""}
                      onChange={(e) => canFinalize && setDraft({ ...draft, warehouseDestination: e.target.value })}
                      disabled={!canFinalize}
                      className={cn(
                        "w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2",
                        !canFinalize
                          ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                          : "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:ring-neutral-900 dark:focus:ring-white"
                      )}
                    >
                      <option value="">Sélectionner...</option>
                      {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Credits */}
              <section className={cn(
                "p-4 rounded-lg border",
                canFinalize
                  ? "border-lime-300 dark:border-lime-800 bg-lime-50 dark:bg-lime-950/30"
                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950"
              )}>
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-lime-600" />
                  Crédits
                </h3>
                
                <div className="space-y-4">
                  {/* Credit 1 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5 block">
                        Personne créditée
                      </label>
                      <select
                        value={draft.creditedTo || ""}
                        onChange={(e) => canFinalize && setDraft({ ...draft, creditedTo: e.target.value })}
                        disabled={!canFinalize}
                        className={cn(
                          "w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2",
                          !canFinalize
                            ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                            : "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:ring-neutral-900 dark:focus:ring-white"
                        )}
                      >
                        <option value="">Sélectionner...</option>
                        <option value="Expert">Expert</option>
                        <option value="Client">Client</option>
                      </select>
                    </div>
                    <Field 
                      label="Numéro de crédit" 
                      value={draft.noCredit ?? ""} 
                      onChange={(v) => canFinalize && setDraft({ ...draft, noCredit: v })} 
                      disabled={!canFinalize} 
                    />
                  </div>

                  {/* Credit 2 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5 block">
                        Personne créditée 2
                      </label>
                      <select
                        value={draft.creditedTo2 || ""}
                        onChange={(e) => canFinalize && setDraft({ ...draft, creditedTo2: e.target.value })}
                        disabled={!canFinalize}
                        className={cn(
                          "w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2",
                          !canFinalize
                            ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                            : "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:ring-neutral-900 dark:focus:ring-white"
                        )}
                      >
                        <option value="">Sélectionner...</option>
                        <option value="Expert">Expert</option>
                        <option value="Client">Client</option>
                      </select>
                    </div>
                    <Field 
                      label="Numéro de crédit 2" 
                      value={draft.noCredit2 ?? ""} 
                      onChange={(v) => canFinalize && setDraft({ ...draft, noCredit2: v })} 
                      disabled={!canFinalize} 
                    />
                  </div>

                  {/* Credit 3 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5 block">
                        Personne créditée 3
                      </label>
                      <select
                        value={draft.creditedTo3 || ""}
                        onChange={(e) => canFinalize && setDraft({ ...draft, creditedTo3: e.target.value })}
                        disabled={!canFinalize}
                        className={cn(
                          "w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2",
                          !canFinalize
                            ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                            : "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:ring-neutral-900 dark:focus:ring-white"
                        )}
                      >
                        <option value="">Sélectionner...</option>
                        <option value="Expert">Expert</option>
                        <option value="Client">Client</option>
                      </select>
                    </div>
                    <Field 
                      label="Numéro de crédit 3" 
                      value={draft.noCredit3 ?? ""} 
                      onChange={(v) => canFinalize && setDraft({ ...draft, noCredit3: v })} 
                      disabled={!canFinalize} 
                    />
                  </div>
                </div>
              </section>

              {/* Transport & Restocking */}
              <section className={cn(
                "p-4 rounded-lg border",
                canFinalize
                  ? "border-lime-300 dark:border-lime-800 bg-lime-50 dark:bg-lime-950/30"
                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950"
              )}>
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-lime-600" />
                  Transport & Restocking
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field 
                    label="Ville de livraison" 
                    value={draft.villeShipto ?? ""} 
                    onChange={(v) => canFinalize && setDraft({ ...draft, villeShipto: v })} 
                    disabled={!canFinalize} 
                  />
                  <Field 
                    label="Poids total (lb)" 
                    value={draft.totalWeight?.toString() ?? ""} 
                    onChange={(v) => canFinalize && setDraft({ ...draft, totalWeight: v ? Number(v) : null })} 
                    type="number"
                    disabled={!canFinalize} 
                  />
                  <Field 
                    label="Montant transport ($)" 
                    value={draft.transportAmount?.toString() ?? ""} 
                    onChange={(v) => canFinalize && setDraft({ ...draft, transportAmount: v ? Number(v) : null })} 
                    type="number"
                    disabled={!canFinalize} 
                  />
                  <Field 
                    label="Montant restocking ($)" 
                    value={draft.restockingAmount?.toString() ?? ""} 
                    onChange={(v) => canFinalize && setDraft({ ...draft, restockingAmount: v ? Number(v) : null })} 
                    type="number"
                    disabled={!canFinalize} 
                  />
                </div>
              </section>
            </>
          )}

          {/* Notes */}
          <section>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-neutral-400" />
              Notes
            </h3>
            <textarea
              className={cn(
                "w-full px-3 py-2.5 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2",
                !canEdit
                  ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                  : "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:ring-neutral-900 dark:focus:ring-white"
              )}
              rows={3}
              placeholder="Notes internes..."
              value={draft.description ?? ""}
              onChange={(e) => canEdit && setDraft({ ...draft, description: e.target.value })}
              disabled={!canEdit}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {isReadOnly ? "Fermer" : "Annuler"}
          </button>
          
          {/* Save Button - Only for Gestionnaire editing */}
          {canEdit && (
            <button
              disabled={busy}
              onClick={handleSave}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors",
                busy && "opacity-50 cursor-not-allowed"
              )}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
          )}

          {/* Verify Button - Only for Vérificateur */}
          {canVerify && (
            <button
              disabled={busy}
              onClick={handleVerify}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors",
                busy && "opacity-50 cursor-not-allowed"
              )}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Vérifier
            </button>
          )}

          {/* Finalize Button - Only for Facturation */}
          {canFinalize && (
            <button
              disabled={busy}
              onClick={handleFinalize}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-500 text-white text-sm font-medium hover:bg-lime-600 transition-colors",
                busy && "opacity-50 cursor-not-allowed"
              )}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              Finaliser
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
//   PRODUCT DETAIL ROW - With verification and finalization fields
// =============================================================================

function ProductDetailRow({
  product,
  showVerificationFields,
  showFinalizationFields,
  canEditBase,
  canEditVerification,
  canEditFinalization,
  onChange,
}: {
  product: ProductLine;
  showVerificationFields: boolean;
  showFinalizationFields: boolean;
  canEditBase: boolean;
  canEditVerification: boolean;
  canEditFinalization: boolean;
  onChange: (p: ProductLine) => void;
}) {
  return (
    <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3">
      {/* Base Product Info */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-28">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-1">Code</label>
          <input
            className={cn(
              "w-full h-9 px-2.5 rounded-md text-sm font-mono border focus:outline-none focus:ring-1",
              !canEditBase
                ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-900 dark:focus:ring-white"
            )}
            value={product.codeProduit}
            onChange={(e) => canEditBase && onChange({ ...product, codeProduit: e.target.value })}
            disabled={!canEditBase}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-1">Description</label>
          <input
            className={cn(
              "w-full h-9 px-2.5 rounded-md text-sm border focus:outline-none focus:ring-1",
              !canEditBase
                ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-900 dark:focus:ring-white"
            )}
            value={product.descriptionProduit || ""}
            onChange={(e) => canEditBase && onChange({ ...product, descriptionProduit: e.target.value })}
            disabled={!canEditBase}
          />
        </div>
        <div className="w-20">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-1">Qté</label>
          <input
            type="number"
            min={0}
            className={cn(
              "w-full h-9 px-2.5 rounded-md text-sm text-center border focus:outline-none focus:ring-1",
              !canEditBase
                ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-900 dark:focus:ring-white"
            )}
            value={product.quantite}
            onChange={(e) => canEditBase && onChange({ ...product, quantite: Number(e.target.value || 0) })}
            disabled={!canEditBase}
          />
        </div>
      </div>

      {/* Verification Fields - Quantity received, destroyed, inventory */}
      {showVerificationFields && (
        <div className={cn(
          "pt-3 border-t border-neutral-100 dark:border-neutral-800",
          canEditVerification && "border-amber-200 dark:border-amber-800"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className={cn("h-3.5 w-3.5", canEditVerification ? "text-amber-500" : "text-neutral-400")} />
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Vérification</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Qté reçue</label>
              <input
                type="number"
                min={0}
                className={cn(
                  "w-full h-9 px-2.5 rounded-md text-sm text-center border focus:outline-none focus:ring-1",
                  !canEditVerification
                    ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                    : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-neutral-900 dark:text-white focus:ring-amber-500"
                )}
                value={product.quantiteRecue ?? ""}
                onChange={(e) => {
                  if (!canEditVerification) return;
                  const qteRecue = Number(e.target.value || 0);
                  const qteDetruite = product.qteDetruite ?? 0;
                  onChange({ 
                    ...product, 
                    quantiteRecue: qteRecue,
                    qteInventaire: qteRecue - qteDetruite 
                  });
                }}
                disabled={!canEditVerification}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Qté détruite</label>
              <input
                type="number"
                min={0}
                max={product.quantiteRecue ?? 0}
                className={cn(
                  "w-full h-9 px-2.5 rounded-md text-sm text-center border focus:outline-none focus:ring-1",
                  !canEditVerification
                    ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                    : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-neutral-900 dark:text-white focus:ring-amber-500"
                )}
                value={product.qteDetruite ?? ""}
                onChange={(e) => {
                  if (!canEditVerification) return;
                  const qteDetruite = Math.min(Number(e.target.value || 0), product.quantiteRecue ?? 0);
                  const qteRecue = product.quantiteRecue ?? 0;
                  onChange({ 
                    ...product, 
                    qteDetruite: qteDetruite,
                    qteInventaire: qteRecue - qteDetruite 
                  });
                }}
                disabled={!canEditVerification}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Qté inventaire</label>
              <input
                type="number"
                className="w-full h-9 px-2.5 rounded-md text-sm text-center border bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                value={product.qteInventaire ?? ((product.quantiteRecue ?? 0) - (product.qteDetruite ?? 0))}
                disabled
              />
            </div>
          </div>
        </div>
      )}

      {/* Finalization Fields - Restocking rate */}
      {showFinalizationFields && (
        <div className={cn(
          "pt-3 border-t border-neutral-100 dark:border-neutral-800",
          canEditFinalization && "border-lime-200 dark:border-lime-800"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Scale className={cn("h-3.5 w-3.5", canEditFinalization ? "text-lime-500" : "text-neutral-400")} />
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Restocking</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Taux restocking</label>
              <select
                className={cn(
                  "w-full h-9 px-2.5 rounded-md text-sm border focus:outline-none focus:ring-1",
                  !canEditFinalization
                    ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                    : "bg-lime-50 dark:bg-lime-950/30 border-lime-200 dark:border-lime-800 text-neutral-900 dark:text-white focus:ring-lime-500"
                )}
                value={`${(product.tauxRestock ?? 0)}%`}
                onChange={(e) => {
                  if (!canEditFinalization) return;
                  const rate = parseFloat(e.target.value.replace('%', ''));
                  onChange({ ...product, tauxRestock: rate });
                }}
                disabled={!canEditFinalization}
              >
                {RESTOCK_RATES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Poids total</label>
              <input
                type="text"
                className="w-full h-9 px-2.5 rounded-md text-sm border bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                value={product.poidsTotal ? `${product.poidsTotal} lb` : "—"}
                disabled
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  icon,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5 block">{label}</span>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">{icon}</div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full h-10 rounded-lg border text-sm focus:outline-none focus:ring-2 [color-scheme:light] dark:[color-scheme:dark]",
            icon ? "pl-9 pr-3" : "px-3",
            disabled
              ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
              : "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:ring-neutral-900 dark:focus:ring-white"
          )}
        />
      </div>
    </label>
  );
}

// =============================================================================
//   NEW RETURN MODAL - Only for Gestionnaire
// =============================================================================

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

  React.useEffect(() => {
    const fetchNextId = async () => {
      try {
        const res = await fetch("/api/returns?mode=next_id");
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.nextId) setNextId(`R${json.nextId}`);
        }
      } catch (error) {
        console.error("Failed to fetch next ID", error);
      }
    };
    fetchNextId();
  }, []);

  const addProduct = () =>
    setProducts((p) => [
      ...p,
      { id: `np-${Date.now()}`, codeProduit: "", descriptionProduit: "", descriptionRetour: "", quantite: 1 },
    ]);
  const removeProduct = (pid: string) => setProducts((p) => p.filter((x) => x.id !== pid));

  const onFetchFromOrder = async () => {
    if (!noCommande.trim()) return;
    setOrderLookupLoading(true);
    try {
      const data = await lookupOrder(noCommande);
      if (!data) return;
      if (data.customerName || data.CustomerName) setClient(data.customerName || data.CustomerName);
      if (data.salesrepName || data.SalesrepName) setExpert(data.salesrepName || data.SalesrepName);
      if (data.carrierName || data.CarrierName) setTransport(data.carrierName || data.CarrierName);
      if (data.tracking || data.TrackingNumber) setTracking(data.tracking || data.TrackingNumber);
      if (data.orderDate || data.OrderDate) setDateCommande(String(data.orderDate || data.OrderDate).slice(0, 10));
      if (data.totalamt != null) setAmount(String(data.totalamt));
      const customerCode = data.noClient ?? data.custCode ?? data.CustCode ?? "";
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
          ...p,
          codeProduit: p.codeProduit.trim(),
          descriptionProduit: p.descriptionProduit?.trim() || "",
          descriptionRetour: p.descriptionRetour?.trim() || "",
        })),
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

  // Prevent scrolling background
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center font-mono text-sm font-medium">
              {nextId.replace('R', '')}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Nouveau retour</h2>
              <p className="text-sm text-neutral-500">{currentUserName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">

          {/* Quick Lookup */}
          <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Recherche par commande
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={noCommande}
                onChange={(e) => setNoCommande(e.target.value)}
                onBlur={onFetchFromOrder}
                onKeyDown={(e) => e.key === "Enter" && onFetchFromOrder()}
                placeholder="Entrez un numéro de commande"
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-mono text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
              {orderLookupLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 animate-spin" />
              )}
            </div>
          </div>

          {/* Physical Return Toggle */}
          <div
            onClick={() => setPhysicalReturn(!physicalReturn)}
            className={cn(
              "p-4 rounded-lg border cursor-pointer transition-colors",
              physicalReturn
                ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
                : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className={cn("h-5 w-5", physicalReturn ? "text-amber-600" : "text-neutral-400")} />
                <div>
                  <div className={cn("text-sm font-medium", physicalReturn ? "text-amber-900 dark:text-amber-100" : "text-neutral-900 dark:text-white")}>
                    Retour physique
                  </div>
                  <div className="text-xs text-neutral-500">
                    {physicalReturn ? "Requiert vérification à la réception" : "Retour administratif uniquement"}
                  </div>
                </div>
              </div>
              <Switch checked={physicalReturn} onCheckedChange={setPhysicalReturn} />
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <input
                type="date"
                value={reportedAt}
                onChange={(e) => setReportedAt(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white [color-scheme:light] dark:[color-scheme:dark]"
              />
            </FormField>
            <FormField label="Signalé par" required>
              <select
                value={reporter}
                onChange={(e) => setReporter(e.target.value as Reporter)}
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              >
                {Object.entries(REPORTER_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Cause" required>
              <select
                value={cause}
                onChange={(e) => setCause(e.target.value as Cause)}
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              >
                {CAUSES_IN_ORDER.map((c) => (
                  <option key={c} value={c}>{CAUSE_LABEL[c]}</option>
                ))}
              </select>
            </FormField>
            <FormField label="No. client">
              <input
                value={noClient}
                onChange={(e) => setNoClient(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                placeholder="12345"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Expert" required>
              <input
                value={expert}
                onChange={(e) => setExpert(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                placeholder="Nom du représentant"
              />
            </FormField>
            <FormField label="Client" required>
              <input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                placeholder="Nom du client"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FormField label="Tracking">
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm font-mono text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                placeholder="1Z999..."
              />
            </FormField>
            <FormField label="Transporteur">
              <input
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                placeholder="Purolator"
              />
            </FormField>
            <FormField label="Montant">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                placeholder="0.00"
              />
            </FormField>
            <FormField label="Date commande">
              <input
                type="date"
                value={dateCommande}
                onChange={(e) => setDateCommande(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white [color-scheme:light] dark:[color-scheme:dark]"
              />
            </FormField>
          </div>

          {/* Products */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-neutral-400" />
                Produits (RMA)
              </h3>
              <button
                onClick={addProduct}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            </div>
            {products.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-400 text-sm">
                Aucun produit
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((p, idx) => (
                  <NewProductRow
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
              </div>
            )}
          </section>

          {/* Attachments */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-neutral-400" />
                Pièces jointes
              </h3>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer">
                <UploadCloud className="h-3.5 w-3.5" />
                Ajouter
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setFilesToUpload((prev) => [...prev, ...Array.from(e.target.files || [])]);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
            {filesToUpload.length > 0 && (
              <div className="space-y-2">
                {filesToUpload.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{f.name}</span>
                    </div>
                    <button
                      onClick={() => setFilesToUpload((prev) => prev.filter((_, idx) => idx !== i))}
                      className="p-1 rounded text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-neutral-400" />
              Notes
            </h3>
            <textarea
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white resize-none"
              rows={3}
              placeholder="Notes internes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </section>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <OptionToggle
              label="Pickup"
              checked={isPickup}
              onToggle={() => setIsPickup(!isPickup)}
              inputValue={noBill}
              onInputChange={setNoBill}
              inputPlaceholder="No. Bill"
              disabled={!isPickup}
            />
            <OptionToggle
              label="Commande"
              checked={isCommande}
              onToggle={() => setIsCommande(!isCommande)}
              inputValue={noBonCommande}
              onInputChange={setNoBonCommande}
              inputPlaceholder="No. Bon"
              disabled={!isCommande}
            />
            <OptionToggle
              label="Réclamation"
              checked={isReclamation}
              onToggle={() => setIsReclamation(!isReclamation)}
              inputValue={noReclamation}
              onInputChange={setNoReclamation}
              inputPlaceholder="No. Récl."
              disabled={!isReclamation}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Annuler
          </button>
          <button
            disabled={busy}
            onClick={submit}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors",
              busy && "opacity-50 cursor-not-allowed"
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Créer le retour
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5 block">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function OptionToggle({
  label,
  checked,
  onToggle,
  inputValue,
  onInputChange,
  inputPlaceholder,
  disabled,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  inputValue: string;
  onInputChange: (v: string) => void;
  inputPlaceholder: string;
  disabled: boolean;
}) {
  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors",
      checked
        ? "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
        : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 opacity-60"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-neutral-900 dark:text-white">{label}</span>
        <button
          onClick={onToggle}
          className={cn(
            "relative h-5 w-9 rounded-full transition-colors",
            checked ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-700"
          )}
        >
          <span className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform shadow-sm",
            checked ? "translate-x-4 bg-white dark:bg-neutral-900" : "bg-white dark:bg-neutral-400"
          )} />
        </button>
      </div>
      <input
        disabled={disabled}
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        className="w-full h-8 px-2.5 rounded-md text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder:text-neutral-400 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
        placeholder={inputPlaceholder}
      />
    </div>
  );
}

function NewProductRow({
  product,
  onChange,
  onRemove,
}: {
  product: ProductLine;
  onChange: (p: ProductLine) => void;
  onRemove: () => void;
}) {
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
      } catch (error) {
        console.error(error);
      }
    };
    fetchSuggestions();
    return () => { active = false; };
  }, [debouncedCode, showSuggestions]);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 group">
      <div className="relative flex-shrink-0 w-32">
        <input
          className="w-full h-9 px-2.5 rounded-md text-sm font-mono border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
          placeholder="Code"
          value={product.codeProduit}
          onChange={(e) => {
            onChange({ ...product, codeProduit: e.target.value });
            setShowSuggestions(true);
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 mt-1 w-64 max-h-48 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
            {suggestions.map((s) => (
              <button
                key={s.code}
                className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                onClick={() => {
                  onChange({ ...product, codeProduit: s.code, descriptionProduit: s.descr || product.descriptionProduit });
                  setShowSuggestions(false);
                }}
              >
                <div className="font-mono font-medium text-neutral-900 dark:text-white">{s.code}</div>
                <div className="text-xs text-neutral-500 truncate">{s.descr}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        className="flex-1 h-9 px-2.5 rounded-md text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
        placeholder="Description"
        value={product.descriptionProduit || ""}
        onChange={(e) => onChange({ ...product, descriptionProduit: e.target.value })}
      />
      <input
        className="flex-1 h-9 px-2.5 rounded-md text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
        placeholder="Raison"
        value={product.descriptionRetour ?? ""}
        onChange={(e) => onChange({ ...product, descriptionRetour: e.target.value })}
      />
      <input
        type="number"
        min={0}
        className="w-20 h-9 px-2.5 rounded-md text-sm text-center border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
        placeholder="Qté"
        value={product.quantite}
        onChange={(e) => onChange({ ...product, quantite: Number(e.target.value || 0) })}
      />
      <button
        onClick={onRemove}
        className="p-2 rounded-md text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
