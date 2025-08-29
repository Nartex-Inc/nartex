"use client";

import * as React from "react";
import useSWR, { mutate } from "swr";
import { useSession } from "next-auth/react";
import { Inter } from "next/font/google";
import { Card, CardTitle } from "@/components/ui/card";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Lock,
  Users,
  Shield,
  Eye,
  Edit,
  Star,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Settings2,
  Save,
  X,
} from "lucide-react";

/* =============================================================================
   Font
============================================================================= */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/* =============================================================================
   Types
============================================================================= */
// Server node (what the API returns)
type APINode = {
  id: string;
  tenantId: string;
  parentId: string | null;
  name: string;
  type: string | null; // 'site' | 'library' | 'folder' | null
  icon?: string | null;

  restricted?: boolean | null;
  highSecurity?: boolean | null;
  editGroups?: string[] | null; // [] => inherit (mapped to null in view)
  readGroups?: string[] | null; // [] => inherit (mapped to null in view)

  createdAt: string;
  updatedAt: string;
};

// View node (tree)
type NodeItem = {
  id: string;
  name: string;
  type?: "site" | "library" | "folder";
  icon?: string;
  restricted?: boolean;
  highSecurity?: boolean;
  editGroups?: string[] | null;
  readGroups?: string[] | null;
  children?: NodeItem[];
};

type PermSpec =
  | {
      editGroups?: string[] | null;
      readGroups?: string[] | null;
      restricted?: boolean;
      highSecurity?: boolean;
    }
  | null;

/* =============================================================================
   Data helpers
============================================================================= */
const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

// Map DB shape (empty array means inherit) to view shape (null means inherit)
const toView = (arr?: string[] | null) =>
  Array.isArray(arr) && arr.length === 0 ? null : arr;

/** Build a tree from the flat /api/sharepoint response. */
function buildTree(rows: APINode[]): NodeItem {
  const byParent = new Map<string | null, APINode[]>();
  rows.forEach((n) => {
    const k = n.parentId ?? null;
    const arr = byParent.get(k) ?? [];
    arr.push(n);
    byParent.set(k, arr);
  });

  const toNode = (n: APINode): NodeItem => ({
    id: n.id,
    name: n.name,
    type: (n.type as any) ?? "folder",
    icon: n.icon ?? undefined,
    restricted: !!n.restricted,
    highSecurity: !!n.highSecurity,
    editGroups: toView(n.editGroups),
    readGroups: toView(n.readGroups),
    children: (byParent.get(n.id) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toNode),
  });

  // virtual root
  const rootChildren = (byParent.get(null) ?? []).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  return {
    id: "root",
    name: "ROOT",
    type: "site",
    children: rootChildren.map(toNode),
  };
}

/* =============================================================================
   Page (auth gate)
============================================================================= */
export default function SharePointPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return <LoadingState />;

  // FROM: Original role-based check
  // const VIEW_ROLES = new Set(["ventes-exec", "ceo", "admin", "ti-exec", "direction-exec"]);
  // const role = (session?.user as any)?.role ?? "";
  // const canView = VIEW_ROLES.has(role);
  // if (status === "unauthenticated" || !canView) return <AccessDenied />;

  // TO: Allow everyone to view
  const canView = true;
  if (status === "unauthenticated") return <AccessDenied />;
  
  // ⛔️ REMOVE THIS LINE! It's likely a bug causing immediate access denial.
  // return <AccessDenied />;

  return (
    <main className={`min-h-screen bg-black ${inter.className}`}>
      <div className="pt-0 px-0 pb-8">
        <SharePointStructure />
      </div>
    </main>
  );
}

