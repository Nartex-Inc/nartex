// src/app/dashboard/sharepoint/page.tsx
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import useSWR, { mutate } from "swr";
import { useSession } from "next-auth/react";
import { Inter } from "next/font/google";
import LoadingAnimation from "@/components/LoadingAnimation";
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
   Font & Security Groups
============================================================================= */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SECURITY_GROUPS = [
  "SG-PDG",
  "SG-ADMIN-0",
  "SG-ADMIN-1",
  "SG-ADMIN-2",
  "SG-FINANCE-0",
  "SG-FINANCE-1",
  "SG-FINANCE-2",
  "SG-RH-0",
  "SG-RH-1",
  "SG-RH-2",
  "SG-VENTES-0",
  "SG-VENTES-1",
  "SG-VENTES-2",
  "SG-R&D-0",
  "SG-R&D-1",
  "SG-R&D-2",
  "SG-OPÉRATIONS-0",
  "SG-OPÉRATIONS-1",
  "SG-OPÉRATIONS-2",
  "SG-TI-0",
  "SG-TI-1",
  "SG-TI-2",
  "SG-MARKETING-0",
  "SG-MARKETING-1",
  "SG-MARKETING-2",
  "SG-TOUS",
  "SG-DIRECTION",
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
// PURE helper (no hooks!) to highlight query within text (diacritic-insensitive)
function highlightName(text: string, q: string): React.ReactNode {
  const query = q?.trim();
  if (!query) return text;

  const strip = (s: string) =>
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  // Build a map from "stripped" indices back to original indices
  const map: number[] = [];
  const strippedChars: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const base = text[i].normalize("NFD").replace(/\p{Diacritic}/gu, "");
    for (let j = 0; j < base.length; j++) {
      strippedChars.push(base[j]);
      map.push(i);
    }
  }
  const stripped = strippedChars.join("").toLowerCase();
  const needle = strip(query);
  if (!needle) return text;

  let pos = 0;
  const parts: React.ReactNode[] = [];
  const pushSlice = (from: number, to: number, mark = false) => {
    if (from >= to) return;
    const origStart = map[from];
    const origEnd = map[to - 1] + 1; // exclusive
    const slice = text.slice(origStart, origEnd);
    parts.push(
      mark ? (
        <mark
          key={`${origStart}-${origEnd}-hl`}
          className="bg-[hsl(var(--warning-muted))] rounded px-0.5"
        >
          {slice}
        </mark>
      ) : (
        <React.Fragment key={`${origStart}-${origEnd}`}>{slice}</React.Fragment>
      )
    );
  };

  while (true) {
    const hit = stripped.indexOf(needle, pos);
    if (hit === -1) {
      pushSlice(pos, stripped.length, false);
      break;
    }
    pushSlice(pos, hit, false);
    pushSlice(hit, hit + needle.length, true);
    pos = hit + needle.length;
  }
  return parts;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

// Map DB shape (empty array means inherit) to view shape (null means inherit)
const toView = (arr?: string[] | null) =>
  Array.isArray(arr) && arr.length === 0 ? null : arr;

// Treat "", undefined, null all as null (root)
const normalizeParentId = (v: string | null | undefined) =>
  v && v.trim().length ? v : null;

/** Build a tree from the flat /api/sharepoint response. */
function buildTree(rows: APINode[]): NodeItem {
  const byParent = new Map<string | null, APINode[]>();

  rows.forEach((n) => {
    const k = normalizeParentId(n.parentId);
    const arr = byParent.get(k) ?? [];
    arr.push(n);
    byParent.set(k, arr);
  });

  const toNode = (n: APINode, depth = 0): NodeItem => ({
    id: n.id,
    parentId: normalizeParentId(n.parentId),
    name: n.name,
    type:
      n.type === "site" || n.type === "library" || n.type === "folder"
        ? n.type
        : "folder",
    icon: n.icon ?? undefined,
    restricted: !!n.restricted,
    highSecurity: !!n.highSecurity,
    editGroups: toView(n.editGroups),
    readGroups: toView(n.readGroups),
    depth,
    children: (byParent.get(n.id) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => toNode(c, depth + 1)),
  });

  const rootChildren = (byParent.get(null) ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    id: "root",
    parentId: null,
    name: "ROOT",
    type: "site",
    depth: 0,
    children: rootChildren.map((c) => toNode(c, 1)),
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

// Find parent node to get inherited permissions (legacy behavior: includes flags)
function findParentWithPermissions(
  tree: NodeItem | null,
  node: NodeItem
): NodeItem | null {
  if (!tree || !node.parentId) return null;

  const parent = findNodeById(tree, node.parentId);
  if (!parent) return null;

  if (
    parent.editGroups ||
    parent.readGroups ||
    parent.restricted ||
    parent.highSecurity
  ) {
    return parent;
  }

  return parent.parentId ? findParentWithPermissions(tree, parent) : null;
}

/** Return effective groups for a node:
 * - depth <= 2: no effective groups (sites/libraries level don’t carry folder perms here)
 * - depth === 3: node’s own groups/flags
 * - depth >= 4: inherited from nearest ancestor with permissions (legacy behavior)
 */
function getEffectiveGroups(
  tree: NodeItem | null,
  node: NodeItem
): {
  edit: string[];
  read: string[];
  restricted: boolean;
  highSecurity: boolean;
} {
  if (!node.depth || node.depth <= 2) {
    return {
      edit: [],
      read: [],
      restricted: !!node.restricted,
      highSecurity: !!node.highSecurity,
    };
  }
  if (node.depth === 3) {
    return {
      edit: node.editGroups ?? [],
      read: node.readGroups ?? [],
      restricted: !!node.restricted,
      highSecurity: !!node.highSecurity,
    };
  }
  // depth >= 4 → inherit from nearest ancestor with explicit permissions or flags
  const p = findParentWithPermissions(tree, node);
  return {
    edit: p?.editGroups ?? [],
    read: p?.readGroups ?? [],
    restricted: !!p?.restricted,
    highSecurity: !!p?.highSecurity,
  };
}

/** Filter a full tree by a selected security group.
 * Keeps any node that itself matches OR has a descendant that matches.
 * Always keeps ancestors of matches for context. Always keeps virtual root.
 */
function filterTreeByGroup(
  tree: NodeItem,
  group: string
): { filtered: NodeItem; expandIds: Set<string>; totalMatches: number } {
  if (!group.trim())
    return { filtered: tree, expandIds: new Set(["root"]), totalMatches: 0 };

  let matches = 0;
  const expandIds = new Set<string>();

  const walk = (node: NodeItem): NodeItem | null => {
    const eff = getEffectiveGroups(tree, node);
    const selfMatch = eff.edit.includes(group) || eff.read.includes(group);

    const keptChildren: NodeItem[] = [];
    for (const c of node.children ?? []) {
      const kept = walk(c);
      if (kept) keptChildren.push(kept);
    }

    const keep = selfMatch || keptChildren.length > 0;
    if (!keep) return null;

    if (keptChildren.length > 0) expandIds.add(node.id);
    if (selfMatch) matches += 1;

    return { ...node, children: keptChildren };
  };

  const keptRoot = walk(tree) ?? { ...tree, children: [] };
  expandIds.add("root");
  return { filtered: keptRoot, expandIds, totalMatches: matches };
}

/* =============================================================================
   Page (auth gate)
============================================================================= */
export default function SharePointPage() {
  const { status } = useSession();
  if (status === "loading")
    return (
      <LoadingAnimation
        title="Chargement de SharePoint"
        subtitle="Initialisation..."
      />
    );

  // Allow everyone to view
  if (status === "unauthenticated") return <AccessDenied />;

  return (
    <main
      className={`h-screen overflow-hidden ${inter.className} bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]`}
    >
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
  const [selectedGroup, setSelectedGroup] = React.useState<string>("");

  // -------------------------- SEARCH BAR STATE & LOGIC -----------------------
  const [query, setQuery] = React.useState("");

  // Strip accents & lowercase for diacritic-insensitive matching
  const _strip = (s: string) =>
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  /**
   * Returns a pruned copy of the tree that keeps:
   * - nodes whose name matches `needle`, and
   * - all ancestors of those nodes (for context).
   * Also returns a set of ids to expand so the matches are visible.
   */
  function pruneTreeForQuery(
    root: NodeItem,
    needleRaw: string
  ): { pruned: NodeItem; expandIds: Set<string> } {
    const needle = _strip(needleRaw.trim());
    if (!needle) return { pruned: root, expandIds: new Set() };

    const expandIds = new Set<string>();

    const clone = (node: NodeItem): NodeItem | null => {
      const nameMatch = _strip(node.name).includes(needle);
      const keptChildren: NodeItem[] = [];

      for (const c of node.children ?? []) {
        const kept = clone(c);
        if (kept) keptChildren.push(kept);
      }

      if (nameMatch || keptChildren.length > 0) {
        if (keptChildren.length > 0) expandIds.add(node.id);
        return { ...node, children: keptChildren };
      }
      return null;
    };

    const prunedRoot = clone(root) ?? { ...root, children: [] };

    // Ensure the virtual root is expanded so top-level results are visible
    expandIds.add("root");
    return { pruned: prunedRoot, expandIds };
  }
  // --------------------------------------------------------------------------

  const tree = React.useMemo(() => (data ? buildTree(data) : null), [data]);

  // 1) Filter by selected security group
  const groupFiltered = React.useMemo(() => {
    if (!tree)
      return {
        filtered: null as unknown as NodeItem,
        expandIds: new Set<string>(),
        totalMatches: 0,
      };
    return filterTreeByGroup(tree, selectedGroup);
  }, [tree, selectedGroup]);

  // 2) Apply textual pruning (diacritic-insensitive) on the group-filtered tree
  const {
    pruned: filteredTree,
    expandIds: queryExpandIds,
  } = React.useMemo(() => {
    if (!groupFiltered.filtered) {
      return {
        pruned: null as unknown as NodeItem,
        expandIds: new Set<string>(),
      };
    }
    return pruneTreeForQuery(groupFiltered.filtered, query);
  }, [groupFiltered.filtered, query]);

  // Auto-expand for either filter
  React.useEffect(() => {
    if (!tree) return;
    const ids = new Set<string>([
      ...groupFiltered.expandIds,
      ...queryExpandIds,
    ]);
    if (query.trim() || selectedGroup.trim()) setExpanded(ids);
  }, [tree, groupFiltered.expandIds, queryExpandIds, query, selectedGroup]); // eslint-disable-line react-hooks/exhaustive-deps

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
        prev?.map((n) =>
          n.id === editingId ? { ...n, name: editingName.trim() } : n
        ),
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
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium
          border-[hsl(var(--success))]/30 bg-[hsl(var(--success-muted))] text-[hsl(var(--success))]"
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
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium
          border-[hsl(var(--info))]/30 bg-[hsl(var(--info-muted))] text-[hsl(var(--info))]"
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
    const canEditPermissions = node.depth === 3 && node.id !== "root";

    return (
      <div key={node.id} className="select-none">
        <div
          className={[
            "group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all",
            "hover:bg-[hsl(var(--bg-elevated))] border border-transparent",
            isSelected
              ? "bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))]"
              : "",
            node.restricted
              ? "pl-[calc(theme(spacing.3)+2px)] border-l-2 border-[hsl(var(--warning))]/40"
              : "",
            node.highSecurity
              ? "pl-[calc(theme(spacing.3)+2px)] border-l-2 border-[hsl(var(--danger))]/40"
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
              className="text-[hsl(var(--text-tertiary))] transition-transform"
              style={{ transform: isExpanded ? "rotate(90deg)" : "none" }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}

          {node.type === "site" && (
            <Building2 className="h-4 w-4 text-[hsl(var(--info))]" />
          )}
          {node.type === "library" && (
            <span className="text-base">{node.icon || "📁"}</span>
          )}
          {(!node.type || node.type === "folder") &&
            (isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 text-[hsl(var(--info))]" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-[hsl(var(--text-tertiary))]" />
            ))}

          {isEditing ? (
            <input
              className="flex-1 rounded border px-2 py-0.5 text-sm outline-none
              bg-[hsl(var(--bg-surface))] border-[hsl(var(--info))] text-[hsl(var(--text-primary))]"
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
                "font-medium text-sm flex items-center gap-1",
                node.type === "library"
                  ? "text-[hsl(var(--text-primary))]"
                  : "text-[hsl(var(--text-primary))]",
              ].join(" ")}
              onDoubleClick={() => node.id !== "root" && startRenaming(node)}
            >
              {highlightName(node.name, query)}
              {node.restricted && (
                <Lock className="h-3 w-3 text-[hsl(var(--warning))]" />
              )}
              {node.highSecurity && (
                <Shield className="h-3 w-3 text-[hsl(var(--danger))]" />
              )}
            </span>
          )}

          <div className="ml-auto hidden gap-2 md:flex">
            {permissionBadges(node)}
          </div>

          <div className="ml-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              data-node-action
              className="rounded-md p-1 text-xs text-[hsl(var(--text-tertiary))] hover:bg-[hsl(var(--bg-elevated))]"
              title="Ajouter un sous-dossier"
              onClick={() => startCreating(node.id === "root" ? null : node.id)}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            {node.id !== "root" && (
              <>
                <button
                  data-node-action
                  className="rounded-md p-1 text-xs text-[hsl(var(--text-tertiary))] hover:bg-[hsl(var(--bg-elevated))]"
                  title="Renommer (F2)"
                  onClick={() => startRenaming(node)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  data-node-action
                  className="rounded-md p-1 text-xs text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))]"
                  title="Supprimer"
                  onClick={() => deleteNode(node)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
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
          <div
            className="ml-2 mt-1"
            style={{ paddingLeft: (visualDepth + 1) * 20 + 12 }}
          >
            <div className="flex items-center gap-2">
              <Folder className="h-3.5 w-3.5 text-[hsl(var(--text-tertiary))]" />
              <input
                className="flex-1 rounded border px-2 py-0.5 text-sm outline-none
                bg-[hsl(var(--bg-surface))] border-[hsl(var(--info))] text-[hsl(var(--text-primary))]"
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
            {(node.children ?? []).map((c) =>
              renderNode(c, visualDepth + 1)
            )}
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
      <div className="p-6 text-sm rounded-xl border bg-[hsl(var(--danger-muted))] text-[hsl(var(--danger))] border-[hsl(var(--danger))]/30">
        Erreur de chargement des dossiers. Réessayez.
      </div>
    );
  }

  if (isLoading || !tree)
    return (
      <LoadingAnimation
        title="Chargement de la structure"
        subtitle="Récupération des dossiers SharePoint..."
      />
    );

  return (
    <div className="h-full flex flex-col">
      {/* Header (no gradient background; respects global theme button) */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))]/80 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Structure SharePoint
            <span className="text-[hsl(var(--info))]">.</span>
          </h1>

          <div className="flex items-center gap-3">
            {/* SECURITY-GROUP DROPDOWN */}
            <label className="relative block">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-56 md:w-64 rounded-lg border px-3 py-1.5 text-sm
                           border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-secondary))]
                           focus:outline-none focus:ring-2 focus:ring-[hsl(var(--info))]/40"
                aria-label="Filtre par groupe de sécurité"
                title="Filtrer par groupe de sécurité"
              >
                <option value="">— Tous les groupes —</option>
                {SECURITY_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>

            {/* SEARCH BAR */}
            <label className="relative block">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un dossier…"
                className="w-64 md:w-80 rounded-lg border px-3 py-1.5 text-sm
                           border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-secondary))] placeholder:text-[hsl(var(--text-muted))]
                           focus:outline-none focus:ring-2 focus:ring-[hsl(var(--info))]/40"
                aria-label="Recherche"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]
                             hover:text-[hsl(var(--text-secondary))]"
                  aria-label="Effacer la recherche"
                  title="Effacer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>

            <button
              className="rounded-lg px-3 py-1.5 text-sm font-medium
                         border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] transition-colors"
              onClick={() => startCreating("root")}
            >
              Ajouter un dossier racine
            </button>
          </div>
        </div>
      </div> {/* <-- FIX: close header container properly */}

      <div className="flex-1 overflow-hidden flex">
        {/* Explorer */}
        <div className="flex-1 overflow-y-auto p-6">
          <Card className="h-full">
            <div className="mb-4">
              <CardTitle
                icon={
                  <Folder className="h-5 w-5 text-[hsl(var(--info))]" />
                }
              >
                <span className="text-[hsl(var(--text-primary))]">
                  Arborescence des dossiers
                </span>
              </CardTitle>
              <p className="mt-1 text-xs text-[hsl(var(--text-muted))]">
                Double-cliquez ou appuyez sur F2 pour renommer. Permissions
                éditables au niveau 3.
              </p>
            </div>
            <div
              className="overflow-y-auto pr-2"
              style={{ maxHeight: "calc(100vh - 250px)" }}
            >
              {/* Root-level create row (for 'Ajouter un dossier racine') */}
              {creatingInId === "root" && (
                <div className="mt-1" style={{ paddingLeft: 12 }}>
                  <div className="flex items-center gap-2">
                    <Folder className="h-3.5 w-3.5 text-[hsl(var(--text-tertiary))]" />
                    <input
                      className="flex-1 rounded border px-2 py-0.5 text-sm outline-none
                      bg-[hsl(var(--bg-surface))] border-[hsl(var(--info))] text-[hsl(var(--text-primary))]"
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

              {(query.trim() || selectedGroup.trim()
                ? filteredTree?.children
                : tree!.children
              )?.map((c: NodeItem) => renderNode(c, 0))}
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="w-96 border-l border-[hsl(var(--border-default))] p-6 overflow-y-auto bg-[hsl(var(--bg-surface))]/60 backdrop-blur-sm">
          <div className="space-y-4">
            {selected && selected.id !== "root" && (
              <Card className="space-y-3">
                <CardTitle
                  icon={
                    <Settings2 className="h-5 w-5 text-[hsl(var(--info))]" />
                  }
                >
                  {selectedGroup && (
                    <div
                      className="text-xs rounded-md px-2 py-1 border
                                    bg-[hsl(var(--info-muted))] text-[hsl(var(--info))] border-[hsl(var(--info))]/30"
                    >
                      {groupFiltered.totalMatches} dossier
                      {groupFiltered.totalMatches !== 1 ? "s" : ""} accessibles
                      pour « {selectedGroup} »
                    </div>
                  )}
                  <span className="text-[hsl(var(--text-primary))]">
                    Détails du dossier
                  </span>
                </CardTitle>
                <div className="text-sm space-y-2 text-[hsl(var(--text-secondary))]">
                  <div className="flex items-center gap-2">
                    <span className="text-[hsl(var(--text-muted))]">
                      Nom :
                    </span>
                    <span className="font-medium text-[hsl(var(--text-primary))]">
                      {selected.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[hsl(var(--text-muted))]">
                      Type :
                    </span>
                    <span className="font-mono text-xs">
                      {selected.type ?? "folder"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[hsl(var(--text-muted))]">
                      Niveau :
                    </span>
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
              <CardTitle
                icon={
                  <Star className="h-5 w-5 text-[hsl(var(--warning))]" />
                }
              >
                <span className="text-[hsl(var(--text-primary))]">Légende</span>
              </CardTitle>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-3 text-[hsl(var(--text-secondary))]">
                  <Lock className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                  <span>Accès restreint</span>
                </div>
                <div className="flex items-center gap-3 text-[hsl(var(--text-secondary))]">
                  <Shield className="h-3.5 w-3.5 text-[hsl(var(--danger))]" />
                  <span>Haute sécurité</span>
                </div>
                <div className="flex items-center gap-3 text-[hsl(var(--text-secondary))]">
                  <Edit className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                  <span>Groupes ayant l&apos;édition</span>
                </div>
                <div className="flex items-center gap-3 text-[hsl(var(--text-secondary))]">
                  <Eye className="h-3.5 w-3.5 text-[hsl(var(--info))]" />
                  <span>Groupes en lecture</span>
                </div>
              </div>
            </Card>

            {/* Security groups (static helper) */}
            <Card>
              <CardTitle
                icon={
                  <Users className="h-5 w-5 text-[hsl(var(--info))]" />
                }
              >
                <span className="text-[hsl(var(--text-primary))]">
                  Groupes de sécurité
                </span>
              </CardTitle>
              <div className="mt-4 space-y-2 text-xs text-[hsl(var(--text-secondary))]">
                <div>
                  <span className="font-medium text-[hsl(var(--text-primary))]">
                    Standard :
                  </span>
                  <p className="text-[hsl(var(--text-tertiary))]">
                    SG-[DEPT]-ALL
                  </p>
                </div>
                <div>
                  <span className="font-medium text-[hsl(var(--text-primary))]">
                    Exécutif :
                  </span>
                  <p className="text-[hsl(var(--text-tertiary))]">
                    SG-[DEPT]-EXECUTIF
                  </p>
                </div>
                <div className="border-t border-[hsl(var(--border-default))] pt-2">
                  <span className="font-medium text-[hsl(var(--text-primary))]">
                    Spéciaux :
                  </span>
                  <p className="text-[hsl(var(--text-tertiary))]">
                    SG-CFO, SG-PRESIDENT
                  </p>
                  <p className="text-[hsl(var(--text-tertiary))]">
                    SG-DIRECTION-ALL
                  </p>
                  <p className="text-[hsl(var(--text-tertiary))]">
                    SG-DIRECTION-EXECUTIF
                  </p>
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
  tree,
}: {
  node: NodeItem;
  tree: NodeItem | null;
}) {
  // Only show for level 3+ folders
  if (!node.depth || node.depth < 3) {
    return null;
  }

  // For level 4+ folders, find inherited permissions from level 3 parent
  const isInherited = node.depth > 3;
  const parentWithPerms = isInherited
    ? findParentWithPermissions(tree, node)
    : null;

  // Use parent permissions if inherited, otherwise use node's own
  const effectiveNode = isInherited && parentWithPerms ? parentWithPerms : node;

  const editGroups = effectiveNode.editGroups ?? [];
  const readGroups = effectiveNode.readGroups ?? [];
  const restricted = !!effectiveNode.restricted;
  const highSecurity = !!effectiveNode.highSecurity;

  return (
    <div className="rounded-xl border p-3 space-y-3 border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))]">
      {isInherited && (
        <div
          className="text-xs rounded-lg px-2 py-1 border
          text-[hsl(var(--warning))] bg-[hsl(var(--warning-muted))] border-[hsl(var(--warning))]/30"
        >
          Permissions héritées
          {parentWithPerms ? ` de "${parentWithPerms.name}"` : ""}
        </div>
      )}

      <div className="grid gap-2">
        <label className="text-xs text-[hsl(var(--text-tertiary))]">
          Groupes (édition) — {editGroups.length} groupe
          {editGroups.length !== 1 ? "s" : ""}
        </label>
        <div
          className="rounded-lg border px-3 py-2 min-h-[32px]
          bg-[hsl(var(--bg-surface))] border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))]"
        >
          {editGroups.length > 0 ? (
            <div className="space-y-1">
              {editGroups.map((group, index) => (
                <div key={index} className="text-xs">
                  {group}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[hsl(var(--text-muted))]">
              (aucun)
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-[hsl(var(--text-tertiary))]">
          Groupes (lecture) — {readGroups.length} groupe
          {readGroups.length !== 1 ? "s" : ""}
        </label>
        <div
          className="rounded-lg border px-3 py-2 min-h-[32px]
          bg-[hsl(var(--bg-surface))] border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))]"
        >
          {readGroups.length > 0 ? (
            <div className="space-y-1">
              {readGroups.map((group, index) => (
                <div key={index} className="text-xs">
                  {group}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[hsl(var(--text-muted))]">
              (aucun)
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-[hsl(var(--text-secondary))]">
          <input type="checkbox" checked={restricted} readOnly disabled />
          Accès restreint
        </label>
        <label className="flex items-center gap-2 text-xs text-[hsl(var(--text-secondary))]">
          <input type="checkbox" checked={highSecurity} readOnly disabled />
          Haute sécurité
        </label>
      </div>

      {node.depth === 3 ? (
        <p className="text-xs text-[hsl(var(--text-muted))]">
          Utilisez le bouton <Settings2 className="inline h-3 w-3" /> pour
          modifier les permissions.
        </p>
      ) : node.depth && node.depth > 3 ? (
        <p className="text-xs text-[hsl(var(--text-muted))]">
          Les permissions sont héritées du dossier parent de niveau 3.
        </p>
      ) : null}
    </div>
  );
}

/* =============================================================================
   Portal helper (fixes modal stacking/visibility)
============================================================================= */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/* =============================================================================
   Modal with DROPDOWN selections for security groups (ported to Portal)
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
    const usedGroups = editGroups.filter(
      (group, index) => group !== "" && index !== currentIndex
    );
    return SECURITY_GROUPS.filter((group) => !usedGroups.includes(group));
  };

  const getAvailableReadGroups = (currentIndex: number) => {
    const usedGroups = readGroups.filter(
      (group, index) => group !== "" && index !== currentIndex
    );
    return SECURITY_GROUPS.filter((group) => !usedGroups.includes(group));
  };

  // Check if we can add more groups (prevent adding if no available groups)
  const canAddEditGroup =
    editGroups.every((g) => g.trim()) &&
    getAvailableEditGroups(-1).length > 0;
  const canAddReadGroup =
    readGroups.every((g) => g.trim()) &&
    getAvailableReadGroups(-1).length > 0;

  const addEditGroup = () => setEditGroups([...editGroups, ""]);
  const addReadGroup = () => setReadGroups([...readGroups, ""]);

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
    if (editGroups.length > 1)
      setEditGroups(editGroups.filter((_, i) => i !== index));
  };
  const removeReadGroup = (index: number) => {
    if (readGroups.length > 1)
      setReadGroups(readGroups.filter((_, i) => i !== index));
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg rounded-2xl border max-h-[90vh] overflow-y-auto
            bg-[hsl(var(--bg-surface))] border-[hsl(var(--border-default))] p-5 text-[hsl(var(--text-primary))]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium tracking-wide flex items-center gap-2">
              <Shield className="h-5 w-5 text-[hsl(var(--info))]" />
              Éditer les permissions (Niveau 3)
            </h3>
            <button
              className="rounded-md p-1 text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-elevated))]"
              onClick={onClose}
              title="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[hsl(var(--text-tertiary))]">
                  Groupes (édition)
                </label>
                <button
                  className="text-xs px-2 py-0.5 rounded
                  bg-[hsl(var(--success-muted))] text-[hsl(var(--success))] hover:bg-[hsl(var(--success-muted))]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors"
                  onClick={addEditGroup}
                  disabled={!canAddEditGroup}
                  title={
                    canAddEditGroup
                      ? "Ajouter un groupe"
                      : "Tous les groupes sont déjà sélectionnés"
                  }
                >
                  + Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {editGroups.map((group, index) => {
                  const availableGroups = getAvailableEditGroups(index);
                  return (
                    <div key={index} className="flex gap-2">
                      <select
                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none
                        bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:border-[hsl(var(--info))]"
                        value={group}
                        onChange={(e) => updateEditGroup(index, e.target.value)}
                      >
                        <option value="" disabled>
                          Veuillez sélectionner une option
                        </option>
                        {availableGroups.map((sg) => (
                          <option key={sg} value={sg}>
                            {sg}
                          </option>
                        ))}
                      </select>
                      {editGroups.length > 1 && (
                        <button
                          className="rounded-lg p-2 text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))]"
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
                <label className="text-xs text-[hsl(var(--text-tertiary))]">
                  Groupes (lecture)
                </label>
                <button
                  className="text-xs px-2 py-0.5 rounded
                  bg-[hsl(var(--info-muted))] text-[hsl(var(--info))] hover:bg-[hsl(var(--info-muted))]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors"
                  onClick={addReadGroup}
                  disabled={!canAddReadGroup}
                  title={
                    canAddReadGroup
                      ? "Ajouter un groupe"
                      : "Tous les groupes sont déjà sélectionnés"
                  }
                >
                  + Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {readGroups.map((group, index) => {
                  const availableGroups = getAvailableReadGroups(index);
                  return (
                    <div key={index} className="flex gap-2">
                      <select
                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none
                        bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] focus:border-[hsl(var(--info))]"
                        value={group}
                        onChange={(e) => updateReadGroup(index, e.target.value)}
                      >
                        <option value="" disabled>
                          Veuillez sélectionner une option
                        </option>
                        {availableGroups.map((sg) => (
                          <option key={sg} value={sg}>
                            {sg}
                          </option>
                        ))}
                      </select>
                      {readGroups.length > 1 && (
                        <button
                          className="rounded-lg p-2 text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))]"
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
              <label className="flex items-center gap-2 text-sm text-[hsl(var(--text-secondary))]">
                <input
                  type="checkbox"
                  checked={restricted}
                  onChange={(e) => setRestricted(e.target.checked)}
                />
                Accès restreint
              </label>
              <label className="flex items-center gap-2 text-sm text-[hsl(var(--text-secondary))]">
                <input
                  type="checkbox"
                  checked={highSecurity}
                  onChange={(e) => setHighSecurity(e.target.checked)}
                />
                Haute sécurité
              </label>
            </div>
            <div
              className="text-xs rounded-lg p-2 border
              bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-tertiary))] border-[hsl(var(--border-default))]"
            >
              Ces permissions s&apos;appliqueront à ce dossier et seront
              héritées par tous ses sous-dossiers.
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              className="rounded-lg border px-3 py-1.5 text-sm
              border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))]"
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              className="inline-flex items-center gap-1 rounded-lg bg-[hsl(var(--info))] px-3 py-1.5 text-sm font-medium text-white hover:bg-[hsl(var(--info))]/80"
              onClick={() =>
                onSubmit({
                  restricted,
                  highSecurity,
                  editGroups:
                    editGroups.filter((g) => g.trim() !== "").length > 0
                      ? editGroups.filter((g) => g.trim() !== "")
                      : null,
                  readGroups:
                    readGroups.filter((g) => g.trim() !== "").length > 0
                      ? readGroups.filter((g) => g.trim() !== "")
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
    </Portal>
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
        className="rounded-md p-1 text-xs text-[hsl(var(--info))] hover:bg-[hsl(var(--info-muted))]"
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
function AccessDenied() {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-[hsl(var(--bg-elevated))]">
      <div className="max-w-lg rounded-xl border p-8 text-center bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))] border-[hsl(var(--border-default))]">
        <h3 className="mb-2 text-xl font-bold">Accès restreint</h3>
        <p className="text-sm text-[hsl(var(--text-tertiary))]">
          Vous ne disposez pas des autorisations nécessaires pour consulter ces
          données. Veuillez contacter votre département TI pour de l&apos;aide.
        </p>
      </div>
    </div>
  );
}
