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
  Check,
} from "lucide-react";

/* =============================================================================
   Font & Security Groups
============================================================================= */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SECURITY_GROUPS = [
  'SG-PRESIDENT',
  'SG-CFO', 
  'SG-DIRECTION',
  'SG-ADMIN-FINANCE-ALL',
  'SG-ADMIN-FINANCE-EXÉCUTIF',
  'SG-RH-ALL',
  'SG-RH-EXÉCUTIF',
  'SG-VENTES-ALL',
  'SG-VENTES-EXÉCUTIF',
  'SG-R&D-ALL',
  'SG-R&D-EXÉCUTIF',
  'SG-PROD-ALL',
  'SG-PROD-EXÉCUTIF',
  'SG-TI-ALL',
  'SG-TI-EXÉCUTIF',
  'SG-MARKETING-ALL',
  'SG-MARKETING-EXÉCUTIF',
  'SG-ALL'
];

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
  parentId?: string | null;
  name: string;
  type?: "site" | "library" | "folder";
  icon?: string;
  restricted?: boolean;
  highSecurity?: boolean;
  editGroups?: string[] | null;
  readGroups?: string[] | null;
  children?: NodeItem[];
  depth?: number; // Track depth in tree
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

  const toNode = (n: APINode, depth: number = 0): NodeItem => ({
    id: n.id,
    parentId: n.parentId ?? null,
    name: n.name,
    type: (n.type as any) ?? "folder",
    icon: n.icon ?? undefined,
    restricted: !!n.restricted,
    highSecurity: !!n.highSecurity,
    editGroups: toView(n.editGroups),
    readGroups: toView(n.readGroups),
    depth,
    children: (byParent.get(n.id) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => toNode(c, depth + 1)),
  });

  // virtual root
  const rootChildren = (byParent.get(null) ?? []).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  return {
    id: "root",
    parentId: null,
    name: "ROOT",
    type: "site",
    depth: 0,
    children: rootChildren.map(c => toNode(c, 1)),
  };
}

function findNodeById(root: NodeItem | null, id: string): NodeItem | null {
  if (!root) return null;
  if (root.id === id) return root;
  for (const c of root.children ?? []) {
    const f = findNodeById(c, id);
    if (f) return f;
  }
  return null;
}

// Find parent node to get inherited permissions
function findParentWithPermissions(tree: NodeItem | null, node: NodeItem): NodeItem | null {
  if (!tree || !node.parentId) return null;
  
  const parent = findNodeById(tree, node.parentId);
  if (!parent) return null;
  
  // If parent has permissions, return it
  if (parent.editGroups || parent.readGroups) return parent;
  
  // Otherwise, continue up the tree
  if (parent.parentId) {
    return findParentWithPermissions(tree, parent);
  }
  
  return null;
}