/* =============================================================================
   Structure Viewer (live CRUD)
============================================================================= */
function SharePointStructure() {
  const { data, error, isLoading } = useSWR<APINode[]>(
    "/api/sharepoint",
    fetcher,
    { revalidateOnFocus: false }
  );

  const [expanded, setExpanded] = React.useState<Set<string>>(
    new Set(["root"])
  );
  const [selected, setSelected] = React.useState<NodeItem | null>(null);

  const tree = React.useMemo(() => (data ? buildTree(data) : null), [data]);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  // ------- Mutations (Create / Rename / Delete / Edit permissions) ----------
  const createChild = async (parentId: string | null) => {
    const name = window.prompt("Nom du dossier à créer :", "");
    if (!name) return;
    const body = { name, parentId, type: "folder" };
    const optimistic: APINode = {
      id: `tmp-${Date.now()}`,
      tenantId: "tmp",
      parentId,
      name,
      type: "folder",
      icon: null,
      restricted: false,
      highSecurity: false,
      editGroups: null,
      readGroups: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mutate(
      "/api/sharepoint",
      (prev: APINode[] | undefined) => (prev ? [...prev, optimistic] : prev),
      false
    );
    try {
      const res = await fetch("/api/sharepoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erreur de création");
    } catch (e) {
      mutate(
        "/api/sharepoint",
        (prev: APINode[] | undefined) =>
          prev?.filter((n) => n.id !== optimistic.id),
        false
      );
      alert((e as Error).message);
    } finally {
      mutate("/api/sharepoint");
    }
  };

  const renameNode = async (node: NodeItem) => {
    const name = window.prompt("Nouveau nom :", node.name);
    if (!name || name.trim() === node.name) return;
    const oldName = node.name;

    mutate(
      "/api/sharepoint",
      (prev: APINode[] | undefined) =>
        prev?.map((n) => (n.id === node.id ? { ...n, name } : n)),
      false
    );
    try {
      const res = await fetch(`/api/sharepoint/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour du nom");
    } catch (e) {
      mutate(
        "/api/sharepoint",
        (prev: APINode[] | undefined) =>
          prev?.map((n) => (n.id === node.id ? { ...n, name: oldName } : n)),
        false
      );
      alert((e as Error).message);
    } finally {
      mutate("/api/sharepoint");
    }
  };

  const deleteNode = async (node: NodeItem) => {
    if (!confirm(`Supprimer « ${node.name} » et tous ses sous-dossiers ?`))
      return;

    try {
      const res = await fetch(`/api/sharepoint/${node.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Suppression échouée");
      if (selected?.id === node.id) setSelected(null);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      mutate("/api/sharepoint");
    }
  };

  const updatePermissions = async (node: NodeItem, perms: PermSpec) => {
    if (!perms) return;
    const payload: any = {
      restricted: perms.restricted,
      highSecurity: perms.highSecurity,
      editGroups: perms.editGroups,
      readGroups: perms.readGroups,
    };

    mutate(
      "/api/sharepoint",
      (prev: APINode[] | undefined) =>
        prev?.map((n) =>
          n.id === node.id
            ? {
                ...n,
                restricted: !!payload.restricted,
                highSecurity: !!payload.highSecurity,
                editGroups: payload.editGroups ?? null,
                readGroups: payload.readGroups ?? null,
              }
            : n
        ),
      false
    );

    try {
      const res = await fetch(`/api/sharepoint/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Mise à jour des permissions échouée");
    } catch (e) {
      alert((e as Error).message);
      mutate("/api/sharepoint");
    } finally {
      mutate("/api/sharepoint");
    }
  };

  const permissionBadges = (node: NodeItem) => {
    const editLen = node.editGroups?.length ?? 0;
    const readLen = node.readGroups?.length ?? 0;
    const out: React.ReactNode[] = [];
    if (editLen) {
      out.push(
        <span
          key="edit"
          className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300"
        >
          <Edit className="h-3 w-3" />
          {editLen} groupe{editLen > 1 ? "s" : ""}
        </span>
      );
    }
    if (readLen) {
      out.push(
        <span
          key="read"
          className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-300"
        >
          <Eye className="h-3 w-3" />
          {readLen} groupe{readLen > 1 ? "s" : ""}
        </span>
      );
    }
    return out;
  };

  const renderNode = (node: NodeItem, depth = 0): React.ReactNode => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = !!node.children?.length;
    const isSelected = selected?.id === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          className={[
            "group flex items-center gap-2 rounded-xl px-3 py-2 transition-all",
            "hover:bg-white/[0.04] border border-transparent",
            isSelected
              ? "bg-gradient-to-r from-blue-500/10 via-blue-400/5 to-transparent border-white/10"
              : "",
            node.restricted
              ? "pl-[calc(theme(spacing.3)+2px)] border-l-2 border-amber-400/40"
              : "",
            node.highSecurity
              ? "pl-[calc(theme(spacing.3)+2px)] border-l-2 border-red-500/40"
              : "",
          ].join(" ")}
          style={{ paddingLeft: depth * 20 + 12 }}
          onClick={(e) => {
            const t = e.target as HTMLElement;
            if (t.closest("[data-node-action]")) return;
            if (hasChildren) toggle(node.id);
            setSelected(node);
          }}
        >
          {hasChildren && (
            <span
              className="text-muted-foreground/70 transition-transform"
              style={{ transform: isExpanded ? "rotate(90deg)" : "none" }}
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          )}

          {node.type === "site" && (
            <Building2 className="h-5 w-5 text-purple-400" />
          )}
          {node.type === "library" && (
            <span className="text-lg">{node.icon || "📁"}</span>
          )}
          {(!node.type || node.type === "folder") &&
            (isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-400" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground/70" />
            ))}

          <span
            className={[
              "font-medium",
              node.type === "library" ? "text-white" : "text-gray-200",
              "flex items-center gap-1",
            ].join(" ")}
          >
            {node.name}
            {node.restricted && <Lock className="h-3 w-3 text-amber-400" />}
            {node.highSecurity && <Shield className="h-3 w-3 text-red-400" />}
          </span>

          <div className="ml-auto hidden gap-2 md:flex">
            {permissionBadges(node)}
          </div>

          <div className="ml-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              data-node-action
              className="rounded-md p-1 text-xs text-gray-300 hover:bg-white/10"
              title="Ajouter un sous-dossier"
              onClick={() => createChild(node.id === "root" ? null : node.id)}
            >
              <Plus className="h-4 w-4" />
            </button>
            {node.id !== "root" && (
              <>
                <button
                  data-node-action
                  className="rounded-md p-1 text-xs text-gray-300 hover:bg-white/10"
                  title="Renommer"
                  onClick={() => renameNode(node)}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  data-node-action
                  className="rounded-md p-1 text-xs text-red-400 hover:bg-red-500/10"
                  title="Supprimer"
                  onClick={() => deleteNode(node)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <PermissionsButton
                  node={node}
                  onSave={(p) => updatePermissions(node, p)}
                />
              </>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="ml-2 space-y-1">
            {node.children!.map((c) => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className="p-6 text-sm text-red-400 border border-red-900/40 rounded-xl bg-red-950/20">
        Erreur de chargement des dossiers. Réessayez.
      </div>
    );
  }
  if (isLoading || !tree) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Structure SharePoint<span className="text-blue-500">.</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg px-3 py-2 text-sm font-medium border border-white/10 bg-white/[0.02] text-gray-300 hover:bg-white/[0.05]"
            onClick={() => createChild(null)}
          >
            Ajouter un dossier racine
          </button>
          <button
            className="rounded-lg px-3 py-2 text-sm font-medium border border-white/10 bg-white/[0.02] text-gray-300 hover:bg-white/[0.05]"
            onClick={() => mutate("/api/sharepoint")}
            title="Rafraîchir"
          >
            Recharger
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Explorer */}
        <div className="col-span-12 lg:col-span-8">
          <Card>
            <div className="mb-4">
              <CardTitle icon={<Folder className="h-5 w-5 text-blue-400" />}>
                Arborescence des dossiers
              </CardTitle>
              <p className="mt-1 text-sm text-gray-400">
                Éditez en direct : créer, renommer, supprimer, permissions.
              </p>
            </div>
            <div className="max-h-[620px] overflow-y-auto pr-2">
              {tree.children?.map((c) => renderNode(c, 0))}
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {selected && (
            <Card className="space-y-3">
              <CardTitle
                icon={<Settings2 className="h-5 w-5 text-purple-400" />}
              >
                Détails du dossier
              </CardTitle>
              <div className="text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Nom :</span>
                  <span className="font-medium text-white">
                    {selected.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Type :</span>
                  <span className="font-mono">{selected.type ?? "folder"}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {permissionBadges(selected)}
              </div>
              <PermissionsInlineEditor
                node={selected}
                onSave={(p) => updatePermissions(selected, p)}
              />
            </Card>
          )}

          {/* Legend */}
          <Card>
            <CardTitle icon={<Star className="h-5 w-5 text-yellow-400" />}>
              Légende
            </CardTitle>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-300">
                <Lock className="h-4 w-4 text-amber-400" />
                <span>Accès restreint</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Shield className="h-4 w-4 text-red-400" />
                <span>Haute sécurité</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Edit className="h-4 w-4 text-emerald-400" />
                <span>Groupes ayant l’édition</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Eye className="h-4 w-4 text-sky-400" />
                <span>Groupes en lecture</span>
              </div>
            </div>
          </Card>

          {/* Security groups (static helper) */}
          <Card>
            <CardTitle icon={<Users className="h-5 w-5 text-purple-400" />}>
              Groupes de sécurité
            </CardTitle>
            <div className="mt-4 space-y-3 text-sm text-gray-300">
              <div>
                <span className="font-medium text-gray-200">Standard :</span>
                <p className="text-gray-400">SG-[DEPT]-ALL</p>
              </div>
              <div>
                <span className="font-medium text-gray-200">Exécutif :</span>
                <p className="text-gray-400">SG-[DEPT]-EXECUTIF</p>
              </div>
              <div className="border-t border-white/10 pt-3">
                <span className="font-medium text-gray-200">Spéciaux :</span>
                <p className="text-gray-400">SG-CFO, SG-PRESIDENT</p>
                <p className="text-gray-400">SG-DIRECTION-ALL</p>
                <p className="text-gray-400">SG-DIRECTION-EXECUTIF</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   Permissions editor bits
============================================================================= */
function PermissionsButton({
  node,
  onSave,
}: {
  node: NodeItem;
  onSave: (p: PermSpec) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        data-node-action
        className="rounded-md p-1 text-xs text-gray-300 hover:bg-white/10"
        title="Éditer permissions"
        onClick={() => setOpen(true)}
      >
        <Settings2 className="h-4 w-4" />
      </button>
      {open && (
        <PermissionModal
          initial={{
            restricted: !!node.restricted,
            highSecurity: !!node.highSecurity,
            editGroups: node.editGroups ?? null,
            readGroups: node.readGroups ?? null,
          }}
          onClose={() => setOpen(false)}
          onSubmit={(p) => {
            onSave(p);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function PermissionsInlineEditor({
  node,
  onSave,
}: {
  node: NodeItem;
  onSave: (p: PermSpec) => void;
}) {
  const [editGroups, setEditGroups] = React.useState(
    (node.editGroups ?? []).join(", ")
  );
  const [readGroups, setReadGroups] = React.useState(
    (node.readGroups ?? []).join(", ")
  );
  const [restricted, setRestricted] = React.useState(!!node.restricted);
  const [highSecurity, setHighSecurity] = React.useState(!!node.highSecurity);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
      <div className="grid gap-2">
        <label className="text-xs text-gray-400">
          Groupes (édition) — séparés par “,”
        </label>
        <input
          className="rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-sm outline-none focus:border-blue-500"
          value={editGroups}
          onChange={(e) => setEditGroups(e.target.value)}
          placeholder="SG-FOO-ALL, SG-FOO-EXECUTIF"
        />
      </div>
      <div className="grid gap-2">
        <label className="text-xs text-gray-400">
          Groupes (lecture) — séparés par “,”
        </label>
        <input
          className="rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-sm outline-none focus:border-blue-500"
          value={readGroups}
          onChange={(e) => setReadGroups(e.target.value)}
          placeholder="SG-FOO-ALL"
        />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={restricted}
            onChange={(e) => setRestricted(e.target.checked)}
          />
          Accès restreint
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={highSecurity}
            onChange={(e) => setHighSecurity(e.target.checked)}
          />
          Haute sécurité
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10"
          onClick={() =>
            onSave({
              restricted,
              highSecurity,
              editGroups: splitOrNull(editGroups),
              readGroups: splitOrNull(readGroups),
            })
          }
        >
          <Save className="h-4 w-4" />
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function PermissionModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial: PermSpec;
  onClose: () => void;
  onSubmit: (p: PermSpec) => void;
}) {
  const [editGroups, setEditGroups] = React.useState(
    (initial?.editGroups ?? []).join(", ")
  );
  const [readGroups, setReadGroups] = React.useState(
    (initial?.readGroups ?? []).join(", ")
  );
  const [restricted, setRestricted] = React.useState(!!initial?.restricted);
  const [highSecurity, setHighSecurity] = React.useState(
    !!initial?.highSecurity
  );

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-950 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium tracking-wide text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            Éditer les permissions
          </h3>
          <button
            className="rounded-md p-1 text-gray-400 hover:bg-white/10"
            onClick={onClose}
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid gap-2">
            <label className="text-xs text-gray-400">
              Groupes (édition) — séparés par “,”
            </label>
            <input
              className="rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={editGroups}
              onChange={(e) => setEditGroups(e.target.value)}
              placeholder="SG-FOO-ALL, SG-FOO-EXECUTIF"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-gray-400">
              Groupes (lecture) — séparés par “,”
            </label>
            <input
              className="rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={readGroups}
              onChange={(e) => setReadGroups(e.target.value)}
              placeholder="SG-FOO-ALL"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={restricted}
                onChange={(e) => setRestricted(e.target.checked)}
              />
              Accès restreint
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={highSecurity}
                onChange={(e) => setHighSecurity(e.target.checked)}
              />
              Haute sécurité
            </label>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10"
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() =>
              onSubmit({
                restricted,
                highSecurity,
                editGroups: splitOrNull(editGroups),
                readGroups: splitOrNull(readGroups),
              })
            }
          >
            <Save className="h-4 w-4" />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function splitOrNull(s: string): string[] | null {
  const arr = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return arr.length ? arr : null;
}

/* =============================================================================
   Shared states
============================================================================= */
function LoadingState() {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-lg font-normal tracking-wide text-white">Chargement…</p>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
      <div className="max-w-lg rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
        <h3 className="mb-2 text-xl font-bold text-white">Accès restreint</h3>
        <p className="text-sm text-gray-400">
          Vous ne disposez pas des autorisations nécessaires pour consulter ces données.
          Veuillez contacter votre département TI pour de l&apos;aide.
        </p>
      </div>
    </div>
  );
}
