"use client";

import React from "react";
import { useSession } from "next-auth/react";
import {
  Package, Plus, Search, X, Send, Loader2, FileText, Paperclip,
  UploadCloud, Trash2, ChevronDown, History, Eye, Check, AlertCircle,
  Building2, Calendar, User, Truck, DollarSign, Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

// =============================================================================
//   TYPES AND CONSTANTS
// =============================================================================

type Reporter = "expert" | "client" | "production" | "transport" | "autre";
type Cause = "production" | "transport" | "commande" | "client" | "autre";

const REPORTER_LABEL: Record<Reporter, string> = {
  expert: "Expert",
  client: "Client",
  production: "Production",
  transport: "Transport",
  autre: "Autre",
};

const CAUSE_LABEL: Record<Cause, string> = {
  production: "Production",
  transport: "Transport",
  commande: "Erreur de commande",
  client: "Client",
  autre: "Autre",
};

const CAUSES_IN_ORDER: Cause[] = ["production", "transport", "commande", "client", "autre"];
const RESTOCK_RATES = ["0%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%"];

interface ProductLine {
  id: string;
  codeProduit: string;
  descriptionProduit?: string;
  descriptionRetour?: string;
  quantite: number;
  quantiteRecue?: number | null;
  qteInventaire?: number | null;
  qteDetruite?: number | null;
  tauxRestock?: number | null;
  weightProduit?: number | null;
}

interface ReturnRow {
  codeRetour: string;
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
  physicalReturn: boolean;
  verified: boolean;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  finalized: boolean;
  finalizedBy?: string | null;
  finalizedAt?: string | null;
  isDraft: boolean;
  isStandby: boolean;
  reportedAt: string;
  createdAt: string;
  products: ProductLine[];
  attachments?: { id: string; filename: string; url: string }[];
  isPickup?: boolean;
  isCommande?: boolean;
  isReclamation?: boolean;
  noBill?: string | null;
  noBonCommande?: string | null;
  noReclamation?: string | null;
  warehouseOrigin?: string | null;
  warehouseDestination?: string | null;
  noCredit?: string | null;
  noCredit2?: string | null;
  noCredit3?: string | null;
  creditedTo?: string | null;
  creditedTo2?: string | null;
  creditedTo3?: string | null;
  villeShipto?: string | null;
  totalWeight?: number | null;
  transportAmount?: number | null;
  restockingAmount?: number | null;
}

interface ItemSuggestion {
  code: string;
  descr?: string;
}

// Role type
type UserRole = "Gestionnaire" | "Vérificateur" | "Facturation" | "Expert" | "Analyste" | string;

// =============================================================================
//   UTILITY FUNCTIONS
// =============================================================================

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// =============================================================================
//   API FUNCTIONS
// =============================================================================

async function fetchReturns(showHistory: boolean): Promise<ReturnRow[]> {
  const url = `/api/returns?history=${showHistory}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erreur chargement retours");
  const json = await res.json();
  return json.data || [];
}

async function createReturn(data: Partial<ReturnRow>): Promise<ReturnRow> {
  const res = await fetch("/api/returns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erreur création");
  }
  const json = await res.json();
  return json.data;
}

async function updateReturn(code: string, data: Partial<ReturnRow>): Promise<void> {
  const res = await fetch(`/api/returns/${code}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erreur mise à jour");
  }
}

async function verifyReturn(code: string, data: { products: ProductLine[] }): Promise<void> {
  const res = await fetch(`/api/returns/${code}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erreur vérification");
  }
}

async function finalizeReturn(code: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/returns/${code}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erreur finalisation");
  }
}

async function deleteReturn(code: string): Promise<void> {
  const res = await fetch(`/api/returns/${code}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erreur suppression");
  }
}

