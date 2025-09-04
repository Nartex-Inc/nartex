"use client";

import * as React from "react";
import useSWR, { mutate } from "swr";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Inter } from "next/font/google";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Card, CardTitle } from "@/components/ui/card";
import { THEME } from "@/lib/theme-tokens";
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
  FolderTree,
} from "lucide-react";

/* =============================================================================
   Font & Theme
============================================================================= */
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
type ThemeTokens = (typeof THEME)[keyof typeof THEME];

/* =============================================================================
   Security Groups (static)
============================================================================= */
const SECURITY_GROUPS = [
  "SG-PRESIDENT",
  "SG-CFO",
  "SG-DIRECTION",
  "SG-ADMIN-FINANCE-ALL",
  "SG-ADMIN-FINANCE-EXÉCUTIF",
  "SG-RH-ALL",
  "SG-RH-EXÉCUTIF",
  "SG-VENTES-ALL",
  "SG-VENTES-EXÉCUTIF",
  "SG-R&D-ALL",
  "SG-R&D-EXÉCUTIF",
  "SG-PROD-ALL",
  "SG-PROD-EXÉCUTIF",
  "SG-TI-ALL",
  "SG-TI-EXÉCUTIF",
  "SG-MARKETING-ALL",
  "SG-MARKETING-EXÉCUTIF",
  "SG-ALL",
];

/* =============================================================================
   Types
============================================================================= */
type APINode = {
  id: string;
  tenantId: string;
  parentId: string | null;
  name: string;
  type: string | null;
  icon?: string | null;
  restricted?: boolean | null;
  highSecurity?: boolean | null;
  editGroups?: string[] | null;
  readGroups?: string[] | null;
  createdAt: string;
  updatedAt: string;
};

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
  depth?: number;
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

const toView = (arr?: string[] | null) => (Array.isArray(arr) && arr.length === 0 ? null : arr);

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
      .map((c) => toNode(c, depth + 1)),
  });

  const rootChildren = (byParent.get(null) ?? []).sort((a, b) => a.name.localeCompare(b.name));
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

function findParentWithPermissions(tree: NodeItem | null, node: NodeItem): NodeItem | null {
  if (!tree || !node.parentId) return null;
  const parent = findNodeById(tree, node.parentId);
  if (!parent) return null;
  if (parent.editGroups || parent.readGroups) return parent;
  if (parent.parentId) return findParentWithPermissions(tree, parent);
  return null;
}

/* =============================================================================
   Page (auth gate)
============================================================================= */
export default function SharePointPage() {
  const { status } = useSession();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const mode: "dark" | "light" = mounted && resolvedTheme === "light" ? "light" : "dark";
  const t: ThemeTokens = THEME[mode];

  if (status === "loading" || !mounted)
    return <LoadingAnimation title="Chargement de SharePoint" subtitle="Initialisation..." />;

  if (status === "unauthenticated") return <AccessDenied />;

  return (
    <main
      className={`min-h-[100svh] ${inter.className} bg-white dark:bg-[#050507]`}
      style={{
        background: mode === "dark" ? `linear-gradient(180deg, ${t.bg} 0%, #050507 100%)` : undefined,
        color: t.foreground,
      }}
    >
      {mode === "dark" && (
        <div className="fixed inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: t.haloCyan }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: t.haloViolet }} />
        </div>
      )}

      <div className="px-4 md:px-6 lg:px-8 py-6 md:py-8 relative z-10">
        <div className="mx-auto w-full max-w-[1920px]">
          <SharePointStructure t={t} mode={mode} />
        </div>
      </div>
    </main>
  );
}

