// src/app/dashboard/settings/roles/page.tsx
"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  Shield,
  Users,
  Lock,
  Search,
  Check,
  AlertTriangle,
  Info,
  Loader2,
  Save,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentAccent } from "@/components/accent-color-provider";

/* ═══════════════════════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════════════════════ */
type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
};

// These should match your Prisma Role enum values
const AVAILABLE_ROLES = [
  { id: "admin", name: "Administrateur", description: "Accès complet à toutes les fonctionnalités", color: "#EF4444" },
  { id: "Gestionnaire", name: "Gestionnaire", description: "Gestion des équipes et rapports", color: "#F59E0B" },
  { id: "ventes-exec", name: "Ventes Exécutif", description: "Accès aux données de ventes avancées", color: "#3B82F6" },
  { id: "ventes_exec", name: "Ventes Exécutif (alt)", description: "Accès aux données de ventes", color: "#3B82F6" },
  { id: "Expert", name: "Expert", description: "Accès aux outils d'expertise technique", color: "#8B5CF6" },
  { id: "facturation", name: "Facturation", description: "Accès au module de facturation", color: "#10B981" },
  { id: "user", name: "Utilisateur", description: "Accès standard", color: "#6B7280" },
];

// Admin emails bypass
const ADMIN_EMAILS = ["n.labranche@sinto.ca"];

/* ═══════════════════════════════════════════════════════════════════════════════
   Role Badge Component
   ═══════════════════════════════════════════════════════════════════════════════ */