/* =============================================================================
   Page (auth gate)
============================================================================= */
export default function SharePointPage() {
  const { status } = useSession();
  if (status === "loading") return <LoadingState />;

  // Allow everyone to view
  if (status === "unauthenticated") return <AccessDenied />;

  return (
    <main className={`h-screen bg-black overflow-hidden ${inter.className}`}>
      <SharePointStructure />
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
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [creatingInId, setCreatingInId] = React.useState<string | null>(null);
  const [newFolderName, setNewFolderName] = React.useState("");

  const tree = React.useMemo(() => (data ? buildTree(data) : null), [data]);

  // Keep 'selected' bound to the latest node instance after SWR updates
  React.useEffect(() => {
    if (!tree || !selected) return;
    const fresh = findNodeById(tree, selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [tree, selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  // ------- Mutations (Create / Rename / Delete / Edit permissions) ----------
  const startCreating = (parentId: string | null) => {
    const id = parentId === null ? "root" : parentId;
    setCreatingInId(id);
    setNewFolderName("");
    // Expand parent to show new folder input
    const next = new Set(expanded);
    next.add(id);
    setExpanded(next);
  };

  const confirmCreate = async () => {
    if (!newFolderName.trim()) {
      setCreatingInId(null);
      return;
    }
    
    const parentId = creatingInId === "root" ? null : creatingInId;
    const body = { name: newFolderName.trim(), parentId, type: "folder" };
    
    const optimistic: APINode = {
      id: `tmp-${Date.now()}`,
      tenantId: "tmp",
      parentId,
      name: newFolderName.trim(),
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
    
    setCreatingInId(null);
    setNewFolderName("");
    
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

  const startRenaming = (node: NodeItem) => {
    setEditingId(node.id);
    setEditingName(node.name);
  };

  const confirmRename = async () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      return;
    }

    const node = findNodeById(tree, editingId);
    if (!node || editingName.trim() === node.name) {
      setEditingId(null);
      return;
    }

    const oldName = node.name;
    mutate(
      "/api/sharepoint",
      (prev: APINode[] | undefined) =>
        prev?.map((n) => (n.id === editingId ? { ...n, name: editingName.trim() } : n)),
      false
    );
    
    setEditingId(null);

    try {
      const res = await fetch(`/api/sharepoint/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour du nom");
    } catch (e) {
      mutate(
        "/api/sharepoint",
        (prev: APINode[] | undefined) =>
          prev?.map((n) => (n.id === editingId ? { ...n, name: oldName } : n)),
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

  const renderNode = (node: NodeItem, visualDepth = 0): React.ReactNode => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = !!node.children?.length;
    const isSelected = selected?.id === node.id;
    const isEditing = editingId === node.id;
    const isCreating = creatingInId === node.id;
    
    // Only level 3 folders (depth === 3) can have permissions edited
    // These are the third level folders in the hierarchy
    const canEditPermissions = node.depth === 3 && node.id !== "root";

    return (
      <div key={node.id} className="select-none">
        <div
          className={[
            "group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all",
            "hover:bg-white/[0.03] border border-transparent",
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
          style={{ paddingLeft: visualDepth * 20 + 12 }}
          onClick={(e) => {
            const t = e.target as HTMLElement;
            if (t.closest("[data-node-action]")) return;
            if (t.closest("input")) return;
            if (hasChildren) toggle(node.id);
            setSelected(node);
          }}
        >
          {hasChildren && (
            <span
              className="text-muted-foreground/70 transition-transform"
              style={{ transform: isExpanded ? "rotate(90deg)" : "none" }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}

          {node.type === "site" && (
            <Building2 className="h-4 w-4 text-purple-400" />
          )}
          {node.type === "library" && (
            <span className="text-base">{node.icon || "📁"}</span>
          )}
          {(!node.type || node.type === "folder") &&
            (isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 text-blue-400" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-muted-foreground/70" />
            ))}

          {isEditing ? (
            <input
              className="flex-1 rounded bg-gray-900 border border-blue-500 px-2 py-0.5 text-sm text-white outline-none"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRename();
                if (e.key === "Escape") setEditingId(null);
              }}
              onBlur={confirmRename}
              autoFocus
            />
          ) : (
            <span
              className={[
                "font-medium text-sm",
                node.type === "library" ? "text-white" : "text-gray-200",
                "flex items-center gap-1",
              ].join(" ")}
              onDoubleClick={() => node.id !== "root" && startRenaming(node)}
            >
              {node.name}
              {node.restricted && <Lock className="h-3 w-3 text-amber-400" />}
              {node.highSecurity && <Shield className="h-3 w-3 text-red-400" />}
            </span>
          )}

          <div className="ml-auto hidden gap-2 md:flex">
            {permissionBadges(node)}
          </div>

          <div className="ml-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              data-node-action
              className="rounded-md p-1 text-xs text-gray-300 hover:bg-white/10"
              title="Ajouter un sous-dossier"
              onClick={() => startCreating(node.id === "root" ? null : node.id)}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            {node.id !== "root" && (
              <>
                <button
                  data-node-action
                  className="rounded-md p-1 text-xs text-gray-300 hover:bg-white/10"
                  title="Renommer (F2)"
                  onClick={() => startRenaming(node)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  data-node-action
                  className="rounded-md p-1 text-xs text-red-400 hover:bg-red-500/10"
                  title="Supprimer"
                  onClick={() => deleteNode(node)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {/* Permissions can only be edited on level 3 folders */}
                {canEditPermissions && (
                  <PermissionsButton
                    node={node}
                    onSave={(p) => updatePermissions(node, p)}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {isCreating && (
          <div className="ml-2 mt-1" style={{ paddingLeft: (visualDepth + 1) * 20 + 12 }}>
            <div className="flex items-center gap-2">
              <Folder className="h-3.5 w-3.5 text-muted-foreground/70" />
              <input
                className="flex-1 rounded bg-gray-900 border border-blue-500 px-2 py-0.5 text-sm text-white outline-none"
                placeholder="Nouveau dossier"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmCreate();
                  if (e.key === "Escape") setCreatingInId(null);
                }}
                onBlur={confirmCreate}
                autoFocus
              />
            </div>
          </div>
        )}

        {isExpanded && hasChildren && (
          <div className="ml-2">
            {node.children!.map((c) => renderNode(c, visualDepth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Global keyboard handler for F2
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" && selected && selected.id !== "root" && !editingId) {
        e.preventDefault();
        startRenaming(selected);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, editingId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="p-6 text-sm text-red-400 border border-red-900/40 rounded-xl bg-red-950/20">
        Erreur de chargement des dossiers. Réessayez.
      </div>
    );
  }
  if (isLoading || !tree) return <LoadingState />;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Structure SharePoint<span className="text-blue-500">.</span>
          </h1>
          <button
            className="rounded-lg px-3 py-1.5 text-sm font-medium border border-white/10 bg-white/[0.02] text-gray-300 hover:bg-white/[0.05] transition-colors"
            onClick={() => startCreating("root")}
          >
            Ajouter un dossier racine
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Explorer */}
        <div className="flex-1 overflow-y-auto p-6">
          <Card className="h-full">
            <div className="mb-4">
              <CardTitle icon={<Folder className="h-5 w-5 text-blue-400" />}>
                Arborescence des dossiers
              </CardTitle>
              <p className="mt-1 text-xs text-gray-400">
                Double-cliquez ou appuyez sur F2 pour renommer. Permissions éditables au niveau 3.
              </p>
            </div>
            <div className="overflow-y-auto pr-2" style={{ maxHeight: "calc(100vh - 250px)" }}>
              {tree.children?.map((c) => renderNode(c, 0))}
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="w-96 border-l border-gray-800 p-6 overflow-y-auto">
          <div className="space-y-4">
            {selected && selected.id !== "root" && (
              <Card className="space-y-3">
                <CardTitle
                  icon={<Settings2 className="h-5 w-5 text-purple-400" />}
                >
                  Détails du dossier
                </CardTitle>
                <div className="text-sm text-gray-300 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Nom :</span>
                    <span className="font-medium text-white">
                      {selected.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Type :</span>
                    <span className="font-mono text-xs">{selected.type ?? "folder"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Niveau :</span>
                    <span className="font-mono text-xs">{selected.depth}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {permissionBadges(selected)}
                </div>

                {/* Permission viewer - shows only for level 3+ folders */}
                {selected.depth && selected.depth >= 3 && (
                  <PermissionsInlineViewer 
                    key={selected.id} 
                    node={selected}
                    tree={tree}
                  />
                )}
              </Card>
            )}

            {/* Legend */}
            <Card>
              <CardTitle icon={<Star className="h-5 w-5 text-yellow-400" />}>
                Légende
              </CardTitle>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-3 text-gray-300">
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Accès restreint</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Shield className="h-3.5 w-3.5 text-red-400" />
                  <span>Haute sécurité</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Edit className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Groupes ayant l'édition</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Eye className="h-3.5 w-3.5 text-sky-400" />
                  <span>Groupes en lecture</span>
                </div>
              </div>
            </Card>

            {/* Security groups (static helper) */}
            <Card>
              <CardTitle icon={<Users className="h-5 w-5 text-purple-400" />}>
                Groupes de sécurité
              </CardTitle>
              <div className="mt-4 space-y-2 text-xs text-gray-300">
                <div>
                  <span className="font-medium text-gray-200">Standard :</span>
                  <p className="text-gray-400">SG-[DEPT]-ALL</p>
                </div>
                <div>
                  <span className="font-medium text-gray-200">Exécutif :</span>
                  <p className="text-gray-400">SG-[DEPT]-EXECUTIF</p>
                </div>
                <div className="border-t border-white/10 pt-2">
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
    </div>
  );
}

/* =============================================================================
   Permissions viewer (READ-ONLY in right rail) - ONLY FOR LEVEL 3+ FOLDERS
============================================================================= */
function PermissionsInlineViewer({ 
  node, 
  tree 
}: { 
  node: NodeItem;
  tree: NodeItem;
}) {
  // Only show for level 3+ folders
  if (!node.depth || node.depth < 3) {
    return null;
  }

  // For level 4+ folders, find inherited permissions from level 3 parent
  const isInherited = node.depth > 3;
  const parentWithPerms = isInherited ? findParentWithPermissions(tree, node) : null;
  
  // Use parent permissions if inherited, otherwise use node's own
  const effectiveNode = isInherited && parentWithPerms ? parentWithPerms : node;
  
  const editGroups = effectiveNode.editGroups ?? [];
  const readGroups = effectiveNode.readGroups ?? [];
  const restricted = !!effectiveNode.restricted;
  const highSecurity = !!effectiveNode.highSecurity;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
      {isInherited && (
        <div className="text-xs text-amber-400 bg-amber-500/10 rounded-lg px-2 py-1 border border-amber-400/20">
          Permissions héritées{parentWithPerms ? ` de "${parentWithPerms.name}"` : ""}
        </div>
      )}
      
      <div className="grid gap-2">
        <label className="text-xs text-gray-400">
          Groupes (édition) — {editGroups.length} groupe{editGroups.length !== 1 ? 's' : ''}
        </label>
        <div className="rounded-lg bg-gray-950/80 border border-gray-800 px-3 py-2 min-h-[32px]">
          {editGroups.length > 0 ? (
            <div className="space-y-1">
              {editGroups.map((group, index) => (
                <div key={index} className="text-xs text-gray-300">
                  {group}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">(aucun)</div>
          )}
        </div>
      </div>
      
      <div className="grid gap-2">
        <label className="text-xs text-gray-400">
          Groupes (lecture) — {readGroups.length} groupe{readGroups.length !== 1 ? 's' : ''}
        </label>
        <div className="rounded-lg bg-gray-950/80 border border-gray-800 px-3 py-2 min-h-[32px]">
          {readGroups.length > 0 ? (
            <div className="space-y-1">
              {readGroups.map((group, index) => (
                <div key={index} className="text-xs text-gray-300">
                  {group}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">(aucun)</div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-gray-300">
          <input type="checkbox" checked={restricted} readOnly disabled />
          Accès restreint
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-300">
          <input type="checkbox" checked={highSecurity} readOnly disabled />
          Haute sécurité
        </label>
      </div>
      
      {node.depth === 3 ? (
        <p className="text-xs text-gray-500">
          Utilisez le bouton <Settings2 className="inline h-3 w-3" /> pour modifier les permissions.
        </p>
      ) : node.depth && node.depth > 3 ? (
        <p className="text-xs text-gray-500">
          Les permissions sont héritées du dossier parent de niveau 3.
        </p>
      ) : null}
    </div>
  );
}

/* =============================================================================
   Modal with DROPDOWN selections for security groups
============================================================================= */
function PermissionModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial: PermSpec;
  onClose: () => void;
  onSubmit: (p: PermSpec) => void;
}) {
  const [editGroups, setEditGroups] = React.useState<string[]>(
    initial?.editGroups && initial.editGroups.length > 0 
      ? initial.editGroups 
      : [""]
  );
  const [readGroups, setReadGroups] = React.useState<string[]>(
    initial?.readGroups && initial.readGroups.length > 0 
      ? initial.readGroups 
      : [""]
  );
  const [restricted, setRestricted] = React.useState(!!initial?.restricted);
  const [highSecurity, setHighSecurity] = React.useState(
    !!initial?.highSecurity
  );

  React.useEffect(() => {
    setEditGroups(
      initial?.editGroups && initial.editGroups.length > 0 
        ? initial.editGroups 
        : [""]
    );
    setReadGroups(
      initial?.readGroups && initial.readGroups.length > 0 
        ? initial.readGroups 
        : [""]
    );
    setRestricted(!!initial?.restricted);
    setHighSecurity(!!initial?.highSecurity);
  }, [
    initial?.editGroups,
    initial?.readGroups,
    initial?.restricted,
    initial?.highSecurity,
  ]);

  // Get available security groups (excluding already selected ones)
  const getAvailableEditGroups = (currentIndex: number) => {
    const usedGroups = editGroups.filter((group, index) => group !== "" && index !== currentIndex);
    return SECURITY_GROUPS.filter(group => !usedGroups.includes(group));
  };

  const getAvailableReadGroups = (currentIndex: number) => {
    const usedGroups = readGroups.filter((group, index) => group !== "" && index !== currentIndex);
    return SECURITY_GROUPS.filter(group => !usedGroups.includes(group));
  };

  // Check if we can add more groups (prevent adding if no available groups)
  const canAddEditGroup = editGroups.every(g => g.trim()) && getAvailableEditGroups(-1).length > 0;
  const canAddReadGroup = readGroups.every(g => g.trim()) && getAvailableReadGroups(-1).length > 0;

  const addEditGroup = () => {
    setEditGroups([...editGroups, ""]);
  };

  const addReadGroup = () => {
    setReadGroups([...readGroups, ""]);
  };

  const updateEditGroup = (index: number, value: string) => {
    const updated = [...editGroups];
    updated[index] = value;
    setEditGroups(updated);
  };

  const updateReadGroup = (index: number, value: string) => {
    const updated = [...readGroups];
    updated[index] = value;
    setReadGroups(updated);
  };

  const removeEditGroup = (index: number) => {
    if (editGroups.length > 1) {
      setEditGroups(editGroups.filter((_, i) => i !== index));
    }
  };

  const removeReadGroup = (index: number) => {
    if (readGroups.length > 1) {
      setReadGroups(readGroups.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-950 p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium tracking-wide text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            Éditer les permissions (Niveau 3)
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
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Groupes (édition)</label>
              <button
                className="text-xs px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={addEditGroup}
                disabled={!canAddEditGroup}
                title={canAddEditGroup ? "Ajouter un groupe" : "Tous les groupes sont déjà sélectionnés"}
              >
                <Plus className="h-3 w-3 inline" /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {editGroups.map((group, index) => {
                const availableGroups = getAvailableEditGroups(index);
                return (
                  <div key={index} className="flex gap-2">
                    <select
                      className="flex-1 rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-sm outline-none focus:border-blue-500 text-white"
                      value={group}
                      onChange={(e) => updateEditGroup(index, e.target.value)}
                    >
                      <option value="" disabled>Veuillez sélectionner une option</option>
                      {availableGroups.map(sg => (
                        <option key={sg} value={sg}>{sg}</option>
                      ))}
                    </select>
                    {editGroups.length > 1 && (
                      <button
                        className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                        onClick={() => removeEditGroup(index)}
                        title="Supprimer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Groupes (lecture)</label>
              <button
                className="text-xs px-2 py-0.5 rounded bg-sky-600/20 text-sky-400 hover:bg-sky-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={addReadGroup}
                disabled={!canAddReadGroup}
                title={canAddReadGroup ? "Ajouter un groupe" : "Tous les groupes sont déjà sélectionnés"}
              >
                <Plus className="h-3 w-3 inline" /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {readGroups.map((group, index) => {
                const availableGroups = getAvailableReadGroups(index);
                return (
                  <div key={index} className="flex gap-2">
                    <select
                      className="flex-1 rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-sm outline-none focus:border-blue-500 text-white"
                      value={group}
                      onChange={(e) => updateReadGroup(index, e.target.value)}
                    >
                      <option value="" disabled>Veuillez sélectionner une option</option>
                      {availableGroups.map(sg => (
                        <option key={sg} value={sg}>{sg}</option>
                      ))}
                    </select>
                    {readGroups.length > 1 && (
                      <button
                        className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                        onClick={() => removeReadGroup(index)}
                        title="Supprimer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
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
          <div className="text-xs text-gray-500 bg-gray-900 rounded-lg p-2 border border-gray-800">
            Ces permissions s'appliqueront à ce dossier et seront héritées par tous ses sous-dossiers.
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
                editGroups: editGroups.filter(g => g.trim() !== "").length > 0 
                  ? editGroups.filter(g => g.trim() !== "") 
                  : null,
                readGroups: readGroups.filter(g => g.trim() !== "").length > 0 
                  ? readGroups.filter(g => g.trim() !== "") 
                  : null,
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

/* =============================================================================
   Button that opens the modal (only on level 3 folders)
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
        className="rounded-md p-1 text-xs text-blue-400 hover:bg-blue-500/10"
        title="Éditer permissions (Niveau 3)"
        onClick={() => setOpen(true)}
      >
        <Settings2 className="h-3.5 w-3.5" />
      </button>
      {open && (
        <PermissionModal
          key={node.id}
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

/* =============================================================================
   Utils & Shared states
============================================================================= */
function splitOrNull(s: string): string[] | null {
  const arr = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return arr.length ? arr : null;
}

function LoadingState() {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-lg font-normal tracking-wide text-white">
          Chargement…
        </p>
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
          Vous ne disposez pas des autorisations nécessaires pour consulter ces
          données. Veuillez contacter votre département TI pour de
          l&apos;aide.
        </p>
      </div>
    </div>
  );
}
