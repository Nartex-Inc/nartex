"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCurrentAccent } from "@/components/accent-color-provider";
import {
  Shield,
  Users,
  Search,
  ChevronDown,
  Check,
  AlertCircle,
  Loader2,
  Crown,
  UserCog,
  User,
  BarChart3,
  CheckCircle,
  Receipt,
  Sparkles,
  Pencil,
  Building2,
  X,
} from "lucide-react";

// ============================================================================
// CONFIGURATION - Matching Prisma UserRole enum
// ============================================================================

const ADMIN_EMAILS = ["n.labranche@sinto.ca"];

const AVAILABLE_ROLES = [
  {
    value: "Gestionnaire",
    label: "Gestionnaire",
    description: "Accès complet à toutes les fonctionnalités et paramètres",
    color: "bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))] border-[hsl(var(--accent))]/30",
    icon: Crown,
  },
  {
    value: "Analyste",
    label: "Analyste",
    description: "Accès aux rapports, analyses et tableaux de bord",
    color: "bg-[hsl(var(--info))]/20 text-[hsl(var(--info))] border-[hsl(var(--info))]/30",
    icon: BarChart3,
  },
  {
    value: "Verificateur",
    label: "Vérificateur",
    description: "Vérification et validation des retours et documents",
    color: "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] border-[hsl(var(--success))]/30",
    icon: CheckCircle,
  },
  {
    value: "Facturation",
    label: "Facturation",
    description: "Gestion de la facturation et des crédits",
    color: "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30",
    icon: Receipt,
  },
  {
    value: "Expert",
    label: "Expert",
    description: "Gestion des retours terrain et interventions client",
    color: "bg-[hsl(var(--info))]/20 text-[hsl(var(--info))] border-[hsl(var(--info))]/30",
    icon: Sparkles,
  },
  {
    value: "user",
    label: "Utilisateur",
    description: "Accès standard aux fonctionnalités de base",
    color: "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-muted))] border-[hsl(var(--border-default))]",
    icon: User,
  },
] as const;

type RoleValue = (typeof AVAILABLE_ROLES)[number]["value"];

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  canManageTickets: boolean;
  createdAt: string;
  updatedAt: string;
  tenants: TenantInfo[];
}

function isAdmin(email: string | null | undefined, role: string | null | undefined): boolean {
  if (!email) return false;
  if (ADMIN_EMAILS.includes(email)) return true;
  if (role === "Gestionnaire") return true;
  return false;
}

function getRoleConfig(roleValue: string) {
  return AVAILABLE_ROLES.find((r) => r.value === roleValue) || {
    value: roleValue,
    label: roleValue,
    description: "Rôle personnalisé",
    color: "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-muted))] border-[hsl(var(--border-default))]",
    icon: User,
  };
}