async function uploadAttachment(code: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/returns/${code}/attachments`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Erreur upload");
}

async function searchItems(query: string): Promise<ItemSuggestion[]> {
  const res = await fetch(`/api/items/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

async function lookupOrder(orderNumber: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`/api/orders/lookup?order=${encodeURIComponent(orderNumber)}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || null;
}

// =============================================================================
//   ROLE-BASED FILTERING LOGIC
// =============================================================================

function filterReturnsByRole(returns: ReturnRow[], role: UserRole, showHistory: boolean): ReturnRow[] {
  // History mode shows finalized returns for all roles
  if (showHistory) {
    return returns.filter(r => r.finalized);
  }

  // Active returns filtering based on role
  switch (role) {
    case "Gestionnaire":
      // Manager sees ALL active returns (including drafts)
      return returns.filter(r => !r.finalized);

    case "Vérificateur":
      // Verifier only sees physical returns awaiting verification
      return returns.filter(r => 
        !r.finalized && 
        r.physicalReturn === true && 
        r.verified === false &&
        !r.isDraft
      );

    case "Facturation":
      // Billing sees returns ready for finalization:
      // - Physical returns that are verified
      // - Non-physical returns (skip verification)
      return returns.filter(r => 
        !r.finalized &&
        !r.isDraft &&
        ((r.physicalReturn === true && r.verified === true) || r.physicalReturn === false)
      );

    case "Expert":
    case "Analyste":
    default:
      // Read-only roles see non-draft, non-finalized returns
      return returns.filter(r => !r.finalized && !r.isDraft);
  }
}

// =============================================================================
//   MAIN PAGE COMPONENT
// =============================================================================

export default function ReturnsPage() {
  const { data: session } = useSession();
  const [returns, setReturns] = React.useState<ReturnRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showHistory, setShowHistory] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedReturn, setSelectedReturn] = React.useState<ReturnRow | null>(null);
  const [showNewModal, setShowNewModal] = React.useState(false);

  // Get user role from session
  const userRole: UserRole = (session?.user as { role?: string })?.role || "Expert";
  
  // Role-based permissions
  const canCreate: boolean = userRole === "Gestionnaire";
  const canVerify: boolean = userRole === "Vérificateur";
  const canFinalize: boolean = userRole === "Facturation";
  const isReadOnly: boolean = userRole === "Expert" || userRole === "Analyste";

  const loadReturns = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReturns(showHistory);
      setReturns(data);
    } catch (error) {
      console.error("Failed to load returns:", error);
    } finally {
      setLoading(false);
    }
  }, [showHistory]);

  React.useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  // Filter returns by role and search query
  const filteredReturns = React.useMemo(() => {
    let result = filterReturnsByRole(returns, userRole, showHistory);
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        String(r.codeRetour).toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        r.expert.toLowerCase().includes(q) ||
        r.noCommande?.toLowerCase().includes(q) ||
        r.noClient?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [returns, userRole, showHistory, searchQuery]);

  // Stats for role-specific cards
  const stats = React.useMemo(() => {
    const active = filterReturnsByRole(returns, userRole, false);
    return {
      total: active.length,
      physical: active.filter(r => r.physicalReturn).length,
      pending: active.filter(r => r.physicalReturn && !r.verified).length,
      ready: active.filter(r => !r.physicalReturn || r.verified).length,
    };
  }, [returns, userRole]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
                Retours marchandises
              </h1>
              <p className="text-sm text-neutral-500">
                {userRole} • {filteredReturns.length} retour{filteredReturns.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* History Toggle */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  showHistory
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
              >
                <History className="h-4 w-4" />
                {showHistory ? "Historique" : "Actifs"}
              </button>

              {/* New Return Button - Only for Gestionnaire */}
              {canCreate && (
                <button
                  onClick={() => setShowNewModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nouveau retour
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par code, client, expert, commande..."
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total actifs"
            value={stats.total}
            icon={<Package className="h-5 w-5" />}
          />
          <StatCard
            label="Retours physiques"
            value={stats.physical}
            icon={<Truck className="h-5 w-5" />}
            color="amber"
          />
          {canVerify && (
            <StatCard
              label="À vérifier"
              value={stats.pending}
              icon={<AlertCircle className="h-5 w-5" />}
              color="orange"
            />
          )}
          {canFinalize && (
            <StatCard
              label="Prêts à finaliser"
              value={stats.ready}
              icon={<Check className="h-5 w-5" />}
              color="green"
            />
          )}
        </div>

        {/* Returns Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-12 w-12 mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <p className="text-neutral-500">Aucun retour trouvé</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Expert</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredReturns.map((row) => (
                  <ReturnTableRow
                    key={String(row.codeRetour)}
                    row={row}
                    userRole={userRole}
                    onView={() => setSelectedReturn(row)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReturn && (
        <DetailModal
          row={selectedReturn}
          userRole={userRole}
          onClose={() => setSelectedReturn(null)}
          onUpdate={loadReturns}
        />
      )}

      {/* New Return Modal */}
      {showNewModal && (
        <NewReturnModal
          onClose={() => setShowNewModal(false)}
          onCreated={async () => {
            setShowNewModal(false);
            await loadReturns();
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
//   STAT CARD COMPONENT
// =============================================================================

function StatCard({
  label,
  value,
  icon,
  color = "neutral",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: "neutral" | "amber" | "orange" | "green";
}) {
  const colors = {
    neutral: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    green: "bg-lime-100 dark:bg-lime-900/30 text-lime-600 dark:text-lime-400",
  };

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", colors[color])}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-semibold text-neutral-900 dark:text-white">{value}</div>
          <div className="text-xs text-neutral-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
//   TABLE ROW COMPONENT
// =============================================================================

function ReturnTableRow({
  row,
  userRole,
  onView,
}: {
  row: ReturnRow;
  userRole: UserRole;
  onView: () => void;
}) {
  // Row background based on status
  const getRowBg = (): string => {
    if (row.finalized) return "bg-neutral-50 dark:bg-neutral-950";
    if (row.isDraft) return "bg-white dark:bg-neutral-900";
    if (row.physicalReturn && !row.verified) return "bg-amber-50/50 dark:bg-amber-950/20";
    if (row.verified) return "bg-lime-50/50 dark:bg-lime-950/20";
    return "bg-white dark:bg-neutral-900";
  };

  return (
    <tr className={cn("hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors", getRowBg())}>
      <td className="px-4 py-3">
        <span className="font-mono text-sm font-medium text-neutral-900 dark:text-white">
          {String(row.codeRetour)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-neutral-900 dark:text-white">{row.client}</div>
        {row.noClient && (
          <div className="text-xs text-neutral-500">#{row.noClient}</div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
        {row.expert}
      </td>
      <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
        {new Date(row.reportedAt).toLocaleDateString("fr-CA")}
      </td>
      <td className="px-4 py-3">
        <StatusBadge row={row} />
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onView}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          Voir
        </button>
      </td>
    </tr>
  );
}

// =============================================================================
//   STATUS BADGE COMPONENT
// =============================================================================

function StatusBadge({ row }: { row: ReturnRow }) {
  if (row.finalized) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
        <Check className="h-3 w-3" />
        Finalisé
      </span>
    );
  }

  if (row.isDraft) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
        Brouillon
      </span>
    );
  }

  if (row.physicalReturn) {
    if (!row.verified) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
          <Package className="h-3 w-3" />
          À vérifier
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300">
        <Check className="h-3 w-3" />
        Vérifié
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
      Administratif
    </span>
  );
}

// =============================================================================
//   DETAIL MODAL COMPONENT
// =============================================================================

function DetailModal({
  row,
  userRole,
  onClose,
  onUpdate,
}: {
  row: ReturnRow;
  userRole: UserRole;
  onClose: () => void;
  onUpdate: () => Promise<void>;
}) {
  const { data: session } = useSession();
  const [draft, setDraft] = React.useState<ReturnRow>({ ...row });
  const [busy, setBusy] = React.useState(false);
  const [filesToUpload, setFilesToUpload] = React.useState<File[]>([]);

  // Role-based permissions - EXPLICIT BOOLEAN TYPES
  const canEdit: boolean = Boolean(userRole === "Gestionnaire" && !row.finalized && !row.verified);
  const canVerify: boolean = Boolean(userRole === "Vérificateur" && row.physicalReturn && !row.verified && !row.finalized);
  const canFinalize: boolean = Boolean(
    userRole === "Facturation" && 
    !row.finalized && 
    (!row.physicalReturn || row.verified)
  );
  const isReadOnly: boolean = Boolean(
    userRole === "Expert" || 
    userRole === "Analyste" || 
    row.finalized
  );

  // Determine which sections to show - EXPLICIT BOOLEAN TYPES
  const showVerificationFields: boolean = Boolean(canVerify || (row.verified && row.physicalReturn));
  const showFinalizationFields: boolean = Boolean(canFinalize || row.finalized);

  const handleSave = async () => {
    if (!canEdit) return;
    setBusy(true);
    try {
      await updateReturn(String(row.codeRetour), draft);
      
      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          await uploadAttachment(String(row.codeRetour), file);
        }
      }
      
      await onUpdate();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!canVerify) return;
    setBusy(true);
    try {
      await verifyReturn(String(row.codeRetour), { products: draft.products });
      await onUpdate();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur vérification");
    } finally {
      setBusy(false);
    }
  };

  const handleFinalize = async () => {
    if (!canFinalize) return;
    setBusy(true);
    try {
      await finalizeReturn(String(row.codeRetour), {
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
      });
      await onUpdate();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur finalisation");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit) return;
    if (!confirm("Supprimer ce retour?")) return;
    setBusy(true);
    try {
      await deleteReturn(String(row.codeRetour));
      await onUpdate();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur suppression");
    } finally {
      setBusy(false);
    }
  };

  // Prevent background scrolling
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl my-8 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center font-mono text-sm font-medium",
              row.finalized
                ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                : row.verified
                ? "bg-lime-200 dark:bg-lime-900 text-lime-700 dark:text-lime-300"
                : row.physicalReturn
                ? "bg-amber-200 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                : "bg-blue-200 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
            )}>
              {String(row.codeRetour).replace("R", "")}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Retour {String(row.codeRetour)}
              </h2>
              <p className="text-sm text-neutral-500">{row.client}</p>
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
          
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <StatusBadge row={row} />
            {row.physicalReturn && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                <Package className="h-3 w-3" />
                Retour physique
              </span>
            )}
            {row.verified && row.verifiedBy && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300">
                Vérifié par {row.verifiedBy}
              </span>
            )}
            {row.finalized && row.finalizedBy && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                Finalisé par {row.finalizedBy}
              </span>
            )}
          </div>

          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field
              label="Client"
              value={draft.client}
              onChange={(v) => setDraft({ ...draft, client: v })}
              icon={<Building2 className="h-4 w-4" />}
              disabled={!canEdit}
            />
            <Field
              label="No. Client"
              value={draft.noClient || ""}
              onChange={(v) => setDraft({ ...draft, noClient: v })}
              icon={<Hash className="h-4 w-4" />}
              disabled={!canEdit}
            />
            <Field
              label="Expert"
              value={draft.expert}
              onChange={(v) => setDraft({ ...draft, expert: v })}
              icon={<User className="h-4 w-4" />}
              disabled={!canEdit}
            />
            <Field
              label="Date signalement"
              value={draft.reportedAt.slice(0, 10)}
              onChange={(v) => setDraft({ ...draft, reportedAt: v })}
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              disabled={!canEdit}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field
              label="No. Commande"
              value={draft.noCommande || ""}
              onChange={(v) => setDraft({ ...draft, noCommande: v })}
              disabled={!canEdit}
            />
            <Field
              label="Tracking"
              value={draft.tracking || ""}
              onChange={(v) => setDraft({ ...draft, tracking: v })}
              icon={<Truck className="h-4 w-4" />}
              disabled={!canEdit}
            />
            <Field
              label="Transporteur"
              value={draft.transport || ""}
              onChange={(v) => setDraft({ ...draft, transport: v })}
              disabled={!canEdit}
            />
            <Field
              label="Montant"
              value={draft.amount?.toString() || ""}
              onChange={(v) => setDraft({ ...draft, amount: v ? Number(v) : null })}
              icon={<DollarSign className="h-4 w-4" />}
              disabled={!canEdit}
            />
          </div>

          {/* Physical Return Toggle */}
          <div className={cn(
            "p-4 rounded-lg border",
            draft.physicalReturn
              ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
              : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className={cn("h-5 w-5", draft.physicalReturn ? "text-amber-600" : "text-neutral-400")} />
                <div>
                  <div className={cn("text-sm font-medium", draft.physicalReturn ? "text-amber-900 dark:text-amber-100" : "text-neutral-900 dark:text-white")}>
                    Retour physique
                  </div>
                  <div className="text-xs text-neutral-500">
                    {draft.physicalReturn ? "Requiert vérification" : "Retour administratif"}
                  </div>
                </div>
              </div>
              <Switch 
                checked={Boolean(draft.physicalReturn)} 
                onCheckedChange={(v) => canEdit && setDraft({ ...draft, physicalReturn: v })}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Products Section */}
          <section>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-neutral-400" />
              Produits ({draft.products.length})
            </h3>
            <div className="space-y-3">
              {draft.products.map((product, idx) => (
                <ProductDetailRow
                  key={product.id}
                  product={product}
                  showVerificationFields={showVerificationFields}
                  showFinalizationFields={showFinalizationFields}
                  canEditBase={canEdit}
                  canEditVerification={canVerify}
                  canEditFinalization={canFinalize}
                  onChange={(updatedProduct) => {
                    const arr = draft.products.slice();
                    arr[idx] = updatedProduct;
                    setDraft({ ...draft, products: arr });
                  }}
                />
              ))}
            </div>
          </section>

          {/* Verification Info (readonly after verified) */}
          {row.verified && row.verifiedAt && (
            <div className="p-4 rounded-lg border border-lime-200 dark:border-lime-800 bg-lime-50 dark:bg-lime-950/30">
              <div className="flex items-center gap-2 text-sm text-lime-700 dark:text-lime-300">
                <Check className="h-4 w-4" />
                <span>Vérifié par {row.verifiedBy} le {new Date(row.verifiedAt).toLocaleDateString("fr-CA")}</span>
              </div>
            </div>
          )}

          {/* Finalization Section - Only for Facturation or after finalization */}
          {showFinalizationFields && (
            <section className={cn(
              "p-4 rounded-lg border",
              canFinalize
                ? "border-lime-300 dark:border-lime-800 bg-lime-50 dark:bg-lime-950/30"
                : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950"
            )}>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Finalisation
              </h3>
              
              {/* Warehouse Transfer */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field
                  label="Entrepôt origine"
                  value={draft.warehouseOrigin || ""}
                  onChange={(v) => setDraft({ ...draft, warehouseOrigin: v })}
                  disabled={!canFinalize}
                />
                <Field
                  label="Entrepôt destination"
                  value={draft.warehouseDestination || ""}
                  onChange={(v) => setDraft({ ...draft, warehouseDestination: v })}
                  disabled={!canFinalize}
                />
              </div>

              {/* Credits */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <Field
                  label="No. Crédit 1"
                  value={draft.noCredit || ""}
                  onChange={(v) => setDraft({ ...draft, noCredit: v })}
                  disabled={!canFinalize}
                />
                <Field
                  label="No. Crédit 2"
                  value={draft.noCredit2 || ""}
                  onChange={(v) => setDraft({ ...draft, noCredit2: v })}
                  disabled={!canFinalize}
                />
                <Field
                  label="No. Crédit 3"
                  value={draft.noCredit3 || ""}
                  onChange={(v) => setDraft({ ...draft, noCredit3: v })}
                  disabled={!canFinalize}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <Field
                  label="Crédité à 1"
                  value={draft.creditedTo || ""}
                  onChange={(v) => setDraft({ ...draft, creditedTo: v })}
                  disabled={!canFinalize}
                />
                <Field
                  label="Crédité à 2"
                  value={draft.creditedTo2 || ""}
                  onChange={(v) => setDraft({ ...draft, creditedTo2: v })}
                  disabled={!canFinalize}
                />
                <Field
                  label="Crédité à 3"
                  value={draft.creditedTo3 || ""}
                  onChange={(v) => setDraft({ ...draft, creditedTo3: v })}
                  disabled={!canFinalize}
                />
              </div>

              {/* Transport & Restocking */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field
                  label="Ville Ship-to"
                  value={draft.villeShipto || ""}
                  onChange={(v) => setDraft({ ...draft, villeShipto: v })}
                  disabled={!canFinalize}
                />
                <Field
                  label="Frais transport"
                  value={draft.transportAmount?.toString() || ""}
                  onChange={(v) => setDraft({ ...draft, transportAmount: v ? Number(v) : null })}
                  disabled={!canFinalize}
                />
                <Field
                  label="Frais restocking"
                  value={draft.restockingAmount?.toString() || ""}
                  onChange={(v) => setDraft({ ...draft, restockingAmount: v ? Number(v) : null })}
                  disabled={!canFinalize}
                />
              </div>
            </section>
          )}

          {/* Finalization Info (readonly after finalized) */}
          {row.finalized && row.finalizedAt && (
            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <Check className="h-4 w-4" />
                <span>Finalisé par {row.finalizedBy} le {new Date(row.finalizedAt).toLocaleDateString("fr-CA")}</span>
              </div>
            </div>
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
                  : "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:ring-neutral-900 dark:focus:ring-white"
              )}
              rows={3}
              value={draft.description || ""}
              onChange={(e) => canEdit && setDraft({ ...draft, description: e.target.value })}
              disabled={!canEdit}
              placeholder="Notes internes..."
            />
          </section>

          {/* Attachments */}
          {row.attachments && row.attachments.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-neutral-400" />
                Pièces jointes
              </h3>
              <div className="space-y-2">
                {row.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-neutral-400" />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">{att.filename}</span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between">
          <div>
            {canEdit && (
              <button
                disabled={busy}
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                Supprimer
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Fermer
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
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enregistrer
              </button>
            )}

            {/* Verify Button - Only for Vérificateur */}
            {canVerify && (
              <button
                disabled={busy}
                onClick={handleVerify}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-500 text-white text-sm font-medium hover:bg-lime-600 transition-colors",
                  busy && "opacity-50 cursor-not-allowed"
                )}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Vérifier
              </button>
            )}

            {/* Finalize Button - Only for Facturation */}
            {canFinalize && (
              <button
                disabled={busy}
                onClick={handleFinalize}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors",
                  busy && "opacity-50 cursor-not-allowed"
                )}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Finaliser
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
//   PRODUCT DETAIL ROW
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
      <div className="grid grid-cols-12 gap-3 items-end">
        <div className="col-span-3">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-1">Code produit</label>
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
        <div className="col-span-2">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-1">Qté attendue</label>
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
        <div className="col-span-4">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-1">Description produit</label>
          <input
            className="w-full h-9 px-2.5 rounded-md text-sm border bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
            value={product.descriptionProduit || ""}
            disabled
          />
        </div>
        <div className="col-span-3">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-1">Raison retour</label>
          <input
            className={cn(
              "w-full h-9 px-2.5 rounded-md text-sm border focus:outline-none focus:ring-1",
              !canEditBase
                ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-900 dark:focus:ring-white"
            )}
            value={product.descriptionRetour || ""}
            onChange={(e) => canEditBase && onChange({ ...product, descriptionRetour: e.target.value })}
            disabled={!canEditBase}
          />
        </div>
      </div>

      {/* Verification Fields - Shown for Vérificateur or after verification */}
      {showVerificationFields && (
        <div className={cn(
          "pt-3 border-t",
          canEditVerification ? "border-lime-200 dark:border-lime-800" : "border-neutral-100 dark:border-neutral-800"
        )}>
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-2">
              <label className="text-xs text-neutral-500 block mb-1">Qté reçue</label>
              <input
                type="number"
                min={0}
                className={cn(
                  "w-full h-9 px-2.5 rounded-md text-sm text-center border focus:outline-none focus:ring-1",
                  !canEditVerification
                    ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                    : "bg-lime-100 dark:bg-lime-950/50 border-lime-300 dark:border-lime-800 text-neutral-900 dark:text-white focus:ring-lime-500"
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
            <div className="col-span-2">
              <label className="text-xs text-neutral-500 block mb-1">Qté inventaire</label>
              <input
                type="number"
                className="w-full h-9 px-2.5 rounded-md text-sm text-center border bg-lime-100 dark:bg-lime-950/50 border-lime-300 dark:border-lime-800 text-neutral-900 dark:text-white cursor-not-allowed"
                value={product.qteInventaire ?? ((product.quantiteRecue ?? 0) - (product.qteDetruite ?? 0))}
                disabled
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-neutral-500 block mb-1">Qté détruite</label>
              <input
                type="number"
                min={0}
                max={product.quantiteRecue ?? 0}
                className={cn(
                  "w-full h-9 px-2.5 rounded-md text-sm text-center border focus:outline-none focus:ring-1",
                  !canEditVerification
                    ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                    : "bg-lime-100 dark:bg-lime-950/50 border-lime-300 dark:border-lime-800 text-neutral-900 dark:text-white focus:ring-lime-500"
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
            {showFinalizationFields && (
              <div className="col-span-3">
                <label className="text-xs text-neutral-500 block mb-1">Taux restocking</label>
                <select
                  className={cn(
                    "w-full h-9 px-2.5 rounded-md text-sm border focus:outline-none focus:ring-1",
                    !canEditFinalization
                      ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                      : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-900 dark:focus:ring-white"
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
            )}
            <div className="col-span-3">
              <label className="text-xs text-neutral-500 block mb-1">Description</label>
              <input
                className="w-full h-9 px-2.5 rounded-md text-sm border bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
                value={product.descriptionRetour || ""}
                disabled
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
//   FIELD COMPONENT
// =============================================================================

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
      if (data.customerName || data.CustomerName) setClient(String(data.customerName || data.CustomerName));
      if (data.salesrepName || data.SalesrepName) setExpert(String(data.salesrepName || data.SalesrepName));
      if (data.carrierName || data.CarrierName) setTransport(String(data.carrierName || data.CarrierName));
      if (data.tracking || data.TrackingNumber) setTracking(String(data.tracking || data.TrackingNumber));
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

// =============================================================================
//   HELPER COMPONENTS
// =============================================================================

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
          type="button"
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