/* =============================================================================
   Structure Viewer (live CRUD)
============================================================================= */
function SharePointStructure({ t, mode }: { t: ThemeTokens; mode: "dark" | "light" }) {
  const { data, error, isLoading } = useSWR<APINode[]>("/api/sharepoint", fetcher, { revalidateOnFocus: false });

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(["root"]));
  const [selected, setSelected] = React.useState<NodeItem | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [creatingInId, setCreatingInId] = React.useState<string | null>(null);
  const [newFolderName, setNewFolderName] = React.useState("");

  const tree = React.useMemo(() => (data ? buildTree(data) : null), [data]);

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

  /* ----------------------------- Mutations -------------------------------- */
  const startCreating = (parentId: string | null) => {
    const id = parentId === null ? "root" : parentId;
    setCreatingInId(id);
    setNewFolderName("");
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

    mutate("/api/sharepoint", (prev: APINode[] | undefined) => (prev ? [...prev, optimistic] : prev), false);

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
        (prev: APINode[] | undefined) => prev?.filter((n) => n.id !== optimistic.id),
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
      (prev: APINode[] | undefined) => prev?.map((n) => (n.id === editingId ? { ...n, name: editingName.trim() } : n)),
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
        (prev: APINode[] | undefined) => prev?.map((n) => (n.id === editingId ? { ...n, name: oldName } : n)),
        false
      );
      alert((e as Error).message);
    } finally {
      mutate("/api/sharepoint");
    }
  };

  const deleteNode = async (node: NodeItem) => {
    if (!confirm(`Supprimer « ${node.name} » et tous ses sous-dossiers ?`)) return;
    try {
      const res = await fetch(`/api/sharepoint/${node.id}`, { method: "DELETE" });
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
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          style={{
            borderColor: "rgba(16,185,129,.35)",
            background: "rgba(16,185,129,.12)",
            color: mode === "dark" ? "#34d399" : "#047857",
          }}
        >
          <Edit className="h-3.5 w-3.5" />
          {editLen} groupe{editLen > 1 ? "s" : ""}
        </span>
      );
    }
    if (readLen) {
      out.push(
        <span
          key="read"
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          style={{
            borderColor: "rgba(14,165,233,.35)",
            background: "rgba(14,165,233,.12)",
            color: mode === "dark" ? "#38bdf8" : "#0369a1",
          }}
        >
          <Eye className="h-3.5 w-3.5" />
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
    the;
    const isCreating = creatingInId === node.id;
    const canEditPermissions = node.depth === 3 && node.id !== "root";

    return (
      <div key={node.id} className="select-none">
        <div
          className="group flex items-center gap-3 rounded-2xl px-4 py-2.5 transition-all border border-transparent"
          style={{
            paddingLeft: visualDepth * 22 + 16,
            background: isSelected ? `linear-gradient(135deg, ${t.card} 0%, ${t.soft} 100%)` : "transparent",
            borderColor: isSelected ? t.cardBorder : "transparent",
            boxShadow: isSelected ? "0 8px 30px rgba(0,0,0,.25)" : "none",
          }}
          onClick={(e) => {
            const tgt = e.target as HTMLElement;
            if (tgt.closest("[data-node-action]")) return;
            if (tgt.closest("input")) return;
            if (hasChildren) toggle(node.id);
            setSelected(node);
          }}
        >
          {hasChildren && (
            <span
              className="transition-transform"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "none",
                color: t.labelMuted,
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          )}

          {node.type === "site" && <Building2 className="h-5 w-5" style={{ color: t.accentSecondary }} />}
          {node.type === "library" && <span className="text-xl">{node.icon || "📁"}</span>}
          {(!node.type || node.type === "folder") &&
            (isExpanded ? (
              <FolderOpen className="h-5 w-5" style={{ color: t.accentPrimary }} />
            ) : (
              <Folder className="h-5 w-5" style={{ color: t.labelMuted }} />
            ))}

          {isEditing ? (
            <input
              className="flex-1 rounded-lg px-2 py-1 text-base outline-none"
              style={{
                background: mode === "dark" ? "rgb(15 15 18)" : "#fff",
                border: `1px solid ${t.cardBorder}`,
                color: t.foreground,
              }}
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
              className="flex-1 font-semibold text-[15px] tracking-tight"
              style={{ color: t.foreground }}
              onDoubleClick={() => node.id !== "root" && startRenaming(node)}
            >
              {node.name}{" "}
              {node.restricted && <Lock className="inline h-4 w-4 ml-1" style={{ color: "#f59e0b" }} />}
              {node.highSecurity && <Shield className="inline h-4 w-4 ml-1" style={{ color: "#ef4444" }} />}
            </span>
          )}

          <div className="hidden lg:flex items-center gap-2 ml-2">{permissionBadges(node)}</div>

          <div className="ml-2 flex items-center gap-1 opacity-0 translate-y-[2px] group-hover:opacity-100 transition">
            <button
              data-node-action
              className="rounded-md p-1.5 hover:scale-105 transition"
              style={{ color: t.label, background: "transparent" }}
              title="Ajouter un sous-dossier"
              onClick={() => startCreating(node.id === "root" ? null : node.id)}
            >
              <Plus className="h-4 w-4" />
            </button>
            {node.id !== "root" && (
              <>
                <button
                  data-node-action
                  className="rounded-md p-1.5 hover:scale-105 transition"
                  style={{ color: t.label, background: "transparent" }}
                  title="Renommer (F2)"
                  onClick={() => startRenaming(node)}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  data-node-action
                  className="rounded-md p-1.5 hover:bg-red-500/10 transition"
                  style={{ color: "#f87171" }}
                  title="Supprimer"
                  onClick={() => deleteNode(node)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {canEditPermissions && <PermissionsButton node={node} onSave={(p) => updatePermissions(node, p)} />}
              </>
            )}
          </div>
        </div>

        {isCreating && (
          <div className="mt-1" style={{ paddingLeft: (visualDepth + 1) * 22 + 16 }}>
            <div className="flex items-center gap-3">
              <Folder className="h-5 w-5" style={{ color: t.labelMuted }} />
              <input
                className="flex-1 rounded-lg px-3 py-2 text-base outline-none"
                style={{
                  background: mode === "dark" ? "rgb(15 15 18)" : "#fff",
                  border: `1px solid ${t.cardBorder}`,
                  color: t.foreground,
                }}
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

        {isExpanded && hasChildren && <div>{node.children!.map((c) => renderNode(c, visualDepth + 1))}</div>}
      </div>
    );
  };

  // F2 rename shortcut
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
      <div
        className="p-6 text-sm rounded-2xl border"
        style={{
          background: "rgba(239,68,68,.08)",
          borderColor: "rgba(239,68,68,.3)",
          color: "#fecaca",
        }}
      >
        Erreur de chargement des dossiers. Réessayez.
      </div>
    );
  }
  if (isLoading || !tree)
    return <LoadingAnimation title="Chargement de la structure" subtitle="Récupération des dossiers…" />;

  return (
    <div className="h-full flex flex-col">
      {/* Hero header (matches dashboard) */}
      <div
        className="rounded-3xl border backdrop-blur-2xl relative overflow-hidden mb-6"
        style={{
          borderColor: t.cardBorder,
          background: `linear-gradient(135deg, ${t.card} 0%, ${
            mode === "dark" ? "rgba(139,92,246,0.03)" : "rgba(124,58,237,0.05)"
          } 100%)`,
        }}
      >
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"
          style={{ background: `linear-gradient(to bottom right, ${t.haloCyan}, ${t.haloViolet})` }}
        />
        <div className="px-6 py-6 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="p-2 rounded-xl backdrop-blur-xl"
                  style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(139,92,246,0.2))" }}
                >
                  <FolderTree className="w-6 h-6" style={{ color: t.accentPrimary }} />
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight" style={{ color: t.foreground }}>
                  Structure SharePoint<span style={{ color: t.accentPrimary }}>.</span>
                </h1>
              </div>
              <p className="text-sm ml-12" style={{ color: t.label }}>
                Naviguez, créez et gérez vos dossiers avec des permissions claires.
              </p>
            </div>

            <button
              className="px-6 py-2.5 rounded-xl text-sm font-bold hover:scale-105 transition-all duration-300 shadow-2xl"
              style={{
                color: "#000",
                background: "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)",
                boxShadow: "0 10px 30px rgba(34, 211, 238, 0.35)",
              }}
              onClick={() => startCreating("root")}
            >
              Ajouter un dossier racine
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-6">
        {/* Explorer */}
        <div className="flex-1 overflow-y-auto">
          <Card className="h-full rounded-3xl border">
            <div
              style={{ background: `linear-gradient(135deg, ${t.card} 0%, ${t.soft} 100%)`, borderColor: t.cardBorder }}
              className="h-full rounded-3xl border"
            >
              <div className="px-6 pt-6">
                <div style={{ color: t.accentPrimary }}>
                  <CardTitle icon={<Folder className="h-5 w-5" />}>Arborescence des dossiers</CardTitle>
                </div>
                <p className="mt-2 text-sm" style={{ color: t.label }}>
                  Double-cliquez (ou F2) pour renommer · Permissions éditables au niveau 3
                </p>
              </div>
              <div className="px-4 pb-6">
                <div className="overflow-y-auto pr-2 pt-4" style={{ maxHeight: "calc(100vh - 340px)" }}>
                  {tree.children?.map((c) => renderNode(c, 0))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="w-[440px] flex-shrink-0">
          <Card className="rounded-3xl border p-6 overflow-y-auto">
            <div
              style={{ background: `linear-gradient(135deg, ${t.card} 0%, ${t.soft} 100%)`, borderColor: t.cardBorder }}
              className="rounded-3xl border p-0"
            >
              <div className="space-y-4 p-6">
                {selected && selected.id !== "root" && (
                  <Card className="rounded-2xl border">
                    <div className="rounded-2xl border p-4" style={{ background: t.cardSoft, borderColor: t.cardBorder }}>
                      <CardTitle icon={<Settings2 className="h-5 w-5" style={{ color: t.accentSecondary }} />}>
                        Détails du dossier
                      </CardTitle>
                      <div className="text-base space-y-2 mt-3" style={{ color: t.foreground }}>
                        <div className="flex items-center gap-2">
                          <span className="opacity-70">Nom :</span>
                          <span className="font-semibold">{selected.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="opacity-70">Type :</span>
                          <span className="font-mono text-sm">{selected.type ?? "folder"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="opacity-70">Niveau :</span>
                          <span className="font-mono text-sm">{selected.depth}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">{permissionBadges(selected)}</div>

                      {selected.depth && selected.depth >= 3 && (
                        <PermissionsInlineViewer key={selected.id} node={selected} tree={tree} t={t} mode={mode} />
                      )}
                    </div>
                  </Card>
                )}

                <Card className="rounded-2xl border">
                  <div className="rounded-2xl border p-4" style={{ background: t.cardSoft, borderColor: t.cardBorder }}>
                    <CardTitle icon={<Star className="h-5 w-5" style={{ color: "#fbbf24" }} />}>Légende</CardTitle>
                    <div className="mt-4 space-y-3 text-sm" style={{ color: t.foreground }}>
                      <div className="flex items-center gap-3">
                        <Lock className="h-4 w-4" style={{ color: "#f59e0b" }} />
                        <span>Accès restreint</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4" style={{ color: "#ef4444" }} />
                        <span>Haute sécurité</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Edit className="h-4 w-4" style={{ color: "#34d399" }} />
                        <span>Groupes ayant l&apos;édition</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Eye className="h-4 w-4" style={{ color: "#38bdf8" }} />
                        <span>Groupes en lecture</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border">
                  <div className="rounded-2xl border p-4" style={{ background: t.cardSoft, borderColor: t.cardBorder }}>
                    <CardTitle icon={<Users className="h-5 w-5" style={{ color: t.accentPrimary }} />}>
                      Groupes de sécurité
                    </CardTitle>
                    <div className="mt-4 space-y-2 text-sm" style={{ color: t.foreground }}>
                      <div>
                        <span className="font-semibold">Standard :</span>
                        <p className="opacity-80">SG-[DEPT]-ALL</p>
                      </div>
                      <div>
                        <span className="font-semibold">Exécutif :</span>
                        <p className="opacity-80">SG-[DEPT]-EXECUTIF</p>
                      </div>
                      <div className="pt-2" style={{ borderTop: `1px solid ${t.cardBorder}` }}>
                        <span className="font-semibold">Spéciaux :</span>
                        <p className="opacity-80">SG-CFO, SG-PRESIDENT</p>
                        <p className="opacity-80">SG-DIRECTION-ALL</p>
                        <p className="opacity-80">SG-DIRECTION-EXECUTIF</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
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
  t,
  mode,
}: {
  node: NodeItem;
  tree: NodeItem;
  t: ThemeTokens;
  mode: "dark" | "light";
}) {
  if (!node.depth || node.depth < 3) return null;

  const isInherited = node.depth > 3;
  const parentWithPerms = isInherited ? findParentWithPermissions(tree, node) : null;
  const effectiveNode = isInherited && parentWithPerms ? parentWithPerms : node;

  const editGroups = effectiveNode.editGroups ?? [];
  const readGroups = effectiveNode.readGroups ?? [];
  const restricted = !!effectiveNode.restricted;
  const highSecurity = !!effectiveNode.highSecurity;

  return (
    <div className="rounded-2xl p-4 space-y-4" style={{ background: t.card, border: `1px solid ${t.cardBorder}` }}>
      {isInherited && (
        <div
          className="text-xs rounded-lg px-2 py-1"
          style={{
            color: "#f59e0b",
            background: "rgba(245,158,11,.12)",
            border: "1px solid rgba(245,158,11,.25)",
          }}
        >
          Permissions héritées{parentWithPerms ? ` de « ${parentWithPerms.name} »` : ""}
        </div>
      )}

      <div className="grid gap-2">
        <label className="text-xs" style={{ color: t.label }}>
          Groupes (édition) — {editGroups.length} groupe{editGroups.length !== 1 ? "s" : ""}
        </label>
        <div
          className="rounded-lg px-3 py-2 min-h-[38px]"
          style={{
            background: mode === "dark" ? "rgb(15 15 18)" : "#fff",
            border: `1px solid ${t.cardBorder}`,
            color: t.foreground,
          }}
        >
          {editGroups.length > 0 ? (
            <div className="space-y-1 text-sm">{editGroups.map((g, i) => <div key={i}>{g}</div>)}</div>
          ) : (
            <div className="text-xs" style={{ color: t.label }}>
              (aucun)
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-xs" style={{ color: t.label }}>
          Groupes (lecture) — {readGroups.length} groupe{readGroups.length !== 1 ? "s" : ""}
        </label>
        <div
          className="rounded-lg px-3 py-2 min-h-[38px]"
          style={{
            background: mode === "dark" ? "rgb(15 15 18)" : "#fff",
            border: `1px solid ${t.cardBorder}`,
            color: t.foreground,
          }}
        >
          {readGroups.length > 0 ? (
            <div className="space-y-1 text-sm">{readGroups.map((g, i) => <div key={i}>{g}</div>)}</div>
          ) : (
            <div className="text-xs" style={{ color: t.label }}>
              (aucun)
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm" style={{ color: t.foreground }}>
        <span className="flex items-center gap-2">
          <input type="checkbox" checked={restricted} readOnly disabled /> Accès restreint
        </span>
        <span className="flex items-center gap-2">
          <input type="checkbox" checked={highSecurity} readOnly disabled /> Haute sécurité
        </span>
      </div>

      {node.depth === 3 ? (
        <p className="text-xs" style={{ color: t.label }}>
          Utilisez le bouton <Settings2 className="inline h-3 w-3" /> pour modifier les permissions.
        </p>
      ) : node.depth && node.depth > 3 ? (
        <p className="text-xs" style={{ color: t.label }}>
          Les permissions sont héritées du dossier parent de niveau 3.
        </p>
      ) : null}
    </div>
  );
}

/* =============================================================================
   Permission Modal (dropdowns)
============================================================================= */
function PermissionModal({
  initial,
  onClose,
  onSubmit,
  t,
  mode,
}: {
  initial: PermSpec;
  onClose: () => void;
  onSubmit: (p: PermSpec) => void;
  t: ThemeTokens;
  mode: "dark" | "light";
}) {
  const [editGroups, setEditGroups] = React.useState<string[]>(
    initial?.editGroups && initial.editGroups.length > 0 ? initial.editGroups : [""]
  );
  const [readGroups, setReadGroups] = React.useState<string[]>(
    initial?.readGroups && initial.readGroups.length > 0 ? initial.readGroups : [""]
  );
  const [restricted, setRestricted] = React.useState(!!initial?.restricted);
  const [highSecurity, setHighSecurity] = React.useState(!!initial?.highSecurity);

  React.useEffect(() => {
    setEditGroups(initial?.editGroups && initial.editGroups.length > 0 ? initial.editGroups : [""]);
    setReadGroups(initial?.readGroups && initial.readGroups.length > 0 ? initial.readGroups : [""]);
    setRestricted(!!initial?.restricted);
    setHighSecurity(!!initial?.highSecurity);
  }, [initial?.editGroups, initial?.readGroups, initial?.restricted, initial?.highSecurity]);

  const getAvailableEditGroups = (currentIndex: number) => {
    const used = editGroups.filter((g, i) => g !== "" && i !== currentIndex);
    return SECURITY_GROUPS.filter((g) => !used.includes(g));
  };
  const getAvailableReadGroups = (currentIndex: number) => {
    const used = readGroups.filter((g, i) => g !== "" && i !== currentIndex);
    return SECURITY_GROUPS.filter((g) => !used.includes(g));
  };
  const canAddEditGroup = editGroups.every((g) => g.trim()) && getAvailableEditGroups(-1).length > 0;
  const canAddReadGroup = readGroups.every((g) => g.trim()) && getAvailableReadGroups(-1).length > 0;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg rounded-2xl border max-h-[90vh] overflow-y-auto p-5"
        style={{ background: `linear-gradient(135deg, ${t.card} 0%, ${t.soft} 100%)`, borderColor: t.cardBorder, color: t.foreground }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-5 w-5" style={{ color: t.accentPrimary }} />
            Éditer les permissions (Niveau 3)
          </h3>
          <button className="rounded-md p-1 hover:bg-white/10" style={{ color: t.label }} onClick={onClose} title="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs" style={{ color: t.label }}>
                Groupes (édition)
              </label>
              <button
                className="text-xs px-2 py-1 rounded font-semibold transition"
                style={{ background: "rgba(16,185,129,.15)", color: mode === "dark" ? "#34d399" : "#047857" }}
                onClick={() => setEditGroups([...editGroups, ""])}
                disabled={!canAddEditGroup}
                title={canAddEditGroup ? "Ajouter un groupe" : "Tous les groupes sont déjà sélectionnés"}
              >
                + Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {editGroups.map((group, index) => {
                const available = getAvailableEditGroups(index);
                return (
                  <div key={index} className="flex gap-2">
                    <select
                      className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: mode === "dark" ? "rgb(15 15 18)" : "#fff", border: `1px solid ${t.cardBorder}`, color: t.foreground }}
                      value={group}
                      onChange={(e) => {
                        const updated = [...editGroups];
                        updated[index] = e.target.value;
                        setEditGroups(updated);
                      }}
                    >
                      <option value="" disabled>
                        Veuillez sélectionner une option
                      </option>
                      {available.map((sg) => (
                        <option key={sg} value={sg}>
                          {sg}
                        </option>
                      ))}
                    </select>
                    {editGroups.length > 1 && (
                      <button
                        className="rounded-lg p-2 hover:bg-red-500/10"
                        style={{ color: "#f87171" }}
                        onClick={() => setEditGroups(editGroups.filter((_, i) => i !== index))}
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
              <label className="text-xs" style={{ color: t.label }}>
                Groupes (lecture)
              </label>
              <button
                className="text-xs px-2 py-1 rounded font-semibold transition"
                style={{ background: "rgba(14,165,233,.15)", color: mode === "dark" ? "#38bdf8" : "#0369a1" }}
                onClick={() => setReadGroups([...readGroups, ""])}
                disabled={!canAddReadGroup}
                title={canAddReadGroup ? "Ajouter un groupe" : "Tous les groupes sont déjà sélectionnés"}
              >
                + Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {readGroups.map((group, index) => {
                const available = getAvailableReadGroups(index);
                return (
                  <div key={index} className="flex gap-2">
                    <select
                      className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: mode === "dark" ? "rgb(15 15 18)" : "#fff", border: `1px solid ${t.cardBorder}`, color: t.foreground }}
                      value={group}
                      onChange={(e) => {
                        const updated = [...readGroups];
                        updated[index] = e.target.value;
                        setReadGroups(updated);
                      }}
                    >
                      <option value="" disabled>
                        Veuillez sélectionner une option
                      </option>
                      {available.map((sg) => (
                        <option key={sg} value={sg}>
                          {sg}
                        </option>
                      ))}
                    </select>
                    {readGroups.length > 1 && (
                      <button
                        className="rounded-lg p-2 hover:bg-red-500/10"
                        style={{ color: "#f87171" }}
                        onClick={() => setReadGroups(readGroups.filter((_, i) => i !== index))}
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

          <div className="flex items-center gap-6 text-sm" style={{ color: t.foreground }}>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={restricted} onChange={(e) => setRestricted(e.target.checked)} />
              Accès restreint
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={highSecurity} onChange={(e) => setHighSecurity(e.target.checked)} />
              Haute sécurité
            </label>
          </div>
          <div
            className="text-xs rounded-lg p-2"
            style={{
              background: mode === "dark" ? "rgba(255,255,255,.02)" : "#f8fafc",
              border: `1px solid ${t.cardBorder}`,
              color: t.label,
            }}
          >
            Ces permissions s&apos;appliqueront à ce dossier et seront héritées par tous ses sous-dossiers.
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: t.cardSoft, border: `1px solid ${t.cardBorder}`, color: t.foreground }}
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold hover:scale-[1.02] transition shadow-2xl"
            style={{
              color: "#000",
              background: "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)",
              boxShadow: "0 10px 24px rgba(34,211,238,.35)",
            }}
            onClick={() =>
              onSubmit({
                restricted,
                highSecurity,
                editGroups:
                  editGroups.filter((g) => g.trim() !== "").length ? editGroups.filter((g) => g.trim() !== "") : null,
                readGroups:
                  readGroups.filter((g) => g.trim() !== "").length ? readGroups.filter((g) => g.trim() !== "") : null,
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
function PermissionsButton({ node, onSave }: { node: NodeItem; onSave: (p: PermSpec) => void }) {
  const { resolvedTheme } = useTheme();
  const mode: "dark" | "light" = resolvedTheme === "light" ? "light" : "dark";
  const t: ThemeTokens = THEME[mode];
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        data-node-action
        className="rounded-md p-1.5 hover:scale-105 transition"
        style={{ color: t.accentPrimary, background: "transparent" }}
        title="Éditer permissions (Niveau 3)"
        onClick={() => setOpen(true)}
      >
        <Settings2 className="h-4 w-4" />
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
          t={t}
          mode={mode}
        />
      )}
    </>
  );
}

/* =============================================================================
   Utils & Access
============================================================================= */
function splitOrNull(s: string): string[] | null {
  const arr = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return arr.length ? arr : null;
}

function AccessDenied() {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-50 dark:bg-black">
      <div className="max-w-lg rounded-2xl border p-8 text-center bg-white border-slate-200 dark:bg-gray-900 dark:border-gray-800">
        <h3 className="mb-2 text-2xl font-bold">Accès restreint</h3>
        <p className="text-sm opacity-80">
          Vous ne disposez pas des autorisations nécessaires pour consulter ces données. Veuillez contacter votre
          département TI pour de l&apos;aide.
        </p>
      </div>
    </div>
  );
}