function SectionCard({ title, description, icon: Icon, children, accentColor }: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  accentColor: string;
}) {
  return (
    <div className="bg-[hsl(var(--bg-elevated))]/80 backdrop-blur-sm rounded-2xl border border-[hsl(var(--border-subtle))] overflow-hidden">
      <div className="p-6 border-b border-[hsl(var(--border-subtle))]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
            <Icon className="w-5 h-5" style={{ color: accentColor }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--text-primary))]">{title}</h2>
            {description && <p className="text-sm text-[hsl(var(--text-muted))]">{description}</p>}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config = getRoleConfig(role);
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function RoleSelector({ currentRole, onRoleChange, disabled, accentColor }: {
  currentRole: string;
  onRoleChange: (role: RoleValue) => void;
  disabled?: boolean;
  accentColor: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
          disabled ? "opacity-50 cursor-not-allowed bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-subtle))]" : "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-subtle))] hover:border-[hsl(var(--border-default))] cursor-pointer"
        }`}
      >
        <RoleBadge role={currentRole} />
        {!disabled && <ChevronDown className={`w-4 h-4 text-[hsl(var(--text-muted))] transition-transform ${isOpen ? "rotate-180" : ""}`} />}
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-[hsl(var(--bg-elevated))] border border-[hsl(var(--border-subtle))] rounded-xl shadow-xl z-20 overflow-hidden max-h-96 overflow-y-auto">
            {AVAILABLE_ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = currentRole === role.value;
              return (
                <button
                  key={role.value}
                  onClick={() => { onRoleChange(role.value); setIsOpen(false); }}
                  className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${isSelected ? "bg-[hsl(var(--bg-muted))]" : "hover:bg-[hsl(var(--bg-muted))]/50"}`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isSelected ? `${accentColor}20` : "hsl(var(--bg-muted))" }}>
                    <Icon className="w-4 h-4" style={{ color: isSelected ? accentColor : "hsl(var(--text-primary))" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[hsl(var(--text-primary))]">{role.label}</span>
                      {isSelected && <Check className="w-4 h-4" style={{ color: accentColor }} />}
                    </div>
                    <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{role.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TenantBadge({ tenant, onRemove }: { tenant: TenantInfo; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))] border border-[hsl(var(--border-subtle))]">
      <Building2 className="w-3 h-3" />
      {tenant.name}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:text-[hsl(var(--danger))] transition-colors">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

function TenantSelector({ userTenants, allTenants, onSave, disabled, accentColor }: {
  userTenants: TenantInfo[];
  allTenants: TenantInfo[];
  onSave: (tenantIds: string[]) => void;
  disabled?: boolean;
  accentColor: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(userTenants.map((t) => t.id)));
  const [hasChanges, setHasChanges] = useState(false);

  // Reset selection when userTenants changes (e.g. after save)
  useEffect(() => {
    setSelected(new Set(userTenants.map((t) => t.id)));
    setHasChanges(false);
  }, [userTenants]);

  const toggleTenant = (tenantId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tenantId)) {
        next.delete(tenantId);
      } else {
        next.add(tenantId);
      }
      // Check if selection differs from current
      const currentIds = new Set(userTenants.map((t) => t.id));
      const changed = next.size !== currentIds.size || [...next].some((id) => !currentIds.has(id));
      setHasChanges(changed);
      return next;
    });
  };

  const handleSave = () => {
    onSave(Array.from(selected));
    setIsOpen(false);
    setHasChanges(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
          disabled ? "opacity-50 cursor-not-allowed bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-subtle))]" : "bg-[hsl(var(--bg-muted))] border-[hsl(var(--border-subtle))] hover:border-[hsl(var(--border-default))] cursor-pointer"
        }`}
      >
        <Building2 className="w-4 h-4 text-[hsl(var(--text-muted))]" />
        <span className="text-sm text-[hsl(var(--text-secondary))]">
          {userTenants.length === 0 ? "Aucun" : `${userTenants.length} tenant${userTenants.length > 1 ? "s" : ""}`}
        </span>
        {!disabled && <ChevronDown className={`w-4 h-4 text-[hsl(var(--text-muted))] transition-transform ${isOpen ? "rotate-180" : ""}`} />}
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setIsOpen(false); setSelected(new Set(userTenants.map((t) => t.id))); setHasChanges(false); }} />
          <div className="absolute right-0 mt-2 w-72 bg-[hsl(var(--bg-elevated))] border border-[hsl(var(--border-subtle))] rounded-xl shadow-xl z-20 overflow-hidden">
            <div className="p-3 border-b border-[hsl(var(--border-subtle))]">
              <p className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Tenants</p>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {allTenants.map((tenant) => {
                const isChecked = selected.has(tenant.id);
                return (
                  <button
                    key={tenant.id}
                    onClick={() => toggleTenant(tenant.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${isChecked ? "bg-[hsl(var(--bg-muted))]" : "hover:bg-[hsl(var(--bg-muted))]/50"}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isChecked ? "border-transparent" : "border-[hsl(var(--border-default))]"}`} style={isChecked ? { backgroundColor: accentColor } : undefined}>
                      {isChecked && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[hsl(var(--text-primary))]">{tenant.name}</span>
                      <span className="text-xs text-[hsl(var(--text-muted))] ml-2">{tenant.slug}</span>
                    </div>
                  </button>
                );
              })}
              {allTenants.length === 0 && (
                <p className="px-3 py-4 text-sm text-[hsl(var(--text-muted))] text-center">Aucun tenant disponible</p>
              )}
            </div>
            {hasChanges && (
              <div className="p-3 border-t border-[hsl(var(--border-subtle))]">
                <button
                  onClick={handleSave}
                  className="w-full px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: accentColor }}
                >
                  Enregistrer
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function UserRow({ user, currentUserEmail, onRoleChange, onTenantChange, onToggleTickets, onEditProfile, isUpdating, allTenants, accentColor }: {
  user: UserData;
  currentUserEmail: string;
  onRoleChange: (userId: string, role: RoleValue) => void;
  onTenantChange: (userId: string, tenantIds: string[]) => void;
  onToggleTickets: (userId: string, value: boolean) => void;
  onEditProfile?: (userId: string) => void;
  isUpdating: boolean;
  allTenants: TenantInfo[];
  accentColor: string;
}) {
  const isSelf = user.email === currentUserEmail;
  const isProtectedAdmin = ADMIN_EMAILS.includes(user.email);

  return (
    <div className="flex items-center gap-4 p-4 bg-[hsl(var(--bg-muted))] rounded-xl border border-[hsl(var(--border-subtle))] hover:border-[hsl(var(--border-default))] transition-colors">
      <div className="relative flex-shrink-0">
        {user.image ? (
          <img src={user.image} alt={user.name} className="w-12 h-12 rounded-xl object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[hsl(var(--text-primary))] font-medium" style={{ backgroundColor: `${accentColor}40` }}>
            {user.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
        {isProtectedAdmin && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: accentColor }}>
            <Crown className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-[hsl(var(--text-primary))] truncate">{user.name}</h3>
          {isSelf && <span className="px-2 py-0.5 text-xs rounded-full bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-muted))]">Vous</span>}
        </div>
        <p className="text-sm text-[hsl(var(--text-muted))] truncate">{user.email}</p>
        {user.tenants.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {user.tenants.map((tenant) => (
              <TenantBadge key={tenant.id} tenant={tenant} />
            ))}
          </div>
        )}
        {user.tenants.length === 0 && (
          <p className="text-xs text-[hsl(var(--warning))] mt-1">Aucun tenant assigné</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onEditProfile && (
          <button
            onClick={() => onEditProfile(user.id)}
            className="p-2 rounded-lg bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))] hover:border-[hsl(var(--border-default))] hover:bg-[hsl(var(--bg-elevated))] transition-colors"
            title="Modifier le profil"
          >
            <Pencil className="w-4 h-4 text-[hsl(var(--text-muted))]" />
          </button>
        )}
        {isUpdating ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--text-muted))]" />
            <span className="text-sm text-[hsl(var(--text-muted))]">Mise à jour...</span>
          </div>
        ) : (
          <>
            <button
              onClick={() => onToggleTickets(user.id, !user.canManageTickets)}
              title={user.canManageTickets ? "Désactiver gestion billets TI" : "Activer gestion billets TI"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                user.canManageTickets
                  ? "border-transparent text-white"
                  : "border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-muted))] hover:border-[hsl(var(--border-default))]"
              }`}
              style={user.canManageTickets ? { backgroundColor: accentColor } : undefined}
            >
              <Shield className="w-3 h-3" />
              Billets TI
            </button>
            <TenantSelector
              userTenants={user.tenants}
              allTenants={allTenants}
              onSave={(tenantIds) => onTenantChange(user.id, tenantIds)}
              accentColor={accentColor}
            />
            <RoleSelector
              currentRole={user.role}
              onRoleChange={(role) => onRoleChange(user.id, role)}
              disabled={isProtectedAdmin && !ADMIN_EMAILS.includes(currentUserEmail)}
              accentColor={accentColor}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function RolesPage() {
  const { data: session } = useSession();
  const { color: accentColor } = useCurrentAccent();
  const router = useRouter();

  const [users, setUsers] = useState<UserData[]>([]);
  const [allTenants, setAllTenants] = useState<TenantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentUserEmail = session?.user?.email || "";
  const currentUserRole = users.find((u) => u.email === currentUserEmail)?.role;
  const userIsAdmin = isAdmin(currentUserEmail, currentUserRole);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        const [usersRes, tenantsRes] = await Promise.all([
          fetch("/api/user/role"),
          fetch("/api/tenants/all"),
        ]);
        if (!usersRes.ok) {
          const data = await usersRes.json();
          throw new Error(data.error || "Erreur lors du chargement");
        }
        const usersData = await usersRes.json();
        setUsers(usersData.users);

        if (tenantsRes.ok) {
          const tenantsData = await tenantsRes.json();
          setAllTenants(tenantsData.tenants);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: RoleValue) => {
    try {
      setUpdatingUserId(userId);
      setError(null);
      setSuccessMessage(null);
      const response = await fetch("/api/user/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setSuccessMessage("Rôle mis à jour avec succès");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleTickets = async (userId: string, value: boolean) => {
    try {
      setUpdatingUserId(userId);
      setError(null);
      setSuccessMessage(null);
      const response = await fetch("/api/user/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, canManageTickets: value }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, canManageTickets: value } : u)));
      setSuccessMessage(value ? "Gestion billets TI activée" : "Gestion billets TI désactivée");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleTenantChange = async (userId: string, tenantIds: string[]) => {
    try {
      setUpdatingUserId(userId);
      setError(null);
      setSuccessMessage(null);
      const response = await fetch("/api/user/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tenantIds }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }
      const data = await response.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, tenants: data.tenants } : u)));
      setSuccessMessage("Tenants mis à jour avec succès");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter((user) =>
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const roleStats = useMemo(() => {
    const stats: Record<string, number> = {};
    users.forEach((user) => { stats[user.role || "user"] = (stats[user.role || "user"] || 0) + 1; });
    return stats;
  }, [users]);

  if (!isLoading && !userIsAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "hsl(var(--danger) / 0.12)" }}>
          <AlertCircle className="w-8 h-8 text-[hsl(var(--danger))]" />
        </div>
        <h2 className="text-xl font-semibold text-[hsl(var(--text-primary))] mb-2">Accès non autorisé</h2>
        <p className="text-[hsl(var(--text-muted))] text-center max-w-md">
          Vous n&apos;avez pas les droits nécessaires pour accéder à cette page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--text-primary))]">Gestion des rôles</h1>
        <p className="text-[hsl(var(--text-muted))] mt-1">Gérez les permissions et les rôles des utilisateurs</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[hsl(var(--danger-muted))] border border-[hsl(var(--danger)/0.2)]">
          <AlertCircle className="w-5 h-5 text-[hsl(var(--danger))] flex-shrink-0" />
          <p className="text-sm text-[hsl(var(--danger))]">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }}>
          <Check className="w-5 h-5 flex-shrink-0" style={{ color: accentColor }} />
          <p className="text-sm" style={{ color: accentColor }}>{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[hsl(var(--bg-elevated))]/80 backdrop-blur-sm rounded-xl border border-[hsl(var(--border-subtle))] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
              <Users className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{users.length}</p>
              <p className="text-xs text-[hsl(var(--text-muted))]">Total</p>
            </div>
          </div>
        </div>
        {AVAILABLE_ROLES.slice(0, 3).map((role) => {
          const Icon = role.icon;
          return (
            <div key={role.value} className="bg-[hsl(var(--bg-elevated))]/80 backdrop-blur-sm rounded-xl border border-[hsl(var(--border-subtle))] p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role.color.split(" ")[0]}`}>
                  <Icon className={`w-5 h-5 ${role.color.split(" ")[1]}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{roleStats[role.value] || 0}</p>
                  <p className="text-xs text-[hsl(var(--text-muted))]">{role.label}s</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SectionCard title="Utilisateurs" description="Cliquez sur le rôle pour le modifier" icon={UserCog} accentColor={accentColor}>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--text-muted))]" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))] rounded-xl text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:border-[hsl(var(--border-default))]"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--text-muted))] mb-4" />
            <p className="text-[hsl(var(--text-muted))]">Chargement...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-[hsl(var(--text-muted))] mb-4" />
            <p className="text-[hsl(var(--text-muted))]">{searchQuery ? "Aucun résultat" : "Aucun utilisateur"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                currentUserEmail={currentUserEmail}
                onRoleChange={handleRoleChange}
                onTenantChange={handleTenantChange}
                onToggleTickets={handleToggleTickets}
                onEditProfile={userIsAdmin ? (userId) => router.push(`/dashboard/settings/profile?userId=${userId}`) : undefined}
                isUpdating={updatingUserId === user.id}
                allTenants={allTenants}
                accentColor={accentColor}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Description des rôles" icon={Shield} accentColor={accentColor}>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <div key={role.value} className="p-4 bg-[hsl(var(--bg-muted))] rounded-xl border border-[hsl(var(--border-subtle))]">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role.color.split(" ")[0]}`}>
                    <Icon className={`w-5 h-5 ${role.color.split(" ")[1]}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-[hsl(var(--text-primary))]">{role.label}</h3>
                    <p className="text-xs text-[hsl(var(--text-muted))]">{role.value}</p>
                  </div>
                </div>
                <p className="text-sm text-[hsl(var(--text-secondary))]">{role.description}</p>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