function RoleBadge({ role }: { role: string }) {
  const roleInfo = AVAILABLE_ROLES.find(r => r.id.toLowerCase() === role?.toLowerCase());
  const color = roleInfo?.color || "#6B7280";
  
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium"
      style={{ 
        background: `${color}15`,
        color: color,
      }}
    >
      <span 
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {roleInfo?.name || role}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Role Selector Dropdown
   ═══════════════════════════════════════════════════════════════════════════════ */
function RoleSelector({
  currentRole,
  onRoleChange,
  disabled = false,
}: {
  currentRole: string;
  onRoleChange: (role: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { color: accentColor } = useCurrentAccent();

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentRoleInfo = AVAILABLE_ROLES.find(r => r.id.toLowerCase() === currentRole?.toLowerCase());

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all",
          "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]",
          "hover:border-[hsl(var(--border-default))]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span 
          className="w-2 h-2 rounded-full"
          style={{ background: currentRoleInfo?.color || "#6B7280" }}
        />
        <span className="text-[hsl(var(--text-primary))]">
          {currentRoleInfo?.name || currentRole}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-[hsl(var(--text-muted))] transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div 
          className={cn(
            "absolute z-50 right-0 mt-2 w-64 py-1.5 rounded-xl",
            "bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))]",
            "shadow-xl shadow-black/20 animate-scale-in"
          )}
        >
          {AVAILABLE_ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => {
                onRoleChange(role.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors",
                "hover:bg-[hsl(var(--bg-elevated))]",
                currentRole?.toLowerCase() === role.id.toLowerCase() && "bg-[hsl(var(--bg-elevated))]"
              )}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                style={{ background: role.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[hsl(var(--text-primary))]">
                  {role.name}
                </p>
                <p className="text-[11px] text-[hsl(var(--text-muted))] mt-0.5">
                  {role.description}
                </p>
              </div>
              {currentRole?.toLowerCase() === role.id.toLowerCase() && (
                <Check className="h-4 w-4 shrink-0 mt-1" style={{ color: accentColor }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   User Row Component
   ═══════════════════════════════════════════════════════════════════════════════ */
function UserRow({
  user,
  onRoleChange,
  isUpdating,
  canEdit,
  currentUserEmail,
}: {
  user: User;
  onRoleChange: (userId: string, role: string) => void;
  isUpdating: boolean;
  canEdit: boolean;
  currentUserEmail: string | null | undefined;
}) {
  const { color: accentColor } = useCurrentAccent();
  const isCurrentUser = user.email.toLowerCase() === currentUserEmail?.toLowerCase();

  const initials = (user.name || user.email)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <tr className="hover:bg-[hsl(var(--bg-muted))] transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
          >
            {user.image ? (
              <img src={user.image} alt={user.name || ""} className="w-full h-full rounded-xl object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-[hsl(var(--text-primary))] truncate">
              {user.name || "Sans nom"}
              {isCurrentUser && (
                <span className="ml-2 text-[11px] font-normal text-[hsl(var(--text-muted))]">(vous)</span>
              )}
            </p>
            <p className="text-[12px] text-[hsl(var(--text-muted))] truncate">
              {user.email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        {canEdit && !isCurrentUser ? (
          <RoleSelector
            currentRole={user.role}
            onRoleChange={(role) => onRoleChange(user.id, role)}
            disabled={isUpdating}
          />
        ) : (
          <RoleBadge role={user.role} />
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <span className="text-[12px] text-[hsl(var(--text-muted))]">
          {new Date(user.createdAt).toLocaleDateString("fr-CA")}
        </span>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Roles Page Component
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function RolesSettingsPage() {
  const { data: session } = useSession();
  const { color: accentColor } = useCurrentAccent();

  const [users, setUsers] = React.useState<User[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Check if current user can edit roles
  const userEmail = session?.user?.email;
  const userRole = (session?.user as any)?.role;
  const canEditRoles = 
    userRole === "admin" || 
    (userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase()));

  // Fetch users
  const fetchUsers = React.useCallback(async () => {
    if (!canEditRoles) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch("/api/user/role");
      
      if (!response.ok) {
        if (response.status === 403) {
          setError("Vous n'avez pas les permissions pour gérer les rôles");
        } else {
          throw new Error("Failed to fetch users");
        }
        return;
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Erreur lors du chargement des utilisateurs");
    } finally {
      setIsLoading(false);
    }
  }, [canEditRoles]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: string) => {
    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/user/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      const updatedUser = await response.json();
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updatedUser.role } : u))
      );
      
      setSuccessMessage(`Rôle de ${updatedUser.name || updatedUser.email} mis à jour`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error updating role:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter users
  const filteredUsers = React.useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Role statistics
  const roleStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    users.forEach((u) => {
      const roleKey = u.role.toLowerCase();
      stats[roleKey] = (stats[roleKey] || 0) + 1;
    });
    return stats;
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div 
        className="flex items-start gap-4 p-4 rounded-xl"
        style={{ 
          background: `${accentColor}10`,
          border: `1px solid ${accentColor}30`
        }}
      >
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}20`, color: accentColor }}
        >
          <Info className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-[hsl(var(--text-primary))]">
            Gestion des rôles utilisateurs
          </h3>
          <p className="text-[13px] text-[hsl(var(--text-secondary))] mt-1">
            Attribuez des rôles aux utilisateurs pour contrôler leurs permissions d&apos;accès.
            Les rôles sont stockés dans votre base de données PostgreSQL.
          </p>
        </div>
      </div>

      {/* Access Denied Message */}
      {!canEditRoles && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Lock className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-[14px] font-medium text-amber-600 dark:text-amber-400">
              Accès restreint
            </p>
            <p className="text-[13px] text-[hsl(var(--text-muted))]">
              Seuls les administrateurs peuvent gérer les rôles des utilisateurs.
            </p>
          </div>
        </div>
      )}

      {canEditRoles && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div 
              className="p-4 rounded-xl"
              style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border-subtle))" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-[hsl(var(--text-muted))]" />
                <span className="text-[12px] font-medium text-[hsl(var(--text-muted))]">Total</span>
              </div>
              <p className="text-[24px] font-bold text-[hsl(var(--text-primary))]">{users.length}</p>
            </div>
            {AVAILABLE_ROLES.slice(0, 3).map((role) => (
              <div 
                key={role.id}
                className="p-4 rounded-xl"
                style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border-subtle))" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: role.color }} />
                  <span className="text-[12px] font-medium text-[hsl(var(--text-muted))]">{role.name}</span>
                </div>
                <p className="text-[24px] font-bold text-[hsl(var(--text-primary))]">
                  {roleStats[role.id.toLowerCase()] || 0}
                </p>
              </div>
            ))}
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--text-muted))]" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-11 pr-4 py-2.5 rounded-xl text-[14px]",
                  "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]",
                  "text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]",
                  "focus:outline-none focus:ring-2 focus:border-transparent"
                )}
                style={{ "--tw-ring-color": accentColor } as React.CSSProperties}
              />
            </div>
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all",
                "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))]",
                "hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))]",
                "disabled:opacity-50"
              )}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Actualiser
            </button>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Check className="h-4 w-4 text-emerald-500" />
              <p className="text-[13px] text-emerald-600 dark:text-emerald-400">{successMessage}</p>
            </div>
          )}
          
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Users Table */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "hsl(var(--bg-surface))",
              border: "1px solid hsl(var(--border-subtle))",
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: accentColor }} />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Users className="h-12 w-12 text-[hsl(var(--text-muted))] mb-4" />
                <p className="text-[14px] text-[hsl(var(--text-muted))]">
                  {searchQuery ? "Aucun utilisateur trouvé" : "Aucun utilisateur"}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ background: "hsl(var(--bg-muted))" }}>
                    <th className="text-left px-6 py-3 text-[12px] font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="text-left px-6 py-3 text-[12px] font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="text-right px-6 py-3 text-[12px] font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider">
                      Inscrit le
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border-subtle))]">
                  {filteredUsers.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onRoleChange={handleRoleChange}
                      isUpdating={isUpdating}
                      canEdit={canEditRoles}
                      currentUserEmail={userEmail}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
