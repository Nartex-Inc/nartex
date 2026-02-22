"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
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
  Warehouse,
  CreditCard,
  History,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachmentsSection } from "@/components/returns/AttachmentsSection";
import { ReturnComments } from "@/components/returns/ReturnComments";

import type { ReturnRow, Reporter, Cause, Attachment, ProductLine, ItemSuggestion } from "@/types/returns";
import { calculateShippingCost } from "@/types/returns";

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
  client: "Client",
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
  "expedition",
  "defect",
  "client",
  "expert",
  "fournisseur",
  "exposition_sinto",
  "surplus_inventaire",
  "prise_commande",
  "analyse",
  "rappel",
  "redirection",
  "autre_cause",
  "autre",
];

const RESTOCK_RATES = ["0%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%"];

type UserRole = "Gestionnaire" | "Vérificateur" | "Facturation" | "Expert" | "Analyste" | string;

// =============================================================================
//   SEARCH AUTOCOMPLETE (generic)
// =============================================================================

function SearchAutocomplete({
  value,
  onChange,
  disabled,
  className,
  placeholder,
  icon,
  fetchUrl,
  responseKey,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  fetchUrl: string;
  responseKey: string;
}) {
  const [options, setOptions] = React.useState<string[]>([]);
  const [open, setOpen] = React.useState(false);
  const [highlightIdx, setHighlightIdx] = React.useState(-1);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch(fetchUrl, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => { if (!cancelled && json.ok && Array.isArray(json[responseKey])) setOptions(json[responseKey]); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [fetchUrl, responseKey]);

  const filtered = React.useMemo(() => {
    if (!value.trim()) return options;
    const lower = value.toLowerCase();
    return options.filter((e) => e.toLowerCase().includes(lower));
  }, [value, options]);

  React.useEffect(() => { setHighlightIdx(-1); }, [filtered]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  React.useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIdx] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx]);

  const select = (name: string) => { onChange(name); setOpen(false); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx((i) => (i + 1) % filtered.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx((i) => (i <= 0 ? filtered.length - 1 : i - 1)); }
    else if (e.key === "Enter" && highlightIdx >= 0) { e.preventDefault(); select(filtered[highlightIdx]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        {icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]">{icon}</div>}
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(className, icon && "pl-10")}
        />
      </div>
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-[300] mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-xl py-1"
        >
          {filtered.map((name, idx) => (
            <li
              key={name}
              onMouseDown={() => select(name)}
              onMouseEnter={() => setHighlightIdx(idx)}
              className={cn(
                "px-4 py-2.5 text-sm cursor-pointer transition-colors duration-100",
                idx === highlightIdx
                  ? "bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-primary))]"
                  : "text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))]",
                name === value && "font-medium text-[hsl(var(--text-primary))]"
              )}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExpertAutocomplete(props: Omit<React.ComponentProps<typeof SearchAutocomplete>, "fetchUrl" | "responseKey">) {
  return <SearchAutocomplete {...props} fetchUrl="/api/prextra/experts" responseKey="experts" />;
}

function SiteAutocomplete(props: Omit<React.ComponentProps<typeof SearchAutocomplete>, "fetchUrl" | "responseKey">) {
  return <SearchAutocomplete {...props} fetchUrl="/api/prextra/sites" responseKey="sites" />;
}

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
  history?: boolean;
}): Promise<ReturnRow[]> {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (params.dateFrom) usp.set("dateFrom", params.dateFrom);
  if (params.dateTo) usp.set("dateTo", params.dateTo);
  if (params.history) usp.set("history", "true");
  if (params.take) usp.set("take", String(params.take));

  try {
    const res = await fetch(`/api/returns?${usp.toString()}`, { credentials: "include", cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.ok && Array.isArray(json.data) ? json.data : [];
  } catch { return []; }
}

async function createReturn(payload: Record<string, unknown>) {
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

async function updateReturn(code: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/returns/${encodeURIComponent(code)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Mise à jour échouée");
}

async function deleteReturn(code: string): Promise<void> {
  const res = await fetch(`/api/returns/${encodeURIComponent(code)}`, { method: "DELETE", credentials: "include" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error || "Suppression échouée");
}

async function verifyReturn(code: string, data: { products: ProductLine[] }): Promise<void> {
  const res = await fetch(`/api/returns/${encodeURIComponent(code)}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Vérification échouée");
}

async function finalizeReturn(code: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/returns/${encodeURIComponent(code)}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Finalisation échouée");
}

async function unverifyReturn(code: string): Promise<void> {
  const res = await fetch(`/api/returns/${encodeURIComponent(code)}/unverify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Annulation de vérification échouée");
}

async function standbyReturn(code: string, action: "standby" | "reactivate"): Promise<void> {
  const res = await fetch(`/api/returns/${encodeURIComponent(code)}/standby`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Opération échouée");
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

async function lookupOrder(noCommande: string) {
  if (!noCommande.trim()) return null;
  const res = await fetch(`/api/prextra/order?no_commande=${encodeURIComponent(noCommande.trim())}`, { cache: "no-store", credentials: "include" });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json || json.exists === false) return null;
  return {
    sonbr: json.sonbr ?? json.sonNbr ?? noCommande,
    orderDate: json.orderDate ?? json.OrderDate ?? null,
    totalamt: json.totalamt ?? json.totalAmt ?? null,
    customerName: json.customerName ?? json.CustomerName ?? null,
    carrierName: json.carrierName ?? json.CarrierName ?? null,
    salesrepName: json.salesrepName ?? json.SalesrepName ?? null,
    tracking: json.tracking ?? json.TrackingNumber ?? null,
    noClient: json.noClient ?? json.custCode ?? json.CustCode ?? null,
  };
}

async function searchItems(q: string): Promise<ItemSuggestion[]> {
  if (!q.trim()) return [];
  const res = await fetch(`/api/items?q=${encodeURIComponent(q)}`, { cache: "no-store", credentials: "include" });
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
//   ROLE-BASED FILTERING
// =============================================================================

function filterReturnsByRole(returns: ReturnRow[], role: UserRole, showHistory: boolean): ReturnRow[] {
  if (showHistory) return returns.filter(r => r.finalized);
  
  // Normalize role for comparison (handle accent variations)
  const normalizedRole = role?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || "";
  
  // Gestionnaire/Administrateur sees ALL non-finalized: white (draft), black (awaiting physical), green (ready)
  if (normalizedRole === "gestionnaire" || normalizedRole === "administrateur") {
    return returns.filter(r => !r.finalized);
  }
  
  // Vérificateur sees ONLY BLACK rows: physical return required, not yet verified
  if (normalizedRole === "verificateur") {
    return returns.filter(r => 
      !r.finalized && 
      !r.isDraft && 
      r.physicalReturn === true && 
      r.verified === false
    );
  }
  
  // Facturation sees ONLY GREEN rows: ready for finalization
  if (normalizedRole === "facturation") {
    return returns.filter(r => 
      !r.finalized && 
      !r.isDraft && 
      (r.physicalReturn === false || (r.physicalReturn === true && r.verified === true))
    );
  }
  
  // Other roles (Expert, Analyste) see non-draft, non-finalized
  return returns.filter(r => !r.finalized && !r.isDraft);
}

// =============================================================================
//   SHARED UI COMPONENTS
// =============================================================================

function Switch({ checked, onCheckedChange, label, disabled }: { checked: boolean; onCheckedChange: (c: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200",
          checked ? "bg-[hsl(var(--text-primary))] border-[hsl(var(--text-primary))]" : "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-strong))]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={cn(
          "pointer-events-none block h-4 w-4 rounded-full shadow-sm transition-transform duration-200",
          checked ? "translate-x-4 bg-[hsl(var(--bg-surface))]" : "translate-x-0 bg-[hsl(var(--bg-surface))]"
        )} />
      </button>
      {label && <span className={cn("text-sm font-medium", disabled ? "text-[hsl(var(--text-muted))]" : "text-[hsl(var(--text-secondary))]")}>{label}</span>}
    </div>
  );
}

function Badge({ children, variant = "default", className }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "muted"; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
      variant === "default" && "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))]",
      variant === "success" && "bg-[hsl(var(--success-muted))] text-[hsl(var(--success))]",
      variant === "warning" && "bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))]",
      variant === "muted" && "bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-muted))]",
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
type RowStatus = "draft" | "awaiting_physical" | "ready" | "finalized" | "standby";

export default function ReturnsPage() {
  const { data: session } = useSession();
  const userRole: UserRole = (session?.user as { role?: string })?.role || "Expert";
  
  // Normalize role for permission checks
  const normalizedUserRole = userRole?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || "";
  const canCreate = normalizedUserRole === "gestionnaire" || normalizedUserRole === "administrateur";

  const [query, setQuery] = React.useState("");
  const [submittedQuery, setSubmittedQuery] = React.useState("");
  const [cause, setCause] = React.useState<"all" | Cause>("all");
  const [reporter, setReporter] = React.useState<"all" | Reporter>("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [rows, setRows] = React.useState<ReturnRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [sortKey, setSortKey] = React.useState<SortKey>("reportedAt");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [openNew, setOpenNew] = React.useState(false);

  const selected = React.useMemo(() => rows.find((r) => String(r.id) === openId) ?? null, [rows, openId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReturns({ q: submittedQuery, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, history: showHistory });
      setRows(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [submittedQuery, dateFrom, dateTo, showHistory]);

  React.useEffect(() => { load(); }, [load]);

  const filteredByRole = React.useMemo(() => {
    let result = filterReturnsByRole(rows, userRole, showHistory);
    if (cause !== "all") result = result.filter((r) => r.cause === cause);
    if (reporter !== "all") result = result.filter((r) => r.reporter === reporter);
    return result;
  }, [rows, userRole, showHistory, cause, reporter]);

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
    const copy = [...filteredByRole];
    copy.sort((a, b) => {
      const va = get(a), vb = get(b);
      if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
      const res = String(va ?? "").localeCompare(String(vb ?? ""), "fr", { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? res : -res;
    });
    return copy;
  }, [filteredByRole, sortKey, sortDir]);

  const stats = React.useMemo(() => ({
    total: filteredByRole.length,
    draft: filteredByRole.filter((r) => r.status === "draft" || r.isDraft).length,
    awaiting: filteredByRole.filter((r) => r.physicalReturn && !r.verified && !r.finalized).length,
    ready: filteredByRole.filter((r) => (!r.physicalReturn || r.verified) && !r.finalized && !r.isDraft).length,
  }), [filteredByRole]);

  const onDelete = async (code: string) => {
    if (!confirm(`Supprimer le retour ${code} ?`)) return;
    const prev = rows;
    setRows((r) => r.filter((x) => String(x.id) !== code));
    try { await deleteReturn(code); } catch (e) { alert(e instanceof Error ? e.message : "La suppression a échoué"); setRows(prev); }
  };

  const onStandby = async (code: string, action: "standby" | "reactivate") => {
    try { await standbyReturn(code, action); await load(); } catch (e) { alert(e instanceof Error ? e.message : "Opération échouée"); }
  };

  const onReset = () => { setQuery(""); setSubmittedQuery(""); setCause("all"); setReporter("all"); setDateFrom(""); setDateTo(""); };

  const toggleSort = (key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) { setSortDir((prev) => (prev === "asc" ? "desc" : "asc")); return prevKey; }
      setSortDir("asc");
      return key;
    });
  };

  const hasActiveFilters = cause !== "all" || reporter !== "all" || dateFrom || dateTo;

  const getRowStatus = (row: ReturnRow): RowStatus => {
    if (row.standby) return "standby";
    if (row.finalized) return "finalized";
    if (row.isDraft || row.status === "draft") return "draft";
    if (row.physicalReturn && !row.verified) return "awaiting_physical";
    return "ready";
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-elevated))] font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[hsl(var(--text-primary))]">Retours</h1>
              <p className="mt-1 text-sm text-[hsl(var(--text-tertiary))]">{userRole} · Gérez les demandes de retours et les réceptions</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  showHistory
                    ? "bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))]"
                    : "bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] hover:bg-[hsl(var(--bg-elevated))]"
                )}
              >
                <History className="h-4 w-4" />
                {showHistory ? "Historique" : "Actifs"}
              </button>
              {canCreate && (
                <button onClick={() => setOpenNew(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[hsl(var(--text-primary))] text-[hsl(var(--bg-base))] text-sm font-medium shadow-sm hover:opacity-90 transition-colors">
                  <Plus className="h-4 w-4" />
                  Nouveau retour
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Brouillons" value={stats.draft} variant="muted" />
            <StatCard label="En attente" value={stats.awaiting} variant="warning" />
            <StatCard label="Prêts" value={stats.ready} variant="success" />
          </div>
        </header>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--text-muted))]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setSubmittedQuery(query); }} placeholder="Rechercher par client, commande, expert..." className="w-full h-10 pl-9 pr-4 rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] transition-shadow" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={cn("inline-flex items-center gap-2 px-4 h-10 rounded-lg border text-sm font-medium transition-colors", hasActiveFilters ? "border-[hsl(var(--text-primary))] bg-[hsl(var(--text-primary))] text-[hsl(var(--bg-base))]" : "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))]")}>
              <Filter className="h-4 w-4" />
              Filtres
              {hasActiveFilters && <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--bg-surface))] text-xs text-[hsl(var(--text-primary))]">{[cause !== "all", reporter !== "all", dateFrom, dateTo].filter(Boolean).length}</span>}
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => load()} className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] transition-colors" title="Rafraîchir"><RotateCcw className="h-4 w-4" /></button>
              {hasActiveFilters && <button onClick={onReset} className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--danger))] transition-colors" title="Réinitialiser"><X className="h-4 w-4" /></button>}
            </div>
          </div>
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))]">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide">Cause</label>
                <select value={cause} onChange={(e) => setCause(e.target.value as Cause | "all")} className="h-9 px-3 rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] focus:outline-none">
                  <option value="all">Toutes</option>
                  {CAUSES_IN_ORDER.map((c) => <option key={c} value={c}>{CAUSE_LABEL[c]}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide">Signaleur</label>
                <select value={reporter} onChange={(e) => setReporter(e.target.value as Reporter | "all")} className="h-9 px-3 rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] focus:outline-none">
                  <option value="all">Tous</option>
                  {(["expert", "transporteur", "client", "autre"] as string[]).map((r) => <option key={r} value={r}>{REPORTER_LABEL[r] ?? r}</option>)}
                </select>
              </div>
              <div className="h-6 w-px bg-[hsl(var(--border-default))] hidden sm:block" />
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide">Du</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 px-3 rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] focus:outline-none [color-scheme:light] dark:[color-scheme:dark]" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide">Au</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 px-3 rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] focus:outline-none [color-scheme:light] dark:[color-scheme:dark]" />
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm overflow-hidden">
          {loading && <div className="flex flex-col items-center justify-center py-24"><Loader2 className="h-8 w-8 text-[hsl(var(--text-muted))] animate-spin mb-3" /><p className="text-sm text-[hsl(var(--text-tertiary))]">Chargement...</p></div>}
          {error && <div className="flex flex-col items-center justify-center py-24 text-[hsl(var(--danger))]"><p className="text-sm">{error}</p></div>}
          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border-default))]">
                      <SortTh label="ID" sortKey="id" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Date" sortKey="reportedAt" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Cause" sortKey="cause" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Client / Expert" sortKey="client" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Commande" sortKey="noCommande" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Tracking" sortKey="tracking" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide">Fichiers</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border-subtle))]">
                    {sorted.map((row) => {
                      const status = getRowStatus(row);
                      const hasFiles = (row.attachments?.length ?? 0) > 0;
                      const rowId = String(row.id);
                      return (
                        <tr key={rowId} onClick={() => setOpenId(rowId)} className={cn("group cursor-pointer transition-colors",
                          status === "draft" && "bg-white text-black hover:bg-gray-100",
                          status === "awaiting_physical" && "bg-black text-white hover:opacity-90",
                          status === "ready" && "bg-[hsl(var(--success))] text-white hover:opacity-90",
                          status === "finalized" && "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-muted))]",
                          status === "standby" && "bg-purple-600 text-white hover:opacity-90"
                        )}>
                          <td className="px-4 py-3 font-mono font-medium whitespace-nowrap">{rowId.replace('R', '')}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{new Date(row.reportedAt).toLocaleDateString("fr-CA")}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
                              status === "awaiting_physical" && "bg-white/20 text-white",
                              status === "ready" && "bg-[hsl(var(--bg-base))]/10 text-[hsl(var(--text-primary))]",
                              status === "draft" && "bg-gray-200 text-gray-700",
                              status === "finalized" && "bg-[hsl(var(--bg-muted))]/50 text-[hsl(var(--text-muted))]",
                              status === "standby" && "bg-white/20 text-white"
                            )}>{CAUSE_LABEL[row.cause]}</span>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <div className={cn("font-medium truncate", status === "finalized" && "text-[hsl(var(--text-muted))]")}>{row.client}</div>
                            <div className={cn("text-xs truncate", status === "awaiting_physical" && "text-white/70", status === "ready" && "text-[hsl(var(--text-primary))]/70", status === "draft" && "text-gray-500", status === "finalized" && "text-[hsl(var(--text-muted))]", status === "standby" && "text-white/70")}>{row.expert}</div>
                          </td>
                          <td className="px-4 py-3 font-mono whitespace-nowrap">{row.noCommande || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{row.tracking ? <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 opacity-70" /><span className="font-mono text-xs">{row.tracking}</span></span> : "—"}</td>
                          <td className="px-4 py-3">{hasFiles && <span className={cn("inline-flex items-center gap-1 text-xs font-medium", status === "awaiting_physical" && "text-white/80", status === "ready" && "text-[hsl(var(--text-primary))]/80")}><Paperclip className="h-3.5 w-3.5" />{row.attachments!.length}</span>}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); setOpenId(rowId); }} className={cn("p-1.5 rounded-md transition-colors", status === "awaiting_physical" && "hover:bg-white/20 text-white", status === "ready" && "hover:bg-[hsl(var(--bg-base))]/10 text-[hsl(var(--text-primary))]", status === "draft" && "hover:bg-gray-200 text-gray-600", status === "finalized" && "hover:bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-tertiary))]", status === "standby" && "hover:bg-white/20 text-white")} title="Voir"><Eye className="h-4 w-4" /></button>
                              {canCreate && !showHistory && status !== "draft" && status !== "finalized" && (
                                <button onClick={(e) => { e.stopPropagation(); onStandby(rowId, "standby"); }} className={cn("p-1.5 rounded-md transition-colors", status === "awaiting_physical" && "hover:bg-white/20 text-white", status === "ready" && "hover:bg-[hsl(var(--bg-base))]/10 text-[hsl(var(--text-primary))]")} title="Mettre en standby"><Pause className="h-4 w-4" /></button>
                              )}
                              {canCreate && showHistory && status === "standby" && (
                                <button onClick={(e) => { e.stopPropagation(); onStandby(rowId, "reactivate"); }} className="p-1.5 rounded-md transition-colors hover:bg-white/20 text-white" title="Réactiver"><Play className="h-4 w-4" /></button>
                              )}
                              {canCreate && <button onClick={(e) => { e.stopPropagation(); onDelete(rowId); }} className={cn("p-1.5 rounded-md transition-colors", status === "awaiting_physical" && "hover:bg-[hsl(var(--danger))]/30 text-white hover:text-[hsl(var(--danger-muted))]", status === "ready" && "hover:bg-[hsl(var(--danger))]/20 text-[hsl(var(--text-primary))] hover:text-[hsl(var(--danger))]", status === "draft" && "hover:bg-red-100 text-gray-500 hover:text-red-600", status === "finalized" && "hover:bg-[hsl(var(--danger-muted))] text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--danger))]", status === "standby" && "hover:bg-[hsl(var(--danger))]/30 text-white hover:text-[hsl(var(--danger-muted))]")} title="Supprimer"><Trash2 className="h-4 w-4" /></button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {sorted.length === 0 && <div className="flex flex-col items-center justify-center py-24 text-[hsl(var(--text-muted))]"><Package className="h-10 w-10 mb-3 opacity-50" /><p className="text-sm">Aucun résultat</p></div>}
              </div>
              <div className="px-4 py-3 border-t border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] flex items-center justify-between text-xs text-[hsl(var(--text-tertiary))]">
                <span>{sorted.length} retour{sorted.length !== 1 ? "s" : ""}</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[hsl(var(--success))]" />Prêt</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-black" />En attente</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded border border-gray-300 bg-white" />Brouillon</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-purple-600" />Standby</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selected && <DetailModal row={selected} userRole={userRole} onClose={() => setOpenId(null)} onRefresh={load} />}
      {openNew && <NewReturnModal onClose={() => setOpenNew(false)} onCreated={async () => { setOpenNew(false); await load(); }} />}
    </div>
  );
}

