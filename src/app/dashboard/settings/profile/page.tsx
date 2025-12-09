"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useAccentColor } from "@/components/dashboard/accent-color-provider";
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
} from "lucide-react";

// ============================================================================
// CONFIGURATION - Matching Prisma UserRole enum exactly
// ============================================================================

// Admin emails that have full access regardless of role
const ADMIN_EMAILS = ["n.labranche@sinto.ca", "d.drouin@sinto.ca"];

// Available roles matching your Prisma enum:
// Gestionnaire, Analyste, Verificateur, Facturation, Expert, user
const AVAILABLE_ROLES = [
  {
    value: "Gestionnaire",
    label: "Gestionnaire",
    description: "Accès complet à toutes les fonctionnalités et paramètres",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: Crown,
  },
  {
    value: "Analyste",
    label: "Analyste",
    description: "Accès aux rapports, analyses et tableaux de bord",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: BarChart3,
  },
  {
    value: "Verificateur",
    label: "Vérificateur",
    description: "Vérification et validation des retours et documents",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: CheckCircle,
  },
  {
    value: "Facturation",
    label: "Facturation",
    description: "Gestion de la facturation et des crédits",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Receipt,
  },
  {
    value: "Expert",
    label: "Expert",
    description: "Gestion des retours terrain et interventions client",
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    icon: Sparkles,
  },
  {
    value: "user",
    label: "Utilisateur",
    description: "Accès standard aux fonctionnalités de base",
    color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    icon: User,
  },
] as const;

type RoleValue = (typeof AVAILABLE_ROLES)[number]["value"];

// ============================================================================
// TYPES
// ============================================================================

interface UserData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isAdmin(email: string | null | undefined, role: string | null | undefined): boolean {
  if (!email) return false;
  if (ADMIN_EMAILS.includes(email)) return true;
  if (role === "Gestionnaire") return true;
  return false;
}

