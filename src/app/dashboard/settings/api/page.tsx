// src/app/dashboard/settings/api/page.tsx
"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentAccent } from "@/components/accent-color-provider";

/* ═══════════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════════ */
type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string; // Only show prefix, never full key after creation
  permissions: string[];
  createdAt: string;
  lastUsedAt: string | null;
};

type NewKeyResponse = {
  id: string;
  name: string;
  key: string; // Full key - only shown once on creation
  keyPrefix: string;
  permissions: string[];
  createdAt: string;
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Create Key Modal
   ═══════════════════════════════════════════════════════════════════════════════ */
function CreateKeyModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (key: NewKeyResponse) => void;
}) {
  const { color: accentColor } = useCurrentAccent();
  const [name, setName] = React.useState("");
  const [permissions, setPermissions] = React.useState<string[]>(["read"]);
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [newKey, setNewKey] = React.useState<NewKeyResponse | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Le nom est requis");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), permissions }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create key");
      }

      const key = await response.json();
      setNewKey(key);
      onCreated(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setName("");
    setPermissions(["read"]);
    setError(null);
    setNewKey(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div 
        className="relative w-full max-w-md rounded-2xl p-6 animate-scale-in"
        style={{ 
          background: "hsl(var(--bg-surface))",
          border: "1px solid hsl(var(--border-default))"
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[16px] font-semibold text-[hsl(var(--text-primary))]">
            {newKey ? "Clé API créée" : "Nouvelle clé API"}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-muted))] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {newKey ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[hsl(var(--warning-muted))] border border-[hsl(var(--warning)/0.2)]">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-medium text-[hsl(var(--warning))]">
                    Copiez votre clé maintenant
                  </p>
                  <p className="text-[12px] text-[hsl(var(--text-muted))] mt-1">
                    Cette clé ne sera plus jamais affichée. Conservez-la en lieu sûr.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-medium text-[hsl(var(--text-muted))]">
                Votre clé API
              </label>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2.5 rounded-lg text-[13px] font-mono bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-primary))] break-all">
                  {newKey.key}
                </code>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "px-3 py-2 rounded-lg transition-colors shrink-0",
                    copied
                      ? "bg-[hsl(var(--success-muted))] text-[hsl(var(--success))]"
                      : "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]"
                  )}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:opacity-90"
              style={{ background: accentColor }}
            >
              J&apos;ai copié ma clé
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[hsl(var(--text-secondary))]">
                Nom de la clé
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Production, Development..."
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl text-[14px]",
                  "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]",
                  "text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]",
                  "focus:outline-none focus:ring-2"
                )}
                style={{ "--tw-ring-color": accentColor } as React.CSSProperties}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[hsl(var(--text-secondary))]">
                Permissions
              </label>
              <div className="flex gap-2">
                {["read", "write"].map((perm) => (
                  <button
                    key={perm}
                    onClick={() => {
                      setPermissions((prev) =>
                        prev.includes(perm)
                          ? prev.filter((p) => p !== perm)
                          : [...prev, perm]
                      );
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg text-[13px] font-medium transition-all",
                      permissions.includes(perm)
                        ? "text-white"
                        : "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))]"
                    )}
                    style={permissions.includes(perm) ? { background: accentColor } : undefined}
                  >
                    {perm === "read" ? "Lecture" : "Écriture"}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-[13px] text-[hsl(var(--danger))]">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl text-[14px] font-medium bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !name.trim()}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                style={{ background: accentColor }}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Main API Settings Page
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function ApiSettingsPage() {
  const { data: session } = useSession();
  const { color: accentColor } = useCurrentAccent();
  
  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Fetch API keys
  const fetchKeys = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/keys");
      
      if (!response.ok) {
        if (response.status === 404) {
          // API route not implemented yet - show empty state
          setApiKeys([]);
          return;
        }
        throw new Error("Failed to fetch keys");
      }
      
      const data = await response.json();
      setApiKeys(data);
    } catch (err) {
      console.error("Error fetching keys:", err);
      // Don't show error if API route doesn't exist yet
      setApiKeys([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  // Delete key
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (response.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== id));
      }
    } catch (err) {
      console.error("Error deleting key:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Copy key prefix
  const handleCopy = async (prefix: string, id: string) => {
    await navigator.clipboard.writeText(prefix);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle key created
  const handleKeyCreated = (newKey: NewKeyResponse) => {
    setApiKeys((prev) => [
      {
        id: newKey.id,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        permissions: newKey.permissions,
        createdAt: newKey.createdAt,
        lastUsedAt: null,
      },
      ...prev,
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div
        className="flex items-start gap-4 p-4 rounded-xl"
        style={{
          background: "hsl(var(--warning) / 0.1)",
          border: "1px solid hsl(var(--warning) / 0.3)",
        }}
      >
        <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))] shrink-0 mt-0.5" />
        <div>
          <p className="text-[14px] font-semibold text-[hsl(var(--text-primary))]">
            Gardez vos clés API confidentielles
          </p>
          <p className="text-[13px] text-[hsl(var(--text-muted))] mt-1">
            Ne partagez jamais vos clés API dans des dépôts publics ou côté client.
            Utilisez des variables d&apos;environnement pour les stocker en toute sécurité.
          </p>
        </div>
      </div>

      {/* API Keys Section */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "hsl(var(--bg-surface))",
          border: "1px solid hsl(var(--border-subtle))",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: "1px solid hsl(var(--border-subtle))" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${accentColor}15`, color: accentColor }}
            >
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[hsl(var(--text-primary))]">
                Clés API
              </h3>
              <p className="text-[12px] text-[hsl(var(--text-muted))]">
                {apiKeys.length} clé{apiKeys.length !== 1 ? "s" : ""} active{apiKeys.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
            style={{ background: accentColor }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle clé
          </button>
        </div>

        {/* Keys List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: accentColor }} />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Key className="h-12 w-12 text-[hsl(var(--text-muted))] mb-4" />
            <p className="text-[14px] text-[hsl(var(--text-muted))]">
              Aucune clé API
            </p>
            <p className="text-[12px] text-[hsl(var(--text-muted))] mt-1">
              Créez votre première clé pour accéder à l&apos;API
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border-subtle))]">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="p-4 hover:bg-[hsl(var(--bg-muted))] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[14px] font-semibold text-[hsl(var(--text-primary))]">
                        {apiKey.name}
                      </h4>
                      <div className="flex gap-1">
                        {apiKey.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-muted))]"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Key Display */}
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 px-3 py-2 rounded-lg text-[13px] font-mono bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))]">
                        {apiKey.keyPrefix}•••••••••••••••••••
                      </code>
                      <button
                        onClick={() => handleCopy(apiKey.keyPrefix, apiKey.id)}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          copiedId === apiKey.id
                            ? "text-[hsl(var(--success))]"
                            : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))]"
                        )}
                        title="Copier le préfixe"
                      >
                        {copiedId === apiKey.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 mt-2 text-[12px] text-[hsl(var(--text-muted))]">
                      <span>Créée le {new Date(apiKey.createdAt).toLocaleDateString("fr-CA")}</span>
                      {apiKey.lastUsedAt && (
                        <>
                          <span>•</span>
                          <span>Dernière utilisation: {new Date(apiKey.lastUsedAt).toLocaleDateString("fr-CA")}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDelete(apiKey.id)}
                    disabled={deletingId === apiKey.id}
                    className="p-2 rounded-lg text-[hsl(var(--text-muted))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger))]/10 transition-colors disabled:opacity-50"
                  >
                    {deletingId === apiKey.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note about API implementation */}
      <div
        className="flex items-center justify-between p-4 rounded-xl"
        style={{
          background: "hsl(var(--bg-muted))",
          border: "1px solid hsl(var(--border-subtle))",
        }}
      >
        <div>
          <p className="text-[14px] font-medium text-[hsl(var(--text-primary))]">
            API Nartex
          </p>
          <p className="text-[12px] text-[hsl(var(--text-muted))] mt-0.5">
            Créez un endpoint <code className="px-1 py-0.5 rounded bg-[hsl(var(--bg-elevated))]">/api/keys</code> pour gérer vos clés API
          </p>
        </div>
      </div>

      {/* Create Key Modal */}
      <CreateKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleKeyCreated}
      />
    </div>
  );
}