function StatCard({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "success" | "warning" | "muted" }) {
  return (
    <div className={cn("px-4 py-3 rounded-lg border",
      variant === "default" && "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))]",
      variant === "success" && "border-[hsl(var(--success))]/20 bg-[hsl(var(--success-muted))]",
      variant === "warning" && "border-[hsl(var(--warning))]/20 bg-[hsl(var(--warning-muted))]",
      variant === "muted" && "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))]"
    )}>
      <div className={cn("text-2xl font-semibold tabular-nums",
        variant === "default" && "text-[hsl(var(--text-primary))]",
        variant === "success" && "text-[hsl(var(--success))]",
        variant === "warning" && "text-[hsl(var(--warning))]",
        variant === "muted" && "text-[hsl(var(--text-tertiary))]"
      )}>{value}</div>
      <div className="text-xs text-[hsl(var(--text-tertiary))] mt-0.5">{label}</div>
    </div>
  );
}

function SortTh({ label, sortKey, currentKey, dir, onSort }: { label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir; onSort: (key: SortKey) => void }) {
  const active = sortKey === currentKey;
  return (
    <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide cursor-pointer select-none hover:text-[hsl(var(--text-primary))] transition-colors" onClick={() => onSort(sortKey)}>
      <span className="inline-flex items-center gap-1.5">
        {label}
        {active && (dir === "asc" ? <ArrowUpNarrowWide className="h-3.5 w-3.5 text-[hsl(var(--text-primary))]" /> : <ArrowDownNarrowWide className="h-3.5 w-3.5 text-[hsl(var(--text-primary))]" />)}
      </span>
    </th>
  );
}