function getRoleConfig(roleValue: string) {
  return (
    AVAILABLE_ROLES.find((r) => r.value === roleValue) || {
      value: roleValue,
      label: roleValue,
      description: "Rôle personnalisé",
      color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      icon: User,
    }
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  accentColor,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  accentColor: string;
}) {
  return (
    <div className="bg-[#1a1a2e]/80 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: accentColor }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description && (
              <p className="text-sm text-white/50">{description}</p>
            )}
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
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.color}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function RoleSelector({
  currentRole,
  onRoleChange,
  disabled,
  accentColor,
}: {
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
          disabled
            ? "opacity-50 cursor-not-allowed bg-white/5 border-white/10"
            : "bg-white/5 border-white/10 hover:border-white/20 cursor-pointer"
        }`}
      >
        <RoleBadge role={currentRole} />
        {!disabled && (
          <ChevronDown
            className={`w-4 h-4 text-white/50 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden max-h-96 overflow-y-auto">
            {AVAILABLE_ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = currentRole === role.value;

              return (
                <button
                  key={role.value}
                  onClick={() => {
                    onRoleChange(role.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${
                    isSelected
                      ? "bg-white/10"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: isSelected
                        ? `${accentColor}20`
                        : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: isSelected ? accentColor : "white" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {role.label}
                      </span>
                      {isSelected && (
                        <Check
                          className="w-4 h-4"
                          style={{ color: accentColor }}
                        />
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">
                      {role.description}
                    </p>
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

function UserRow({
  user,
  currentUserEmail,
  onRoleChange,
  isUpdating,
  accentColor,
}: {
  user: UserData;
  currentUserEmail: string;
  onRoleChange: (userId: string, role: RoleValue) => void;
  isUpdating: boolean;
  accentColor: string;
}) {
  const isSelf = user.email === currentUserEmail;
  const isProtectedAdmin = ADMIN_EMAILS.includes(user.email);

  return (
    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="w-12 h-12 rounded-xl object-cover"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-medium"
            style={{ backgroundColor: `${accentColor}40` }}
          >
            {user.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
        {isProtectedAdmin && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: accentColor }}
          >
            <Crown className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white truncate">
            {user.name}
          </h3>
          {isSelf && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-white/70">
              Vous
            </span>
          )}
        </div>
        <p className="text-sm text-white/50 truncate">{user.email}</p>
      </div>

      {/* Role Selector */}
      <div className="flex-shrink-0">
        {isUpdating ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-white/50" />
            <span className="text-sm text-white/50">Mise à jour...</span>
          </div>
        ) : (
          <RoleSelector
            currentRole={user.role}
            onRoleChange={(role) => onRoleChange(user.id, role)}
            disabled={isProtectedAdmin && !ADMIN_EMAILS.includes(currentUserEmail)}
            accentColor={accentColor}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function RolesPage() {
  const { data: session } = useSession();
  const { accentColor } = useAccentColor();

  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentUserEmail = session?.user?.email || "";
  const currentUserRole = users.find((u) => u.email === currentUserEmail)?.role;
  const userIsAdmin = isAdmin(currentUserEmail, currentUserRole);

  // Fetch users
  useEffect(() => {
    async function fetchUsers() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/user/role");

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erreur lors du chargement");
        }

        const data = await response.json();
        setUsers(data.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsers();
  }, []);

  // Handle role change
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

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      setSuccessMessage("Rôle mis à jour avec succès");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Role statistics
  const roleStats = useMemo(() => {
    const stats: Record<string, number> = {};
    users.forEach((user) => {
      const role = user.role || "user";
      stats[role] = (stats[role] || 0) + 1;
    });
    return stats;
  }, [users]);

  // Access denied
  if (!isLoading && !userIsAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: "#ef444420" }}
        >
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Accès non autorisé
        </h2>
        <p className="text-white/50 text-center max-w-md">
          Vous n&apos;avez pas les droits nécessaires pour accéder à cette page.
          Seuls les gestionnaires peuvent gérer les rôles des utilisateurs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Gestion des rôles
        </h1>
        <p className="text-white/50 mt-1">
          Gérez les permissions et les rôles des utilisateurs de la plateforme
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl border"
          style={{
            backgroundColor: `${accentColor}10`,
            borderColor: `${accentColor}30`,
          }}
        >
          <Check className="w-5 h-5 flex-shrink-0" style={{ color: accentColor }} />
          <p className="text-sm" style={{ color: accentColor }}>
            {successMessage}
          </p>
        </div>
      )}

      {/* Stats - Show total + top 3 roles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1a2e]/80 backdrop-blur-sm rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Users className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{users.length}</p>
              <p className="text-xs text-white/50">Total utilisateurs</p>
            </div>
          </div>
        </div>

        {/* Show stats for roles that have users */}
        {AVAILABLE_ROLES.slice(0, 3).map((role) => {
          const Icon = role.icon;
          const count = roleStats[role.value] || 0;

          return (
            <div
              key={role.value}
              className="bg-[#1a1a2e]/80 backdrop-blur-sm rounded-xl border border-white/10 p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${role.color.split(" ")[0]}`}
                >
                  <Icon className={`w-5 h-5 ${role.color.split(" ")[1]}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-xs text-white/50">{role.label}s</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* User List */}
      <SectionCard
        title="Utilisateurs"
        description="Cliquez sur le rôle pour le modifier"
        icon={UserCog}
        accentColor={accentColor}
      >
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou rôle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white/50 mb-4" />
            <p className="text-white/50">Chargement des utilisateurs...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-white/20 mb-4" />
            <p className="text-white/50">
              {searchQuery
                ? "Aucun utilisateur trouvé"
                : "Aucun utilisateur enregistré"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                currentUserEmail={currentUserEmail}
                onRoleChange={handleRoleChange}
                isUpdating={updatingUserId === user.id}
                accentColor={accentColor}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Role Descriptions */}
      <SectionCard
        title="Description des rôles"
        description="Permissions associées à chaque rôle"
        icon={Shield}
        accentColor={accentColor}
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_ROLES.map((role) => {
            const Icon = role.icon;

            return (
              <div
                key={role.value}
                className="p-4 bg-white/5 rounded-xl border border-white/10"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${role.color.split(" ")[0]}`}
                  >
                    <Icon className={`w-5 h-5 ${role.color.split(" ")[1]}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{role.label}</h3>
                    <p className="text-xs text-white/50">{role.value}</p>
                  </div>
                </div>
                <p className="text-sm text-white/70">{role.description}</p>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
