"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Search,
  Filter,
  RotateCcw,
  Plus,
  Eye,
  Clock,
  User,
  Building2,
  MapPin,
  Tag,
  MessageSquare,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Circle,
  Pause,
  XCircle,
  Send,
  ChevronDown,
  Archive,
  Trash2,
  ArrowLeft,
  Paperclip,
  FileText,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SUPPORT_CATEGORIES,
  TICKET_STATUSES,
  getPriorityInfo,
  type Priority,
  type CategoryKey,
} from "@/lib/support-constants";

// =============================================================================
// TYPES
// =============================================================================

interface TicketRow {
  id: string;
  code: string;
  sujet: string;
  categorie: string;
  sousCategorie: string | null;
  priorite: string;
  statut: string;
  userName: string;
  userEmail: string;
  site: string;
  departement: string;
  createdAt: string;
  updatedAt: string;
  attachmentsCount: number;
  commentsCount: number;
}

interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  commentId: string | null;
  uploadedAt: string;
  viewUrl: string;
  previewUrl: string;
  downloadUrl: string;
}

interface TicketComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  attachments: TicketAttachment[];
}

interface TicketDetail {
  id: string;
  code: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  tenantName: string;
  site: string;
  departement: string;
  categorie: string;
  sousCategorie: string | null;
  impact: string;
  portee: string;
  urgence: string;
  priorite: string;
  sujet: string;
  description: string;
  statut: string;
  assigneA: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  slaTarget: string | null;
  attachments: TicketAttachment[];
  comments: TicketComment[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function SupportTicketsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = (session?.user as any)?.role;
  const isGestionnaire = userRole === "Gestionnaire" || userRole === "admin";

  // View mode: active (default) or history (resolved/closed)
  const [viewMode, setViewMode] = React.useState<"active" | "history">("active");

  // Filters
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [showFilters, setShowFilters] = React.useState(false);

  // Build SWR URL based on view mode and filters
  const ticketsUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    if (viewMode === "history") {
      params.set("view", "history");
    }
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    const qs = params.toString();
    return `/api/support/tickets${qs ? `?${qs}` : ""}`;
  }, [viewMode, statusFilter]);

  // Data
  const { data: ticketsRes, isLoading, mutate } = useSWR<{ ok: boolean; data: TicketRow[] }>(
    ticketsUrl,
    fetcher,
    { refreshInterval: 30000 }
  );

  // Detail modal
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const tickets = ticketsRes?.data ?? [];

  // Filter and search
  const filteredTickets = React.useMemo(() => {
    let result = tickets;

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (t) =>
          t.code.toLowerCase().includes(q) ||
          t.sujet.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          t.userEmail.toLowerCase().includes(q)
      );
    }

    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priorite === priorityFilter);
    }

    return result;
  }, [tickets, query, priorityFilter]);

  // Stats
  const stats = React.useMemo(() => ({
    total: tickets.length,
    nouveau: tickets.filter((t) => t.statut === "nouveau").length,
    enCours: tickets.filter((t) => t.statut === "en_cours").length,
    resolu: tickets.filter((t) => t.statut === "resolu" || t.statut === "ferme").length,
  }), [tickets]);

  const hasActiveFilters = statusFilter !== "all" || priorityFilter !== "all" || query.trim();

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setViewMode("active");
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                Billets de support
              </h1>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {viewMode === "history"
                  ? "Billets résolus et fermés"
                  : isGestionnaire
                  ? "Gérez les demandes d'assistance technique"
                  : "Suivez vos demandes d'assistance"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setViewMode(viewMode === "active" ? "history" : "active");
                  setStatusFilter("all");
                }}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors",
                  viewMode === "history"
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                )}
              >
                {viewMode === "history" ? (
                  <>
                    <ArrowLeft className="h-4 w-4" />
                    Billets actifs
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    Historique
                  </>
                )}
              </button>
              <button
                onClick={() => router.push("/dashboard/support/new")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nouveau billet
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Nouveaux" value={stats.nouveau} variant="info" />
            <StatCard label="En cours" value={stats.enCours} variant="warning" />
            <StatCard label="Résolus" value={stats.resolu} variant="success" />
          </div>
        </header>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher par code, sujet, utilisateur..."
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow"
              />
            </div>
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
            </button>
            <button
              onClick={() => mutate()}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              title="Rafraîchir"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Réinitialiser"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none"
                >
                  <option value="all">Tous</option>
                  {TICKET_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Priorité</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none"
                >
                  <option value="all">Toutes</option>
                  <option value="P1">P1 - Critique</option>
                  <option value="P2">P2 - Haute</option>
                  <option value="P3">P3 - Moyenne</option>
                  <option value="P4">P4 - Basse</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="h-8 w-8 text-neutral-400 animate-spin mb-3" />
              <p className="text-sm text-neutral-500">Chargement...</p>
            </div>
          )}

          {!isLoading && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Sujet</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Demandeur</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Catégorie</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Priorité</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Statut</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Créé</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {filteredTickets.map((ticket) => {
                      const priorityInfo = getPriorityInfo(ticket.priorite as Priority);
                      const statusInfo = TICKET_STATUSES.find((s) => s.value === ticket.statut);
                      const categoryLabel = SUPPORT_CATEGORIES[ticket.categorie as CategoryKey]?.label || ticket.categorie;

                      return (
                        <tr
                          key={ticket.id}
                          onClick={() => setSelectedId(ticket.id)}
                          className="group cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-medium text-neutral-900 dark:text-white whitespace-nowrap">
                            {ticket.code}
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <div className="font-medium text-neutral-900 dark:text-white truncate">{ticket.sujet}</div>
                            {ticket.commentsCount > 0 && (
                              <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-500">
                                <MessageSquare className="h-3 w-3" />
                                {ticket.commentsCount}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-neutral-900 dark:text-white">{ticket.userName}</div>
                            <div className="text-xs text-neutral-500">{ticket.site}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                              {categoryLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold", priorityInfo.bgColor, priorityInfo.color)}>
                              {priorityInfo.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium", statusInfo?.bgColor, statusInfo?.color)}>
                              <StatusIcon status={ticket.statut} />
                              {statusInfo?.label || ticket.statut}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                            {new Date(ticket.createdAt).toLocaleDateString("fr-CA")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(ticket.id);
                              }}
                              className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                              title="Voir"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredTickets.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
                    <AlertTriangle className="h-10 w-10 mb-3 opacity-50" />
                    <p className="text-sm">Aucun billet trouvé</p>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-xs text-neutral-500">
                {filteredTickets.length} billet{filteredTickets.length !== 1 ? "s" : ""}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedId && (
        <TicketDetailModal
          ticketId={selectedId}
          onClose={() => setSelectedId(null)}
          onRefresh={() => mutate()}
          isGestionnaire={isGestionnaire}
          currentUserId={session?.user?.id}
        />
      )}
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function StatCard({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "info" | "success" | "warning" }) {
  return (
    <div className={cn(
      "px-4 py-3 rounded-lg border",
      variant === "default" && "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
      variant === "info" && "border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30",
      variant === "success" && "border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30",
      variant === "warning" && "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30"
    )}>
      <div className={cn(
        "text-2xl font-semibold tabular-nums",
        variant === "default" && "text-neutral-900 dark:text-white",
        variant === "info" && "text-blue-700 dark:text-blue-400",
        variant === "success" && "text-green-700 dark:text-green-400",
        variant === "warning" && "text-amber-700 dark:text-amber-400"
      )}>
        {value}
      </div>
      <div className="text-xs text-neutral-500 mt-0.5">{label}</div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "nouveau":
      return <Circle className="h-3 w-3" />;
    case "en_cours":
      return <Clock className="h-3 w-3" />;
    case "en_attente":
      return <Pause className="h-3 w-3" />;
    case "resolu":
      return <CheckCircle className="h-3 w-3" />;
    case "ferme":
      return <XCircle className="h-3 w-3" />;
    default:
      return <Circle className="h-3 w-3" />;
  }
}

// =============================================================================
// TICKET DETAIL MODAL
// =============================================================================

function TicketDetailModal({
  ticketId,
  onClose,
  onRefresh,
  isGestionnaire,
  currentUserId,
}: {
  ticketId: string;
  onClose: () => void;
  onRefresh: () => void;
  isGestionnaire: boolean;
  currentUserId?: string;
}) {
  const { data: ticketRes, isLoading, mutate: mutateTicket } = useSWR<{ ok: boolean; data: TicketDetail }>(
    `/api/support/tickets/${ticketId}`,
    fetcher
  );

  const ticket = ticketRes?.data;

  // Comment form state
  const [commentContent, setCommentContent] = React.useState("");
  const [isInternalComment, setIsInternalComment] = React.useState(false);
  const [newStatus, setNewStatus] = React.useState<string>("");
  const [submittingComment, setSubmittingComment] = React.useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false);
  const [commentFiles, setCommentFiles] = React.useState<File[]>([]);
  const commentFileInputRef = React.useRef<HTMLInputElement>(null);

  // Delete
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce billet ? Cette action est irréversible.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        onRefresh();
        onClose();
      }
    } catch (err) {
      console.error("Failed to delete ticket:", err);
    } finally {
      setDeleting(false);
    }
  };

  // Status update
  const [updating, setUpdating] = React.useState(false);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: status }),
      });
      const json = await res.json();
      if (json.ok) {
        mutateTicket();
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdating(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentContent.trim(),
          isInternal: isGestionnaire && isInternalComment,
          newStatus: isGestionnaire && newStatus ? newStatus : undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        // Upload comment files if any
        if (commentFiles.length > 0 && json.data?.id) {
          const formData = new FormData();
          commentFiles.forEach((f) => formData.append("files", f));
          formData.append("commentId", json.data.id);
          try {
            await fetch(`/api/support/tickets/${ticketId}/attachments`, {
              method: "POST",
              body: formData,
            });
          } catch (uploadErr) {
            console.error("Failed to upload comment attachments:", uploadErr);
          }
        }
        setCommentContent("");
        setNewStatus("");
        setIsInternalComment(false);
        setCommentFiles([]);
        mutateTicket();
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to submit comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (isLoading || !ticket) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-8">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      </div>
    );
  }

  const priorityInfo = getPriorityInfo(ticket.priorite as Priority);
  const statusInfo = TICKET_STATUSES.find((s) => s.value === ticket.statut);
  const categoryLabel = SUPPORT_CATEGORIES[ticket.categorie as CategoryKey]?.label || ticket.categorie;
  const isOwnTicket = ticket.userId === currentUserId;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono font-semibold text-lg text-neutral-900 dark:text-white">{ticket.code}</span>
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold", priorityInfo.bgColor, priorityInfo.color)}>
                {priorityInfo.priority} - {priorityInfo.label}
              </span>

              {/* Status with dropdown for Gestionnaire */}
              {isGestionnaire ? (
                <div className="relative">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    disabled={updating}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity",
                      statusInfo?.bgColor,
                      statusInfo?.color
                    )}
                  >
                    <StatusIcon status={ticket.statut} />
                    {statusInfo?.label}
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-1 py-1 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-10 min-w-[160px]">
                      {TICKET_STATUSES.filter((s) => s.value !== ticket.statut).map((s) => (
                        <button
                          key={s.value}
                          onClick={() => {
                            updateStatus(s.value);
                            setShowStatusDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        >
                          <StatusIcon status={s.value} />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium", statusInfo?.bgColor, statusInfo?.color)}>
                  <StatusIcon status={ticket.statut} />
                  {statusInfo?.label}
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{ticket.sujet}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoItem icon={User} label="Demandeur" value={ticket.userName} subvalue={ticket.userEmail} />
            <InfoItem icon={Building2} label="Organisation" value={ticket.tenantName} />
            <InfoItem icon={MapPin} label="Site" value={ticket.site} />
            <InfoItem icon={Tag} label="Catégorie" value={categoryLabel} subvalue={ticket.sousCategorie || undefined} />
            <InfoItem icon={Clock} label="Créé le" value={new Date(ticket.createdAt).toLocaleString("fr-CA")} />
            {ticket.slaTarget && (
              <InfoItem icon={AlertTriangle} label="SLA" value={new Date(ticket.slaTarget).toLocaleString("fr-CA")} />
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Description</h3>
            <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

          {/* Ticket-level Attachments */}
          {ticket.attachments && ticket.attachments.filter((a) => !a.commentId).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Pièces jointes ({ticket.attachments.filter((a) => !a.commentId).length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ticket.attachments.filter((a) => !a.commentId).map((att) => (
                  <AttachmentCard key={att.id} attachment={att} />
                ))}
              </div>
            </div>
          )}

          {/* Impact Assessment */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Évaluation</h3>
            <div className="flex gap-4">
              <div className="flex-1 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-center">
                <div className="text-xs text-neutral-500 mb-1">Impact</div>
                <div className="text-sm font-medium text-neutral-900 dark:text-white capitalize">{ticket.impact}</div>
              </div>
              <div className="flex-1 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-center">
                <div className="text-xs text-neutral-500 mb-1">Portée</div>
                <div className="text-sm font-medium text-neutral-900 dark:text-white capitalize">{ticket.portee}</div>
              </div>
              <div className="flex-1 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-center">
                <div className="text-xs text-neutral-500 mb-1">Urgence</div>
                <div className="text-sm font-medium text-neutral-900 dark:text-white capitalize">{ticket.urgence}</div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversation ({ticket.comments?.length || 0})
            </h3>

            {/* Comments List */}
            <div className="space-y-3 mb-4">
              {ticket.comments && ticket.comments.length > 0 ? (
                [...ticket.comments].reverse().map((comment) => {
                  const isMyComment = comment.userId === currentUserId;
                  return (
                    <div
                      key={comment.id}
                      className={cn(
                        "p-4 rounded-lg",
                        comment.isInternal
                          ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                          : isMyComment
                          ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                          : "bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-neutral-900 dark:text-white">
                            {comment.userName}
                          </span>
                          {comment.isInternal && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                              Note interne
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-500">
                          {new Date(comment.createdAt).toLocaleString("fr-CA")}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {comment.attachments.map((att) => (
                            <AttachmentCard key={att.id} attachment={att} compact />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-neutral-500 italic py-4 text-center">
                  Aucun commentaire pour le moment
                </p>
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={submitComment} className="space-y-3">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder={isGestionnaire ? "Ajouter une réponse ou une note..." : "Ajouter un commentaire..."}
                rows={3}
                className="w-full px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors resize-none"
              />

              {/* Comment file chips */}
              {commentFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {commentFiles.map((file, idx) => (
                    <span
                      key={`${file.name}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span className="max-w-[120px] truncate">{file.name}</span>
                      <span className="text-neutral-400">({formatFileSize(file.size)})</span>
                      <button
                        type="button"
                        onClick={() => setCommentFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="ml-0.5 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <input
                ref={commentFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    setCommentFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                    e.target.value = "";
                  }
                }}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => commentFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Joindre un fichier"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Joindre
                  </button>
                  {isGestionnaire && (
                    <>
                      <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternalComment}
                          onChange={(e) => setIsInternalComment(e.target.checked)}
                          className="w-4 h-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                        />
                        Note interne
                      </label>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">Changer statut:</span>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="h-8 px-2 text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        >
                          <option value="">Aucun changement</option>
                          {TICKET_STATUSES.filter((s) => s.value !== ticket.statut).map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submittingComment || !commentContent.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {submittingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-neutral-200 dark:border-neutral-800">
          <div>
            {isGestionnaire && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Supprimer
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, subvalue }: { icon: React.ElementType; label: string; value: string; subvalue?: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-neutral-400 mt-0.5" />
      <div>
        <div className="text-xs text-neutral-500">{label}</div>
        <div className="text-neutral-900 dark:text-white">{value}</div>
        {subvalue && <div className="text-xs text-neutral-500">{subvalue}</div>}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function AttachmentCard({ attachment, compact }: { attachment: TicketAttachment; compact?: boolean }) {
  const isImage = attachment.mimeType.startsWith("image/");

  if (isImage) {
    return (
      <a
        href={attachment.viewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group relative block rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors",
          compact ? "w-20 h-20" : "w-28 h-28"
        )}
        title={attachment.fileName}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.previewUrl}
          alt={attachment.fileName}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </a>
    );
  }

  return (
    <a
      href={attachment.downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors",
        compact ? "px-2 py-1.5" : "px-3 py-2"
      )}
      title={attachment.fileName}
    >
      <FileText className={cn("shrink-0 text-neutral-400", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-neutral-900 dark:text-white", compact ? "text-xs" : "text-sm")}>
          {attachment.fileName}
        </p>
        {!compact && (
          <p className="text-xs text-neutral-500">{formatFileSize(attachment.fileSize)}</p>
        )}
      </div>
      <Download className={cn("shrink-0 text-neutral-400", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
    </a>
  );
}