// =============================================================================
//   DETAIL MODAL - With RBAC Verification & Finalization
// =============================================================================

function DetailModal({
  row,
  userRole,
  onClose,
  onRefresh,
}: {
  row: ReturnRow;
  userRole: UserRole;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const { data: session } = useSession();
  const [draft, setDraft] = React.useState<ReturnRow>({ ...row });
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => setDraft({ ...row }), [row]);

  // Normalize role for comparison (handle accent variations)
  const normalizeRole = (r: string) => r?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || "";
  const normalizedRole = normalizeRole(userRole);

  // Creator info
  const creatorName = draft.createdBy?.name ?? session?.user?.name ?? REPORTER_LABEL[draft.reporter];
  const creatorDate = draft.createdBy?.at ? new Date(draft.createdBy.at) : new Date(draft.reportedAt);

  // Status flags
  const isPhysical = Boolean(draft.physicalReturn);
  const isVerified = Boolean(draft.verified);
  const isFinalized = Boolean(draft.finalized);
  const isDraft = Boolean(draft.isDraft);

  // Role-based permissions (with normalized comparison)
  const isManager = normalizedRole === "gestionnaire" || normalizedRole === "administrateur";
  const canEdit = isManager && !isFinalized && !isVerified;
  const canForceDraft = isManager && !isFinalized;
  const canVerify = normalizedRole === "verificateur" && isPhysical && !isVerified && !isFinalized && !isDraft;
  const canFinalize = normalizedRole === "facturation" && !isFinalized && !isDraft && (!isPhysical || isVerified);
  const canUnverify = isManager && isVerified && !isFinalized;
  const isReadOnly = normalizedRole === "expert" || normalizedRole === "analyste" || isFinalized;

  // Show verification fields for Vérificateur OR after verification (readonly)
  const showVerificationFields = Boolean(canVerify || (isVerified && isPhysical));
  // Show finalization fields for Facturation OR after finalization (readonly)
  const showFinalizationFields = Boolean(canFinalize || isFinalized);

  // Transport section state
  const [chargeTransport, setChargeTransport] = React.useState(false);
  const [cityCode, setCityCode] = React.useState<string | null>(null);
  const [cityName, setCityName] = React.useState<string | null>(null);

  // Compute total weight from products
  const totalWeight = React.useMemo(() => {
    return (draft.products ?? []).reduce((sum, p) => {
      const qty = p.quantiteRecue ?? p.quantite;
      const w = p.poidsUnitaire ?? 0;
      return sum + qty * w;
    }, 0);
  }, [draft.products]);

  // Auto-fetch city code & calculate shipping when finalization form is shown
  React.useEffect(() => {
    if (!showFinalizationFields || !draft.noCommande) return;
    let cancelled = false;
    const fetchCity = async () => {
      try {
        const res = await fetch(`/api/prextra/city?sonbr=${encodeURIComponent(draft.noCommande!)}&weight=${totalWeight}`, { credentials: "include" });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!json.ok || !json.found || cancelled) return;
        setCityCode(json.code ?? null);
        setCityName(json.city ?? null);
        setDraft(prev => ({
          ...prev,
          villeShipto: json.city ?? prev.villeShipto,
          transportAmount: json.shippingCost ?? prev.transportAmount,
        }));
      } catch { /* ignore */ }
    };
    fetchCity();
    return () => { cancelled = true; };
  }, [showFinalizationFields, draft.noCommande, totalWeight]);

  const handleSave = async () => {
    if (!canEdit) return;
    setBusy(true);
    try {
      await updateReturn(String(row.id), { ...draft });
      await onRefresh();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!canForceDraft) return;
    setBusy(true);
    try {
      await updateReturn(String(row.id), { ...draft, forceDraft: true });
      await onRefresh();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!canVerify) return;
    if (!window.confirm("Êtes-vous sûr de vouloir vérifier ce retour ?")) return;
    setBusy(true);
    try {
      await verifyReturn(String(row.id), { products: draft.products ?? [] });
      await onRefresh();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur vérification");
    } finally {
      setBusy(false);
    }
  };

  const handleFinalize = async () => {
    if (!canFinalize) return;
    if (!window.confirm("Êtes-vous sûr de vouloir finaliser ce retour ?")) return;
    setBusy(true);
    try {
      await finalizeReturn(String(row.id), {
        products: draft.products,
        warehouseOrigin: draft.warehouseOrigin,
        warehouseDestination: draft.warehouseDestination,
        noCredit: draft.noCredit,
        noCredit2: draft.noCredit2,
        noCredit3: draft.noCredit3,
        creditedTo: draft.creditedTo,
        creditedTo2: draft.creditedTo2,
        creditedTo3: draft.creditedTo3,
        villeShipto: draft.villeShipto,
        transportAmount: draft.transportAmount,
        restockingAmount: draft.restockingAmount,
        chargeTransport,
      });
      await onRefresh();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur finalisation");
    } finally {
      setBusy(false);
    }
  };

  const handleUnverify = async () => {
    if (!canUnverify) return;
    if (!window.confirm("Êtes-vous sûr de vouloir annuler la vérification de ce retour ?")) return;
    setBusy(true);
    try {
      await unverifyReturn(String(row.id));
      await onRefresh();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur annulation vérification");
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-[90vw] h-[90vh] bg-[hsl(var(--bg-surface))] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[hsl(var(--border-default))]">

        {/* Header */}
        <div className="px-8 py-6 border-b border-[hsl(var(--border-subtle))] flex items-start justify-between" style={{ background: `linear-gradient(to right, var(--accent-muted-current), hsl(var(--bg-surface)))` }}>
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 rounded-xl flex items-center justify-center font-mono text-xl font-bold shadow-lg text-white" style={{ backgroundColor: "var(--accent-current)" }}>
              {String(draft.id).replace('R', '')}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[hsl(var(--text-primary))] flex items-center gap-3">
                Retour {String(draft.id)}
                <Badge>{CAUSE_LABEL[draft.cause]}</Badge>
                {isDraft && <Badge variant="muted">Brouillon</Badge>}
              </h2>
              <div className="flex items-center gap-2.5 mt-1.5">
                {draft.createdBy?.avatar ? (
                  <img src={draft.createdBy.avatar} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-[hsl(var(--border-default))]" />
                ) : (
                  <div className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-semibold text-white" style={{ backgroundColor: "var(--accent-current)" }}>
                    {(creatorName || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="text-sm text-[hsl(var(--text-tertiary))] flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {creatorDate.toLocaleDateString("fr-CA")} à {creatorDate.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[hsl(var(--text-muted))]">•</span>
                  <span>Par {creatorName}</span>
                </p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] transition-all duration-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[hsl(var(--bg-base))]">

          {/* Status Controls */}
          <div className="p-5 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Switch
                label="Retour physique requis"
                checked={isPhysical}
                onCheckedChange={(c) => canEdit && setDraft({ ...draft, physicalReturn: c })}
                disabled={!canEdit}
              />
              
              <div className="flex items-center gap-3">
                {isPhysical && (
                  <Badge variant={isVerified ? "success" : "warning"}>
                    {isVerified ? (
                      <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Vérifié</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> En attente vérification</span>
                    )}
                  </Badge>
                )}
                {isFinalized && (
                  <Badge variant="muted">
                    <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Finalisé</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* Option Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-[hsl(var(--border-subtle))]">
              <OptionToggle label="Pickup" checked={!!draft.isPickup} onToggle={() => canEdit && setDraft({ ...draft, isPickup: !draft.isPickup })} inputValue={draft.noBill ?? ""} onInputChange={(v) => setDraft({ ...draft, noBill: v })} inputPlaceholder="No. Bill" toggleDisabled={!canEdit} inputDisabled={!canEdit || !draft.isPickup} />
              <OptionToggle label="Commande" checked={!!draft.isCommande} onToggle={() => canEdit && setDraft({ ...draft, isCommande: !draft.isCommande })} inputValue={draft.noBonCommande ?? ""} onInputChange={(v) => setDraft({ ...draft, noBonCommande: v })} inputPlaceholder="No. Bon" toggleDisabled={!canEdit} inputDisabled={!canEdit || !draft.isCommande} />
              <OptionToggle label="Réclamation" checked={!!draft.isReclamation} onToggle={() => canEdit && setDraft({ ...draft, isReclamation: !draft.isReclamation })} inputValue={draft.noReclamation ?? ""} onInputChange={(v) => setDraft({ ...draft, noReclamation: v })} inputPlaceholder="No. Récl." toggleDisabled={!canEdit} inputDisabled={!canEdit || !draft.isReclamation} />
            </div>
          </div>

          {/* Info Fields */}
          <div className="p-5 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm">
            <h3 className="text-sm font-medium text-[hsl(var(--text-primary))] mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[hsl(var(--text-tertiary))]" />
              Informations générales
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wide mb-2 block">Expert</span>
                <ExpertAutocomplete
                  value={draft.expert || ""}
                  onChange={(v) => setDraft({ ...draft, expert: v })}
                  disabled={!canEdit}
                  className={cn(
                    "w-full h-11 px-4 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all duration-200",
                    !canEdit
                      ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed"
                      : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))] focus:border-transparent"
                  )}
                />
              </label>
              <Field label="Client" value={draft.client || ""} onChange={(v) => setDraft({ ...draft, client: v })} disabled={!canEdit} />
              <Field label="No. Client" value={draft.noClient ?? ""} onChange={(v) => setDraft({ ...draft, noClient: v })} disabled={!canEdit} />
              <Field label="No. Commande" value={draft.noCommande ?? ""} onChange={(v) => setDraft({ ...draft, noCommande: v })} disabled={!canEdit} />
              <Field label="Tracking" value={draft.tracking ?? ""} onChange={(v) => setDraft({ ...draft, tracking: v })} icon={<Truck className="h-4 w-4" />} disabled={!canEdit} />
              <Field label="Transporteur" value={draft.transport ?? ""} onChange={(v) => setDraft({ ...draft, transport: v })} disabled={!canEdit} />
              <Field label="Montant" value={draft.amount?.toString() ?? ""} onChange={(v) => setDraft({ ...draft, amount: v ? Number(v) : null })} type="number" icon={<DollarSign className="h-4 w-4" />} disabled={!canEdit} />
              <Field label="Date Commande" value={draft.dateCommande ?? ""} onChange={(v) => setDraft({ ...draft, dateCommande: v })} type="date" disabled={!canEdit} />
            </div>
          </div>

          {/* Attachments with Google Drive iFrames */}
          <section className="p-5 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm">
            <h3 className="text-sm font-medium text-[hsl(var(--text-primary))] mb-4 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-[hsl(var(--text-tertiary))]" />
              Pièces jointes
              {(draft.attachments?.length ?? 0) > 0 && (
                <span className="ml-auto text-xs font-normal text-[hsl(var(--text-tertiary))]">{draft.attachments?.length} fichier{(draft.attachments?.length ?? 0) > 1 ? 's' : ''}</span>
              )}
            </h3>
            <AttachmentsSection
              returnCode={String(draft.id)}
              attachments={draft.attachments?.map(a => ({ id: a.id, name: a.name, url: a.url, downloadUrl: a.downloadUrl })) || []}
              onAttachmentsChange={(newAttachments) => {
                setDraft(prev => ({ ...prev, attachments: newAttachments as Attachment[] }));
              }}
              readOnly={isFinalized}
            />
          </section>

          {/* Products */}
          <section className="p-5 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm">
            <h3 className="text-sm font-medium text-[hsl(var(--text-primary))] mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-[hsl(var(--text-tertiary))]" />
              Produits (RMA)
              {(draft.products?.length ?? 0) > 0 && (
                <span className="ml-auto text-xs font-normal text-[hsl(var(--text-tertiary))]">{draft.products?.length} produit{(draft.products?.length ?? 0) > 1 ? 's' : ''}</span>
              )}
            </h3>
            <div className="space-y-3">
              {(draft.products ?? []).map((p, idx) => (
                <ProductRow
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
                  onRemove={() => {
                    if (!canEdit) return;
                    const arr = (draft.products ?? []).filter((x) => x.id !== p.id);
                    setDraft({ ...draft, products: arr });
                  }}
                />
              ))}
              {(draft.products?.length ?? 0) === 0 && (
                <div className="py-12 text-center border-2 border-dashed border-[hsl(var(--border-default))] rounded-xl text-[hsl(var(--text-muted))] text-sm">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Aucun produit ajouté
                </div>
              )}
            </div>
          </section>

          {/* Verification Section - Only for Vérificateur on physical returns awaiting verification */}
          {showVerificationFields && (
            <section className={cn(
              "p-5 rounded-xl border shadow-sm",
              canVerify ? "border-[hsl(var(--warning))]/20 bg-[hsl(var(--warning-muted))]" : "border-[hsl(var(--success))]/20 bg-[hsl(var(--success-muted))]"
            )}>
              <h3 className="text-sm font-medium text-[hsl(var(--text-primary))] mb-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Vérification physique
                {canVerify && <Badge variant="warning">À compléter</Badge>}
                {isVerified && <Badge variant="success">Complété</Badge>}
              </h3>
              
              {/* Verification fields are shown in ProductRow component */}
              <p className="text-sm text-[hsl(var(--text-tertiary))] mb-5">
                Remplissez les quantités reçues et détruites pour chaque produit ci-dessus.
              </p>

              {/* Vérifier Button - Only for Vérificateur */}
              {canVerify && (
                <button 
                  disabled={busy} 
                  onClick={handleVerify} 
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[hsl(var(--warning))] text-white text-sm font-semibold hover:opacity-90 transition-all duration-200 shadow-lg shadow-[hsl(var(--warning))]/25",
                    busy && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Vérifier ce retour
                </button>
              )}
            </section>
          )}

          {/* Verification Info - Show after verification */}
          {isVerified && draft.verifiedBy && (
            <div className="p-4 rounded-xl border border-[hsl(var(--success))]/20 bg-[hsl(var(--success-muted))]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-[hsl(var(--success))]">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {draft.verifiedBy.avatar ? (
                    <img src={draft.verifiedBy.avatar} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-[hsl(var(--success))]/30" />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-[hsl(var(--success))] flex items-center justify-center text-xl font-semibold text-white shrink-0">
                      {(draft.verifiedBy.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>Vérifié par <strong>{draft.verifiedBy.name}</strong> le {draft.verifiedBy.at ? new Date(draft.verifiedBy.at).toLocaleDateString("fr-CA") : ""}</span>
                </div>
                {canUnverify && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleUnverify}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
                      "border-[hsl(var(--destructive))]/30 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10",
                      busy && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Annuler
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Finalization Section - Only for Facturation or after finalization */}
          {showFinalizationFields && (
            <section className={cn(
              "p-5 rounded-xl border shadow-sm space-y-6",
              canFinalize ? "border-[hsl(var(--success))]/20 bg-[hsl(var(--success-muted))]" : "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))]"
            )}>
              <h3 className="text-sm font-medium text-[hsl(var(--text-primary))] flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Finalisation
                {canFinalize && <Badge variant="success">À compléter</Badge>}
              </h3>

              {/* Section 1 — Transfert d'inventaire */}
              <div>
                <h4 className="text-sm font-bold text-[hsl(var(--text-primary))] mb-3">Transfert d&apos;inventaire</h4>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide mb-2 block">Entrepôt de départ</span>
                    <SiteAutocomplete
                      value={draft.warehouseOrigin ?? ""}
                      onChange={(v) => setDraft({ ...draft, warehouseOrigin: v })}
                      icon={<Warehouse className="h-4 w-4" />}
                      disabled={!canFinalize}
                      placeholder="Sélectionner un entrepôt"
                      className={cn(
                        "w-full h-11 px-4 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all duration-200",
                        !canFinalize
                          ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed"
                          : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))] focus:border-transparent"
                      )}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide mb-2 block">Entrepôt de destination</span>
                    <SiteAutocomplete
                      value={draft.warehouseDestination ?? ""}
                      onChange={(v) => setDraft({ ...draft, warehouseDestination: v })}
                      icon={<Warehouse className="h-4 w-4" />}
                      disabled={!canFinalize}
                      placeholder="Sélectionner un entrepôt"
                      className={cn(
                        "w-full h-11 px-4 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all duration-200",
                        !canFinalize
                          ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed"
                          : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))] focus:border-transparent"
                      )}
                    />
                  </label>
                </div>
              </div>

              {/* Section 2 — Ajustement à l'entrepôt */}
              <div>
                <h4 className="text-sm font-bold text-[hsl(var(--text-primary))] mb-3">Ajustement à l&apos;entrepôt</h4>
                <div className="overflow-x-auto rounded-lg border border-[hsl(var(--border-default))]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))]">
                        <th className="px-3 py-2 text-left text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase">Code produit</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase">Qté attendue</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase">Qté reçue</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase">Qté inventaire</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase">Qté détruite</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase">Taux restocking</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border-subtle))]">
                      {(draft.products ?? []).map((p, idx) => {
                        const qteRecue = p.quantiteRecue ?? 0;
                        const qteDetruite = p.qteDetruite ?? 0;
                        const qteInv = p.qteInventaire ?? (qteRecue - qteDetruite);
                        return (
                          <tr key={p.id} className="bg-[hsl(var(--bg-surface))]">
                            <td className="px-3 py-2 font-mono text-xs text-[hsl(var(--text-primary))]">{p.codeProduit}</td>
                            <td className="px-3 py-2 text-center text-[hsl(var(--text-secondary))]">{p.quantite}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="inline-block px-2 py-0.5 rounded bg-[hsl(var(--success-muted))] text-[hsl(var(--success))] font-medium">{qteRecue}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="inline-block px-2 py-0.5 rounded bg-[hsl(var(--success-muted))] text-[hsl(var(--success))] font-medium">{qteInv}</span>
                            </td>
                            <td className="px-3 py-2 text-center text-[hsl(var(--text-secondary))]">{qteDetruite}</td>
                            <td className="px-3 py-2 text-center">
                              <select
                                className={cn(
                                  "h-8 px-2 rounded-md text-xs border focus:outline-none focus:ring-2 transition-all duration-200",
                                  !canFinalize
                                    ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed"
                                    : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))]"
                                )}
                                value={`${(p.tauxRestock ?? 0)}%`}
                                onChange={(e) => {
                                  if (!canFinalize) return;
                                  const rate = parseFloat(e.target.value.replace('%', ''));
                                  const arr = (draft.products ?? []).slice();
                                  arr[idx] = { ...p, tauxRestock: rate };
                                  setDraft({ ...draft, products: arr });
                                }}
                                disabled={!canFinalize}
                              >
                                {RESTOCK_RATES.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-xs text-[hsl(var(--text-tertiary))] truncate max-w-[200px]">{p.descriptionProduit}</td>
                          </tr>
                        );
                      })}
                      {(draft.products ?? []).length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-[hsl(var(--text-muted))] text-xs">Aucun produit</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3 — Restocking */}
              <div>
                <h4 className="text-sm font-bold text-[hsl(var(--text-primary))] mb-3">Restocking</h4>
                <Field label="Montant chargé pour le restocking" value={draft.restockingAmount?.toString() ?? ""} onChange={(v) => setDraft({ ...draft, restockingAmount: v ? Number(v) : null })} type="number" icon={<DollarSign className="h-4 w-4" />} disabled={!canFinalize} />
              </div>

              {/* Section 4 — Transport */}
              <div>
                <h4 className="text-sm font-bold text-[hsl(var(--text-primary))] mb-3">Transport</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <label className="block">
                    <span className="text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide mb-2 block">Code de la ville</span>
                    <input
                      type="text"
                      value={cityCode ?? ""}
                      readOnly
                      className="w-full h-11 px-4 rounded-xl border text-sm bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide mb-2 block">Ville de livraison</span>
                    <input
                      type="text"
                      value={draft.villeShipto ?? ""}
                      readOnly
                      className="w-full h-11 px-4 rounded-xl border text-sm bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide mb-2 block">Poids total</span>
                    <input
                      type="text"
                      value={`${totalWeight.toFixed(2)} lb`}
                      readOnly
                      className="w-full h-11 px-4 rounded-xl border text-sm bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed"
                    />
                  </label>
                  <Field label="Montant transport" value={draft.transportAmount?.toString() ?? ""} onChange={(v) => setDraft({ ...draft, transportAmount: v ? Number(v) : null })} type="number" icon={<DollarSign className="h-4 w-4" />} disabled={!canFinalize} />
                </div>
                <Switch
                  label="Facturer le transport"
                  checked={chargeTransport}
                  onCheckedChange={setChargeTransport}
                  disabled={!canFinalize}
                />
              </div>

              {/* Section 5 — Crédit */}
              <div>
                <h4 className="text-sm font-bold text-[hsl(var(--text-primary))] mb-3">Crédit</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <span className="text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide mb-2 block">Personne créditée 1</span>
                    <select
                      value={draft.creditedTo ?? ""}
                      onChange={(e) => canFinalize && setDraft({ ...draft, creditedTo: e.target.value || null })}
                      disabled={!canFinalize}
                      className={cn(
                        "w-full h-11 px-4 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all duration-200",
                        !canFinalize
                          ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed"
                          : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))] focus:border-transparent"
                      )}
                    >
                      <option value="">—</option>
                      <option value="Client">Client</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                  <Field label="No. Crédit 1" value={draft.noCredit ?? ""} onChange={(v) => setDraft({ ...draft, noCredit: v })} disabled={!canFinalize} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <span className="text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide mb-2 block">Personne créditée 2</span>
                    <select
                      value={draft.creditedTo2 ?? ""}
                      onChange={(e) => canFinalize && setDraft({ ...draft, creditedTo2: e.target.value || null })}
                      disabled={!canFinalize}
                      className={cn(
                        "w-full h-11 px-4 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all duration-200",
                        !canFinalize
                          ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed"
                          : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))] focus:border-transparent"
                      )}
                    >
                      <option value="">—</option>
                      <option value="Client">Client</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                  <Field label="No. Crédit 2" value={draft.noCredit2 ?? ""} onChange={(v) => setDraft({ ...draft, noCredit2: v })} disabled={!canFinalize} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide mb-2 block">Personne créditée 3</span>
                    <select
                      value={draft.creditedTo3 ?? ""}
                      onChange={(e) => canFinalize && setDraft({ ...draft, creditedTo3: e.target.value || null })}
                      disabled={!canFinalize}
                      className={cn(
                        "w-full h-11 px-4 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all duration-200",
                        !canFinalize
                          ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed"
                          : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))] focus:border-transparent"
                      )}
                    >
                      <option value="">—</option>
                      <option value="Client">Client</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                  <Field label="No. Crédit 3" value={draft.noCredit3 ?? ""} onChange={(v) => setDraft({ ...draft, noCredit3: v })} disabled={!canFinalize} />
                </div>
              </div>

              {/* Finaliser Button - Only for Facturation */}
              {canFinalize && (
                <button
                  disabled={busy}
                  onClick={handleFinalize}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[hsl(var(--danger))] text-white text-sm font-semibold hover:opacity-90 transition-all duration-200 shadow-lg shadow-[hsl(var(--danger))]/25",
                    busy && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Finaliser ce retour
                </button>
              )}
            </section>
          )}

          {/* Finalization Info */}
          {isFinalized && draft.finalizedBy && (
            <div className="p-4 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm">
              <div className="flex items-center gap-3 text-sm text-[hsl(var(--text-tertiary))]">
                <Check className="h-4 w-4 shrink-0" />
                {draft.finalizedBy.avatar ? (
                  <img src={draft.finalizedBy.avatar} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-[hsl(var(--border-default))]" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-[hsl(var(--text-muted))] flex items-center justify-center text-xl font-semibold text-white shrink-0">
                    {(draft.finalizedBy.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <span>Finalisé par <strong>{draft.finalizedBy.name}</strong> le {draft.finalizedBy.at ? new Date(draft.finalizedBy.at).toLocaleDateString("fr-CA") : ""}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <section className="p-5 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm">
            <h3 className="text-sm font-medium text-[hsl(var(--text-primary))] mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[hsl(var(--text-tertiary))]" />
              Notes internes
            </h3>
            <textarea
              className={cn(
                "w-full px-4 py-3 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 transition-all duration-200",
                isReadOnly
                  ? "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed"
                  : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))] focus:border-transparent"
              )}
              rows={4}
              placeholder="Ajoutez des notes internes..."
              value={draft.description ?? ""}
              onChange={(e) => !isReadOnly && setDraft({ ...draft, description: e.target.value })}
              disabled={isReadOnly}
            />
          </section>

          {/* Conversation */}
          <section className="p-5 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm">
            <ReturnComments returnCode={String(draft.id)} />
          </section>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))] flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[hsl(var(--text-tertiary))] hover:bg-[hsl(var(--bg-elevated))] transition-all duration-200">
            Fermer
          </button>

          {canForceDraft && (
            <button disabled={busy} onClick={handleSaveDraft} className={cn("inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))] text-sm font-medium hover:bg-[hsl(var(--bg-elevated))] transition-all duration-200", busy && "opacity-50 cursor-not-allowed")}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Enregistrer comme brouillon
            </button>
          )}

          {canEdit && (
            <button disabled={busy} onClick={handleSave} className={cn("inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--text-primary))] text-[hsl(var(--bg-base))] text-sm font-semibold hover:opacity-90 transition-all duration-200 shadow-lg", busy && "opacity-50 cursor-not-allowed")}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
//   HELPER COMPONENTS
// =============================================================================

function OptionToggle({ label, checked, onToggle, inputValue, onInputChange, inputPlaceholder, toggleDisabled, inputDisabled }: {
  label: string; checked: boolean; onToggle: () => void; inputValue: string; onInputChange: (v: string) => void; inputPlaceholder: string; toggleDisabled: boolean; inputDisabled: boolean;
}) {
  return (
    <div className={cn("p-4 rounded-xl border transition-all duration-200 shadow-sm", checked ? "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))]" : "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] opacity-70")}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[hsl(var(--text-primary))]">{label}</span>
        <button type="button" onClick={onToggle} disabled={toggleDisabled} className={cn("relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-all duration-200", checked ? "bg-[hsl(var(--text-primary))] border-[hsl(var(--text-primary))]" : "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-strong))]", toggleDisabled && "opacity-50 cursor-not-allowed")}>
          <span className={cn("pointer-events-none block h-4 w-4 rounded-full transition-transform duration-200 shadow-sm", checked ? "translate-x-4 bg-[hsl(var(--bg-surface))]" : "translate-x-0 bg-[hsl(var(--bg-surface))]")} />
        </button>
      </div>
      <input disabled={inputDisabled} value={inputValue} onChange={(e) => onInputChange(e.target.value)} className="w-full h-9 px-3 rounded-lg text-sm border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200" placeholder={inputPlaceholder} />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", icon, disabled }: { label: string; value: string; onChange: (v: string) => void; type?: string; icon?: React.ReactNode; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wide mb-2 block">{label}</span>
      <div className="relative">
        {icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]">{icon}</div>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full h-11 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all duration-200 [color-scheme:light] dark:[color-scheme:dark]",
            icon ? "pl-10 pr-4" : "px-4",
            disabled
              ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed"
              : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))] focus:border-transparent"
          )}
        />
      </div>
    </label>
  );
}

function ProductRow({ product, showVerificationFields, showFinalizationFields, canEditBase, canEditVerification, canEditFinalization, onChange, onRemove }: {
  product: ProductLine;
  showVerificationFields: boolean;
  showFinalizationFields: boolean;
  canEditBase: boolean;
  canEditVerification: boolean;
  canEditFinalization: boolean;
  onChange: (p: ProductLine) => void;
  onRemove: () => void;
}) {
  const [suggestions, setSuggestions] = React.useState<ItemSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const debouncedCode = useDebounced(product.codeProduit, 300);

  React.useEffect(() => {
    let active = true;
    const fetchSuggestions = async () => {
      if (!showSuggestions || debouncedCode.trim().length < 2) { setSuggestions([]); return; }
      try { const results = await searchItems(debouncedCode); if (active) setSuggestions(results); } catch { /* ignore */ }
    };
    fetchSuggestions();
    return () => { active = false; };
  }, [debouncedCode, showSuggestions]);

  return (
    <div className="p-5 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] space-y-4 group shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Base Product Info */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0 w-36">
          <input
            className={cn("w-full h-10 px-3 rounded-lg text-sm font-mono border focus:outline-none focus:ring-2 transition-all duration-200", !canEditBase ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed" : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))] focus:border-transparent")}
            placeholder="Code"
            value={product.codeProduit}
            onChange={(e) => { if (canEditBase) { onChange({ ...product, codeProduit: e.target.value }); setShowSuggestions(true); } }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            disabled={!canEditBase}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 mt-2 w-72 max-h-48 overflow-y-auto rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm">
              {suggestions.map((s) => (
                <button key={s.code} className="w-full text-left px-4 py-3 text-sm hover:bg-[hsl(var(--bg-elevated))] border-b border-[hsl(var(--border-subtle))] last:border-0 transition-colors duration-150" onClick={() => { onChange({ ...product, codeProduit: s.code, descriptionProduit: s.descr || product.descriptionProduit }); setShowSuggestions(false); }}>
                  <div className="font-mono font-medium text-[hsl(var(--text-primary))]">{s.code}</div>
                  <div className="text-xs text-[hsl(var(--text-tertiary))] truncate mt-0.5">{s.descr}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <input className={cn("flex-1 h-10 px-3 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all duration-200", !canEditBase ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed" : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))] focus:border-transparent")} placeholder="Description" value={product.descriptionProduit || ""} onChange={(e) => canEditBase && onChange({ ...product, descriptionProduit: e.target.value })} disabled={!canEditBase} />
        <input className={cn("flex-1 h-10 px-3 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all duration-200", !canEditBase ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed" : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))] focus:border-transparent")} placeholder="Raison" value={product.descriptionRetour ?? ""} onChange={(e) => canEditBase && onChange({ ...product, descriptionRetour: e.target.value })} disabled={!canEditBase} />
        <input type="number" min={0} className={cn("w-24 h-10 px-3 rounded-lg text-sm text-center border focus:outline-none focus:ring-2 transition-all duration-200", !canEditBase ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed" : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))] focus:border-transparent")} placeholder="Qté" value={product.quantite} onChange={(e) => canEditBase && onChange({ ...product, quantite: Number(e.target.value || 0) })} disabled={!canEditBase} />
        {canEditBase && <button onClick={onRemove} className="p-2.5 rounded-lg text-[hsl(var(--text-muted))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))] opacity-0 group-hover:opacity-100 transition-all duration-200"><Trash2 className="h-4 w-4" /></button>}
      </div>

      {/* Verification Fields */}
      {showVerificationFields && (
        <div className={cn("pt-4 border-t", canEditVerification ? "border-[hsl(var(--warning))]/20" : "border-[hsl(var(--border-subtle))]")}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-28">
              <label className="text-xs font-medium text-[hsl(var(--text-tertiary))] block mb-1.5">Qté reçue</label>
              <input type="number" min={0} className={cn("w-full h-10 px-3 rounded-lg text-sm text-center border focus:outline-none focus:ring-2 transition-all duration-200", !canEditVerification ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed" : "bg-[hsl(var(--warning-muted))] border-[hsl(var(--warning))]/20 text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--warning))]")} value={product.quantiteRecue ?? ""} onChange={(e) => { if (!canEditVerification) return; const qteRecue = Number(e.target.value || 0); const qteDetruite = product.qteDetruite ?? 0; onChange({ ...product, quantiteRecue: qteRecue, qteInventaire: qteRecue - qteDetruite }); }} disabled={!canEditVerification} />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium text-[hsl(var(--text-tertiary))] block mb-1.5">Qté inventaire</label>
              <input type="number" className="w-full h-10 px-3 rounded-lg text-sm text-center border bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed" value={product.qteInventaire ?? ((product.quantiteRecue ?? 0) - (product.qteDetruite ?? 0))} disabled />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium text-[hsl(var(--text-tertiary))] block mb-1.5">Qté détruite</label>
              <input type="number" min={0} max={product.quantiteRecue ?? 0} className={cn("w-full h-10 px-3 rounded-lg text-sm text-center border focus:outline-none focus:ring-2 transition-all duration-200", !canEditVerification ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed" : "bg-[hsl(var(--warning-muted))] border-[hsl(var(--warning))]/20 text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--warning))]")} value={product.qteDetruite ?? ""} onChange={(e) => { if (!canEditVerification) return; const qteDetruite = Math.min(Number(e.target.value || 0), product.quantiteRecue ?? 0); const qteRecue = product.quantiteRecue ?? 0; onChange({ ...product, qteDetruite: qteDetruite, qteInventaire: qteRecue - qteDetruite }); }} disabled={!canEditVerification} />
            </div>
            {showFinalizationFields && (
              <div className="w-36">
                <label className="text-xs font-medium text-[hsl(var(--text-tertiary))] block mb-1.5">Taux restocking</label>
                <select className={cn("w-full h-10 px-3 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all duration-200", !canEditFinalization ? "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-default))] text-[hsl(var(--text-tertiary))] cursor-not-allowed" : "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:ring-[hsl(var(--border-default))] focus:border-transparent")} value={`${(product.tauxRestock ?? 0)}%`} onChange={(e) => { if (!canEditFinalization) return; const rate = parseFloat(e.target.value.replace('%', '')); onChange({ ...product, tauxRestock: rate }); }} disabled={!canEditFinalization}>
                  {RESTOCK_RATES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
//   NEW RETURN MODAL
// =============================================================================

function NewReturnModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> | void }) {
  const { data: session } = useSession();
  const [reporter, setReporter] = React.useState<Reporter>("expert");
  const [cause, setCause] = React.useState<Cause>("production");
  const [expert, setExpert] = React.useState("");
  const [client, setClient] = React.useState("");
  const [noClient, setNoClient] = React.useState("");
  const [noCommande, setNoCommande] = React.useState("");
  const [tracking, setTracking] = React.useState("");
  const [transport, setTransport] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [dateCommande, setDateCommande] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [physicalReturn, setPhysicalReturn] = React.useState(false);
  const [isPickup, setIsPickup] = React.useState(false);
  const [isCommande, setIsCommande] = React.useState(false);
  const [isReclamation, setIsReclamation] = React.useState(false);
  const [noBill, setNoBill] = React.useState("");
  const [noBonCommande, setNoBonCommande] = React.useState("");
  const [noReclamation, setNoReclamation] = React.useState("");
  const [products, setProducts] = React.useState<ProductLine[]>([]);
  const [nextId, setNextId] = React.useState("...");
  const [reportedAt, setReportedAt] = React.useState(new Date().toISOString().slice(0, 10));
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
      } catch { /* ignore */ }
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
      if (data.customerName) setClient(String(data.customerName));
      if (data.salesrepName) setExpert(String(data.salesrepName));
      if (data.carrierName) setTransport(String(data.carrierName));
      if (data.tracking) setTracking(String(data.tracking));
      if (data.orderDate) setDateCommande(String(data.orderDate).slice(0, 10));
      if (data.totalamt != null) setAmount(String(data.totalamt));
      if (data.noClient) setNoClient(String(data.noClient));
    } finally { setOrderLookupLoading(false); }
  };

  const buildPayload = () => ({
    reporter, cause, expert: expert.trim(), client: client.trim(), noClient: noClient.trim() || null, noCommande: noCommande.trim() || null, tracking: tracking.trim() || null, amount: amount ? Number(amount) : null, dateCommande: dateCommande || null, transport: transport.trim() || null, description: description.trim() || null, physicalReturn, isPickup, isCommande, isReclamation, noBill: isPickup ? noBill : null, noBonCommande: isCommande ? noBonCommande : null, noReclamation: isReclamation ? noReclamation : null, reportedAt,
    products: products.map((p) => ({ ...p, codeProduit: p.codeProduit.trim(), descriptionProduit: p.descriptionProduit?.trim() || "", descriptionRetour: p.descriptionRetour?.trim() || "" })),
  });

  const submit = async () => {
    if (!expert.trim() || !client.trim() || !reportedAt) { alert("Expert, client et date de signalement sont requis."); return; }
    setBusy(true);
    try {
      const createdReturn = await createReturn(buildPayload());
      if (filesToUpload.length > 0 && createdReturn?.id) {
        for (const file of filesToUpload) await uploadAttachment(String(createdReturn.id), file);
      }
      await onCreated();
    } catch (e) { alert(e instanceof Error ? e.message : "Erreur à la création"); } finally { setBusy(false); }
  };

  const submitDraft = async () => {
    setBusy(true);
    try {
      const createdReturn = await createReturn(buildPayload());
      if (filesToUpload.length > 0 && createdReturn?.id) {
        for (const file of filesToUpload) await uploadAttachment(String(createdReturn.id), file);
      }
      await onCreated();
    } catch (e) { alert(e instanceof Error ? e.message : "Erreur à la création"); } finally { setBusy(false); }
  };

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-[90vw] h-[90vh] bg-[hsl(var(--bg-surface))] rounded-2xl shadow-2xl border border-[hsl(var(--border-default))] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-[hsl(var(--border-subtle))] flex items-center justify-between bg-[hsl(var(--bg-surface))]">
          <div className="flex items-center gap-5">
            <div className="h-12 w-12 rounded-xl bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-tertiary))] flex items-center justify-center font-mono text-lg font-medium">{nextId.replace('R', '')}</div>
            <div>
              <h2 className="text-xl font-semibold text-[hsl(var(--text-primary))]">Nouveau retour</h2>
              <p className="text-sm text-[hsl(var(--text-tertiary))] mt-0.5">{currentUserName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] transition-all duration-200"><X className="h-5 w-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[hsl(var(--bg-base))]">
          {/* Order Lookup */}
          <div className="p-5 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm">
            <label className="block text-sm font-medium text-[hsl(var(--text-primary))] mb-3">Recherche par commande</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--text-muted))]" />
              <input type="text" value={noCommande} onChange={(e) => setNoCommande(e.target.value)} onBlur={onFetchFromOrder} onKeyDown={(e) => e.key === "Enter" && onFetchFromOrder()} placeholder="Entrez un numéro de commande" className="w-full h-12 pl-11 pr-4 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm font-mono text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200" />
              {orderLookupLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--text-muted))] animate-spin" />}
            </div>
          </div>

          {/* Physical Return Toggle */}
          <div onClick={() => setPhysicalReturn(!physicalReturn)} className={cn("p-5 rounded-xl border cursor-pointer transition-all duration-200 shadow-sm", physicalReturn ? "border-[hsl(var(--success))]/20 bg-[hsl(var(--success-muted))]" : "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] hover:bg-[hsl(var(--bg-elevated))]")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", physicalReturn ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" : "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-muted))]")}>
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <div className={cn("text-sm font-medium", physicalReturn ? "text-[hsl(var(--success))]" : "text-[hsl(var(--text-primary))]")}>Retour physique</div>
                  <div className="text-xs text-[hsl(var(--text-tertiary))] mt-0.5">{physicalReturn ? "Requiert vérification à la réception" : "Retour administratif uniquement"}</div>
                </div>
              </div>
              <Switch checked={physicalReturn} onCheckedChange={setPhysicalReturn} />
            </div>
          </div>

          {/* Form Fields */}
          <div className="p-5 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date" required><input type="date" value={reportedAt} onChange={(e) => setReportedAt(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200 [color-scheme:light] dark:[color-scheme:dark]" /></FormField>
              <FormField label="Signalé par" required><select value={reporter} onChange={(e) => setReporter(e.target.value as Reporter)} className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200">{Object.entries(REPORTER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></FormField>
              <FormField label="Cause" required><select value={cause} onChange={(e) => setCause(e.target.value as Cause)} className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200">{CAUSES_IN_ORDER.map((c) => <option key={c} value={c}>{CAUSE_LABEL[c]}</option>)}</select></FormField>
              <FormField label="No. client"><input value={noClient} onChange={(e) => setNoClient(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200" placeholder="12345" /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Expert" required><ExpertAutocomplete value={expert} onChange={setExpert} className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200" placeholder="Nom du représentant" /></FormField>
              <FormField label="Client" required><input value={client} onChange={(e) => setClient(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200" placeholder="Nom du client" /></FormField>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <FormField label="Tracking"><input value={tracking} onChange={(e) => setTracking(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm font-mono text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200" placeholder="1Z999..." /></FormField>
              <FormField label="Transporteur"><input value={transport} onChange={(e) => setTransport(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200" placeholder="Purolator" /></FormField>
              <FormField label="Montant"><input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200" placeholder="0.00" /></FormField>
              <FormField label="Date commande"><input type="date" value={dateCommande} onChange={(e) => setDateCommande(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200 [color-scheme:light] dark:[color-scheme:dark]" /></FormField>
            </div>
          </div>

          {/* Products */}
          <section className="p-5 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[hsl(var(--text-primary))] flex items-center gap-2"><Package className="h-4 w-4 text-[hsl(var(--text-tertiary))]" />Produits (RMA)</h3>
              <button onClick={addProduct} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] transition-all duration-200"><Plus className="h-3.5 w-3.5" />Ajouter</button>
            </div>
            {products.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-[hsl(var(--border-default))] rounded-xl text-[hsl(var(--text-muted))] text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Aucun produit ajouté
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((p, idx) => (
                  <NewProductRow key={p.id} product={p} onChange={(up) => { const arr = products.slice(); arr[idx] = up; setProducts(arr); }} onRemove={() => removeProduct(p.id)} />
                ))}
              </div>
            )}
          </section>

          {/* Attachments */}
          <section className="p-5 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[hsl(var(--text-primary))] flex items-center gap-2"><Paperclip className="h-4 w-4 text-[hsl(var(--text-tertiary))]" />Pièces jointes</h3>
              <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] transition-all duration-200 cursor-pointer">
                <UploadCloud className="h-3.5 w-3.5" />Ajouter
                <input type="file" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length > 0) setFilesToUpload((prev) => [...prev, ...files]); e.target.value = ""; }} />
              </label>
            </div>
            {filesToUpload.length > 0 ? (
              <div className="space-y-2">
                {filesToUpload.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))]">
                    <div className="flex items-center gap-3 min-w-0"><FileText className="h-4 w-4 text-[hsl(var(--text-muted))] flex-shrink-0" /><span className="text-sm text-[hsl(var(--text-secondary))] truncate">{f.name}</span></div>
                    <button onClick={() => setFilesToUpload((prev) => prev.filter((_, idx) => idx !== i))} className="p-1.5 rounded-lg text-[hsl(var(--text-muted))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))] transition-all duration-200"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-[hsl(var(--border-default))] rounded-xl text-[hsl(var(--text-muted))] text-sm">
                <Paperclip className="h-6 w-6 mx-auto mb-2 opacity-50" />
                Aucun fichier sélectionné
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="p-5 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm">
            <h3 className="text-sm font-medium text-[hsl(var(--text-primary))] mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-[hsl(var(--text-tertiary))]" />Notes internes</h3>
            <textarea className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200 resize-none" rows={4} placeholder="Ajoutez des notes internes..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </section>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <OptionToggle label="Pickup" checked={isPickup} onToggle={() => setIsPickup(!isPickup)} inputValue={noBill} onInputChange={setNoBill} inputPlaceholder="No. Bill" toggleDisabled={false} inputDisabled={!isPickup} />
            <OptionToggle label="Commande" checked={isCommande} onToggle={() => setIsCommande(!isCommande)} inputValue={noBonCommande} onInputChange={setNoBonCommande} inputPlaceholder="No. Bon" toggleDisabled={false} inputDisabled={!isCommande} />
            <OptionToggle label="Réclamation" checked={isReclamation} onToggle={() => setIsReclamation(!isReclamation)} inputValue={noReclamation} onInputChange={setNoReclamation} inputPlaceholder="No. Récl." toggleDisabled={false} inputDisabled={!isReclamation} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))] flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[hsl(var(--text-tertiary))] hover:bg-[hsl(var(--bg-elevated))] transition-all duration-200">Annuler</button>
          <button disabled={busy} onClick={submitDraft} className={cn("inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))] text-sm font-medium hover:bg-[hsl(var(--bg-elevated))] transition-all duration-200", busy && "opacity-50 cursor-not-allowed")}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Enregistrer comme brouillon
          </button>
          <button disabled={busy} onClick={submit} className={cn("inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[hsl(var(--text-primary))] text-[hsl(var(--bg-base))] text-sm font-semibold hover:opacity-90 transition-all duration-200 shadow-lg", busy && "opacity-50 cursor-not-allowed")}>
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
      <span className="text-xs font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wide mb-1.5 block">{label}{required && <span className="text-[hsl(var(--danger))] ml-0.5">*</span>}</span>
      {children}
    </label>
  );
}

function NewProductRow({ product, onChange, onRemove }: { product: ProductLine; onChange: (p: ProductLine) => void; onRemove: () => void }) {
  const [suggestions, setSuggestions] = React.useState<ItemSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const debouncedCode = useDebounced(product.codeProduit, 300);

  React.useEffect(() => {
    let active = true;
    const fetchSuggestions = async () => {
      if (!showSuggestions || debouncedCode.trim().length < 2) { setSuggestions([]); return; }
      try { const results = await searchItems(debouncedCode); if (active) setSuggestions(results); } catch { /* ignore */ }
    };
    fetchSuggestions();
    return () => { active = false; };
  }, [debouncedCode, showSuggestions]);

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] group shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="relative flex-shrink-0 w-36">
        <input className="w-full h-10 px-3 rounded-lg text-sm font-mono border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200" placeholder="Code" value={product.codeProduit} onChange={(e) => { onChange({ ...product, codeProduit: e.target.value }); setShowSuggestions(true); }} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 mt-2 w-72 max-h-48 overflow-y-auto rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-sm">
            {suggestions.map((s) => (
              <button key={s.code} className="w-full text-left px-4 py-3 text-sm hover:bg-[hsl(var(--bg-elevated))] border-b border-[hsl(var(--border-subtle))] last:border-0 transition-colors duration-150" onClick={() => { onChange({ ...product, codeProduit: s.code, descriptionProduit: s.descr || product.descriptionProduit }); setShowSuggestions(false); }}>
                <div className="font-mono font-medium text-[hsl(var(--text-primary))]">{s.code}</div>
                <div className="text-xs text-[hsl(var(--text-tertiary))] truncate mt-0.5">{s.descr}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <input className="flex-1 h-10 px-3 rounded-lg text-sm border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200" placeholder="Description" value={product.descriptionProduit || ""} onChange={(e) => onChange({ ...product, descriptionProduit: e.target.value })} />
      <input className="flex-1 h-10 px-3 rounded-lg text-sm border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200" placeholder="Raison" value={product.descriptionRetour ?? ""} onChange={(e) => onChange({ ...product, descriptionRetour: e.target.value })} />
      <input type="number" min={0} className="w-24 h-10 px-3 rounded-lg text-sm text-center border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-default))] focus:border-transparent transition-all duration-200" placeholder="Qté" value={product.quantite} onChange={(e) => onChange({ ...product, quantite: Number(e.target.value || 0) })} />
      <button onClick={onRemove} className="p-2.5 rounded-lg text-[hsl(var(--text-muted))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))] opacity-0 group-hover:opacity-100 transition-all duration-200"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}
