// src/app/dashboard/sharepoint/page.tsx
"use client";

import * as React from "react";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Lock,
  Users,
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
  Search,
  Database,
  Layers,
  Shield,
  Sparkles,
  Moon,
  Sun,
  FileText,
  GitBranch,
} from "lucide-react";

/* =============================================================================
   Theme
============================================================================= */
const THEME = {
  dark: {
    bg: "#050507",
    card: "rgba(10, 10, 12, 0.72)",
    soft: "rgba(20, 20, 24, 0.55)",
    cardBorder: "rgba(255, 255, 255, 0.08)",
    foreground: "#ffffff",
    label: "#d1d5db",
    labelMuted: "#9ca3af",
    accentPrimary: "#22d3ee",
    accentSecondary: "#8b5cf6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    gradientPrimary:
      "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(139,92,246,0.15))",
    haloCyan: "rgba(34,211,238,0.40)",
    haloViolet: "rgba(139,92,246,0.40)",
  },
  light: {
    bg: "#ffffff",
    card: "rgba(255,255,255,0.92)",
    soft: "rgba(248, 250, 252, 0.92)",
    cardBorder: "rgba(0,0,0,0.08)",
    foreground: "#0f172a",
    label: "#334155",
    labelMuted: "#64748b",
    accentPrimary: "#0ea5e9",
    accentSecondary: "#7c3aed",
    success: "#059669",
    warning: "#d97706",
    danger: "#dc2626",
    gradientPrimary:
      "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(124,58,237,0.12))",
    haloCyan: "rgba(14,165,233,0.30)",
    haloViolet: "rgba(124,58,237,0.30)",
  },
} as const;

/* =============================================================================
   Types
============================================================================= */
type RawRow = {
  id: string;
  parentId: string | null;
  name: string;
  type?: "site" | "library" | "folder";
  icon?: string;
  restricted?: boolean;
  highSecurity?: boolean;
  editGroups?: string[]; // null/undefined = inherit not set here
  readGroups?: string[];
};

type NodeItem = RawRow & {
  children?: NodeItem[];
  depth?: number;
  path?: string;
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
   Static Data (typed normally, NOT `as const`)
============================================================================= */
const SAMPLE_DATA: RawRow[] = [
  {
    id: "1",
    parentId: null,
    name: "GROUPE SINTO - SharePoint",
    type: "site",
    icon: "🏢",
    restricted: false,
    highSecurity: false,
    editGroups: [],
    readGroups: [],
  },
  {
    id: "2",
    parentId: "1",
    name: "ADMIN-FINANCE",
    type: "library",
    icon: "💼",
    restricted: true,
    highSecurity: false,
    editGroups: ["SG-ADMIN-FINANCE-EXÉCUTIF"],
    readGroups: ["SG-ADMIN-FINANCE-ALL"],
  },
  {
    id: "3",
    parentId: "2",
    name: "COMITÉ DE DIRECTION",
    type: "folder",
    restricted: false,
    highSecurity: true,
    editGroups: ["SG-DIRECTION"],
    readGroups: ["SG-CFO", "SG-PRESIDENT"],
  },
  { id: "4", parentId: "3", name: "Communications", type: "folder" },
  { id: "5", parentId: "3", name: "Ordres du jour & calendriers", type: "folder" },
  { id: "6", parentId: "3", name: "Organigramme fonctionnel", type: "folder" },
  {
    id: "7",
    parentId: "1",
    name: "MARKETING",
    type: "library",
    icon: "📊",
    restricted: false,
    highSecurity: false,
    editGroups: ["SG-MARKETING-EXÉCUTIF"],
    readGroups: ["SG-MARKETING-ALL"],
  },
  { id: "8", parentId: "7", name: "OPÉRATIONS", type: "folder" },
  {
    id: "9",
    parentId: "8",
    name: "Capex",
    type: "folder",
    editGroups: ["SG-DIRECTION"],
    readGroups: ["SG-MARKETING-ALL"],
  },
  {
    id: "10",
    parentId: "8",
    name: "Contrats & fournisseurs",
    type: "folder",
    restricted: true,
    editGroups: ["SG-MARKETING-EXÉCUTIF"],
  },
  {
    id: "11",
    parentId: "8",
    name: "KPI & tableaux de bord",
    type: "folder",
    readGroups: ["SG-ALL"],
  },
  {
    id: "12",
    parentId: "8",
    name: "Projets stratégiques",
    type: "folder",
    restricted: true,
    highSecurity: true,
    editGroups: ["SG-DIRECTION"],
    readGroups: ["SG-MARKETING-EXÉCUTIF"],
  },
  {
    id: "13",
    parentId: "1",
    name: "PRINCIPAL",
    type: "library",
    icon: "📁",
    restricted: false,
    highSecurity: false,
    editGroups: [],
    readGroups: ["SG-ALL"],
  },
  {
    id: "14",
    parentId: "13",
    name: "PUBLIC",
    type: "folder",
    editGroups: ["SG-ALL"],
    readGroups: ["SG-ALL"],
  },
  {
    id: "15",
    parentId: "1",
    name: "R&D",
    type: "library",
    icon: "🔬",
    restricted: true,
    highSecurity: true,
    editGroups: ["SG-R&D-EXÉCUTIF"],
    readGroups: ["SG-R&D-ALL"],
  },
  {
    id: "16",
    parentId: "1",
    name: "RH",
    type: "library",
    icon: "👥",
    restricted: true,
    editGroups: ["SG-RH-EXÉCUTIF"],
    readGroups: ["SG-RH-ALL"],
  },
  {
    id: "17",
    parentId: "1",
    name: "TI",
    type: "library",
    icon: "💻",
    editGroups: ["SG-TI-EXÉCUTIF"],
    readGroups: ["SG-TI-ALL"],
  },
  {
    id: "18",
    parentId: "1",
    name: "VENTES",
    type: "library",
    icon: "💰",
    editGroups: ["SG-VENTES-EXÉCUTIF"],
    readGroups: ["SG-VENTES-ALL"],
  },
];

/* =============================================================================
   Helpers
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
] as const;

function buildTree(rows: ReadonlyArray<RawRow>): NodeItem {
  const byParent = new Map<string | null, RawRow[]>();
  for (const n of rows) {
    const k = n.parentId ?? null;
    const arr = byParent.get(k) ?? [];
    arr.push(n);
    byParent.set(k, arr);
  }

  const toNode = (n: RawRow, depth = 0, path = ""): NodeItem => {
    const nodePath = path ? `${path}/${n.name}` : n.name;
    const children = (byParent.get(n.id) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => toNode(c, depth + 1, nodePath));

    return {
      ...n,
      depth,
      path: nodePath,
      children,
    };
  };

  const rootChildren = (byParent.get(null) ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    id: "root",
    parentId: null,
    name: "SharePoint",
    type: "site",
    depth: 0,
    path: "/",
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
  if (parent.editGroups || parent.readGroups || parent.restricted || parent.highSecurity) {
    return parent;
  }
  if (parent.parentId) return findParentWithPermissions(tree, parent);
  return null;
}

/* =============================================================================
   Small components
============================================================================= */
const PremiumCard = ({
  children,
  className = "",
  gradient = false,
  hover = true,
  theme,
}: {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  hover?: boolean;
  type Theme = (typeof THEME)[keyof typeof THEME];
}) => (
  <div className={`group relative ${className}`}>
    {gradient && (
      <div
        className="absolute -inset-0.5 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition duration-700"
        style={{ background: theme.gradientPrimary }}
      />
    )}
    <div
      className={`relative rounded-2xl backdrop-blur-xl border transition-all duration-300 ${
        hover ? "hover:border-white/10" : ""
      }`}
      style={{
        background: `linear-gradient(135deg, ${theme.card} 0%, ${theme.soft} 100%)`,
        borderColor: theme.cardBorder,
      }}
    >
      {children}
    </div>
  </div>
);

/* =============================================================================
   Page
============================================================================= */
export default function SharePointViewer() {
  const [themeMode, setThemeMode] = React.useState<"dark" | "light">("dark");
  const t = THEME[themeMode];

  const [data, setData] = React.useState<RawRow[]>([...SAMPLE_DATA]);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(["root", "1"]));
  const [selected, setSelected] = React.useState<NodeItem | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [creatingInId, setCreatingInId] = React.useState<string | null>(null);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

  const tree = React.useMemo(() => buildTree(data), [data]);

  const stats = React.useMemo(() => {
    const walk = (node: NodeItem): { total: number; restricted: number; highSecurity: number; withPermissions: number } => {
      const self = {
        total: 1,
        restricted: node.restricted ? 1 : 0,
        highSecurity: node.highSecurity ? 1 : 0,
        withPermissions: (node.editGroups?.length || node.readGroups?.length) ? 1 : 0,
      };
      for (const c of node.children ?? []) {
        const s = walk(c);
        self.total += s.total;
        self.restricted += s.restricted;
        self.highSecurity += s.highSecurity;
        self.withPermissions += s.withPermissions;
      }
      return self;
    };
    return walk(tree);
  }, [tree]);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const startCreating = (parentId: string | null) => {
    const id: string = parentId === null ? "root" : parentId;
    setCreatingInId(id);
    setNewFolderName("");
    const next = new Set(expanded);
    next.add(id);
    setExpanded(next);
  };

  const confirmCreate = () => {
    if (!newFolderName.trim()) {
      setCreatingInId(null);
      return;
    }
    const parentId = creatingInId === "root" ? null : creatingInId;
    const newNode: RawRow = {
      id: `new-${Date.now()}`,
      parentId,
      name: newFolderName.trim(),
      type: "folder",
      icon: "📁",
      restricted: false,
      highSecurity: false,
      editGroups: [],
      readGroups: [],
    };
    setData((prev) => [...prev, newNode]);
    setCreatingInId(null);
    setNewFolderName("");
  };

  const startRenaming = (node: NodeItem) => {
    setEditingId(node.id);
    setEditingName(node.name);
  };

  const confirmRename = () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      return;
    }
    setData((prev) => prev.map((n) => (n.id === editingId ? { ...n, name: editingName.trim() } : n)));
    setEditingId(null);
  };

  const deleteNode = (node: NodeItem) => {
    if (!window.confirm(`Supprimer « ${node.name} » et tous ses sous-dossiers ?`)) return;
    const idsToDelete = new Set<string>([node.id]);
    const collect = (n: NodeItem) => (n.children ?? []).forEach((c) => (idsToDelete.add(c.id), collect(c)));
    collect(node);
    setData((prev) => prev.filter((n) => !idsToDelete.has(n.id)));
    if (selected?.id === node.id) setSelected(null);
  };

  const updatePermissions = (node: NodeItem, perms: PermSpec) => {
    if (!perms) return;
    setData((prev) =>
      prev.map((n) =>
        n.id === node.id
          ? {
              ...n,
              restricted: !!perms.restricted,
              highSecurity: !!perms.highSecurity,
              editGroups: perms.editGroups ?? [],
              readGroups: perms.readGroups ?? [],
            }
          : n
      )
    );
  };

  const hasMatchingDescendant = (node: NodeItem, q: string): boolean =>
    node.name.toLowerCase().includes(q.toLowerCase()) ||
    (node.children?.some((c) => hasMatchingDescendant(c, q)) ?? false);

  const renderNode = (node: NodeItem, visualDepth = 0): React.ReactNode => {
    if (searchQuery && !hasMatchingDescendant(node, searchQuery)) return null;

    const isExpanded = expanded.has(node.id);
    const hasChildren = !!node.children?.length;
    const isSelected = selected?.id === node.id;
    const isEditing = editingId === node.id;
    const isCreating = creatingInId === node.id;
    const canEditPermissions = (node.depth ?? 0) === 3 && node.id !== "root";

    return (
      <div key={node.id} className="select-none">
        <div
          className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 hover:translate-x-1 cursor-pointer relative overflow-hidden"
          style={{
            paddingLeft: visualDepth * 24 + 16,
            background: isSelected
              ? `linear-gradient(90deg, ${t.accentPrimary}15 0%, transparent 100%)`
              : isEditing
              ? t.soft
              : "transparent",
            borderLeft: isSelected ? `3px solid ${t.accentPrimary}` : "3px solid transparent",
          }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("[data-node-action]")) return;
            if (target.closest("input")) return;
            if (hasChildren) toggle(node.id);
            setSelected(node);
          }}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: `linear-gradient(90deg, ${t.accentPrimary}08 0%, transparent 100%)` }}
          />

          {hasChildren && (
            <div
              className="transition-transform duration-200"
              style={{ transform: isExpanded ? "rotate(90deg)" : "none", color: t.labelMuted }}
            >
              <ChevronRight className="h-4 w-4" />
            </div>
          )}

          <div className="relative">
            {node.type === "site" && (
              <div className="p-2 rounded-lg" style={{ background: t.gradientPrimary }}>
                <Building2 className="h-4 w-4" style={{ color: t.accentSecondary }} />
              </div>
            )}
            {node.type === "library" && (
              <div className="p-2 rounded-lg" style={{ background: `${t.accentPrimary}20` }}>
                <Database className="h-4 w-4" style={{ color: t.accentPrimary }} />
              </div>
            )}
            {(!node.type || node.type === "folder") && (
              <div
                className="p-2 rounded-lg transition-all duration-200"
                style={{ background: isExpanded ? `${t.accentPrimary}15` : t.soft }}
              >
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4" style={{ color: t.accentPrimary }} />
                ) : (
                  <Folder className="h-4 w-4" style={{ color: t.label }} />
                )}
              </div>
            )}
            {(node.restricted || node.highSecurity) && (
              <div
                className="absolute -top-1 -right-1 p-1 rounded-full"
                style={{
                  background: node.highSecurity ? t.danger : t.warning,
                  boxShadow: `0 0 10px ${(node.highSecurity ? t.danger : t.warning) + "50"}`,
                }}
              >
                {node.highSecurity ? (
                  <Shield className="h-2.5 w-2.5 text-white" />
                ) : (
                  <Lock className="h-2.5 w-2.5 text-white" />
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <input
              className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none transition-all"
              style={{
                background: t.card,
                border: `2px solid ${t.accentPrimary}`,
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
              className="font-medium text-sm flex-1 flex items-center gap-2"
              style={{ color: isSelected ? t.foreground : t.label }}
              onDoubleClick={() => node.id !== "root" && startRenaming(node)}
            >
              {node.name}
              {node.children && node.children.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: t.soft, color: t.labelMuted }}>
                  {node.children.length}
                </span>
              )}
            </span>
          )}

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.editGroups && node.editGroups.length > 0 && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                style={{ background: `${t.success}20`, color: t.success, border: `1px solid ${t.success}30` }}
              >
                <Edit className="h-3 w-3" />
                {node.editGroups.length}
              </div>
            )}
            {node.readGroups && node.readGroups.length > 0 && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                style={{ background: `${t.accentPrimary}20`, color: t.accentPrimary, border: `1px solid ${t.accentPrimary}30` }}
              >
                <Eye className="h-3 w-3" />
                {node.readGroups.length}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              data-node-action
              className="p-1.5 rounded-lg transition-all hover:scale-110"
              style={{ background: `${t.accentPrimary}15`, color: t.accentPrimary }}
              title="Ajouter un sous-dossier"
              onClick={() => startCreating(node.id === "root" ? null : node.id)}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            {node.id !== "root" && (
              <>
                <button
                  data-node-action
                  className="p-1.5 rounded-lg transition-all hover:scale-110"
                  style={{ background: t.soft, color: t.label }}
                  title="Renommer"
                  onClick={() => startRenaming(node)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  data-node-action
                  className="p-1.5 rounded-lg transition-all hover:scale-110"
                  style={{ background: `${t.danger}15`, color: t.danger }}
                  title="Supprimer"
                  onClick={() => deleteNode(node)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {(node.depth ?? 0) === 3 && (
                  <PermissionsButton node={node} onSave={(p) => updatePermissions(node, p)} theme={t} />
                )}
              </>
            )}
          </div>
        </div>

        {isCreating && (
          <div className="ml-2 mt-2 flex items-center gap-2" style={{ paddingLeft: (visualDepth + 1) * 24 + 16 }}>
            <div className="p-2 rounded-lg" style={{ background: `${t.accentPrimary}15` }}>
              <Folder className="h-4 w-4" style={{ color: t.accentPrimary }} />
            </div>
            <input
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-all"
              style={{ background: t.card, border: `2px solid ${t.accentPrimary}`, color: t.foreground }}
              placeholder="Nouveau dossier..."
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
        )}

        {isExpanded && hasChildren && (
          <div className="ml-2">{node.children?.map((c) => renderNode(c, visualDepth + 1))}</div>
        )}
      </div>
    );
  };

  // Global F2 handler
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" && selected && selected.id !== "root" && !editingId) {
        e.preventDefault();
        startRenaming(selected);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, editingId]);

  return (
    <div
      className="h-screen overflow-hidden font-sans"
      style={{
        background: themeMode === "dark" ? `linear-gradient(180deg, ${t.bg} 0%, #050507 100%)` : t.bg,
        color: t.foreground,
      }}
    >
      {themeMode === "dark" && (
        <div className="fixed inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: t.haloCyan }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: t.haloViolet }} />
        </div>
      )}

      <div className="h-full flex flex-col relative">
        {/* Header */}
        <div className="flex-shrink-0 border-b backdrop-blur-2xl relative overflow-hidden" style={{ borderColor: t.cardBorder }}>
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-30"
            style={{ background: `linear-gradient(to bottom right, ${t.haloCyan}, ${t.haloViolet})` }}
          />
          <div className="px-8 py-6 relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 rounded-2xl backdrop-blur-xl" style={{ background: t.gradientPrimary }}>
                  <Layers className="w-7 h-7" style={{ color: t.accentPrimary }} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight flex items-center gap-2" style={{ color: t.foreground }}>
                    Structure SharePoint
                    <Sparkles className="w-6 h-6" style={{ color: t.accentSecondary }} />
                  </h1>
                  <p className="text-sm mt-1" style={{ color: t.label }}>
                    Gestion avancée de l'arborescence et des permissions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: t.labelMuted }} />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 rounded-xl text-sm w-64 outline-none transition-all focus:w-80"
                    style={{ background: t.card, border: `1px solid ${t.cardBorder}`, color: t.foreground }}
                  />
                </div>
                <button
                  onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
                  className="p-2.5 rounded-xl transition-all hover:scale-110"
                  style={{ background: t.soft, border: `1px solid ${t.cardBorder}`, color: t.label }}
                  title="Changer le thème"
                >
                  {themeMode === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => startCreating("root")}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold hover:scale-105 transition-all duration-300 flex items-center gap-2"
                  style={{
                    color: "#000",
                    background: `linear-gradient(135deg, ${t.accentPrimary} 0%, ${t.accentSecondary} 100%)`,
                    boxShadow: `0 10px 30px ${t.accentPrimary}35`,
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Nouveau dossier
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" style={{ color: t.accentPrimary }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: t.labelMuted }}>Total</span>
                <span className="text-lg font-bold" style={{ color: t.foreground }}>{stats.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" style={{ color: t.warning }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: t.labelMuted }}>Restreints</span>
                <span className="text-lg font-bold" style={{ color: t.warning }}>{stats.restricted}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: t.danger }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: t.labelMuted }}>Haute sécurité</span>
                <span className="text-lg font-bold" style={{ color: t.danger }}>{stats.highSecurity}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: t.success }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: t.labelMuted }}>Avec permissions</span>
                <span className="text-lg font-bold" style={{ color: t.success }}>{stats.withPermissions}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto p-6">
            <PremiumCard className="h-full p-6" gradient hover={false} theme={t}>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ background: t.gradientPrimary }}>
                      <GitBranch className="h-5 w-5" style={{ color: t.accentPrimary }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold" style={{ color: t.foreground }}>Arborescence des dossiers</h2>
                      <p className="text-xs" style={{ color: t.labelMuted }}>
                        Double-cliquez ou F2 pour renommer • Niveau 3 pour permissions
                      </p>
                    </div>
                  </div>
                  {selected && selected.id !== "root" && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: t.soft, border: `1px solid ${t.cardBorder}` }}>
                      <FileText className="w-3.5 h-3.5" style={{ color: t.accentPrimary }} />
                      <span className="text-xs" style={{ color: t.label }}>{selected.path}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
                {tree.children?.map((c) => renderNode(c, 0))}
              </div>
            </PremiumCard>
          </div>

          {/* Right panel */}
          <div className="w-96 border-l backdrop-blur-xl p-6 overflow-y-auto" style={{ borderColor: t.cardBorder, background: `${t.card}50` }}>
            <div className="space-y-4">
              {selected && selected.id !== "root" && (
                <PremiumCard className="p-5" gradient theme={t}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl" style={{ background: t.gradientPrimary }}>
                      <Settings2 className="h-5 w-5" style={{ color: t.accentSecondary }} />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: t.foreground }}>
                      Détails du dossier
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <Row label="Nom" theme={t}><span className="font-medium" style={{ color: t.foreground }}>{selected.name}</span></Row>
                    <Row label="Type" theme={t}>
                      <span className="font-mono text-xs px-2 py-1 rounded-lg" style={{ background: t.accentPrimary + "20", color: t.accentPrimary }}>
                        {selected.type ?? "folder"}
                      </span>
                    </Row>
                    <Row label="Niveau" theme={t}><span className="font-bold text-lg" style={{ color: t.foreground }}>{selected.depth}</span></Row>
                    {selected.depth && selected.depth >= 3 && <PermissionsViewer node={selected} tree={tree} theme={t} />}
                  </div>
                </PremiumCard>
              )}

              <LegendCard theme={t} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children, theme }: { label: string; children: React.ReactNode; theme: Theme }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: theme.soft, border: `1px solid ${theme.cardBorder}` }}>
      <span className="text-xs uppercase tracking-wider" style={{ color: theme.labelMuted }}>{label}</span>
      {children}
    </div>
  );
}

function LegendCard({ theme }: { theme: Theme }) {
  return (
    <PremiumCard className="p-5" theme={theme}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl" style={{ background: theme.gradientPrimary }}>
          <Star className="h-5 w-5" style={{ color: theme.warning }} />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.foreground }}>Légende</h3>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: theme.soft }}>
          <Lock className="h-4 w-4" style={{ color: theme.warning }} />
          <span className="text-sm" style={{ color: theme.label }}>Accès restreint</span>
        </div>
        <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: theme.soft }}>
          <Shield className="h-4 w-4" style={{ color: theme.danger }} />
          <span className="text-sm" style={{ color: theme.label }}>Haute sécurité</span>
        </div>
        <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: theme.soft }}>
          <Edit className="h-4 w-4" style={{ color: theme.success }} />
          <span className="text-sm" style={{ color: theme.label }}>Permissions d'édition</span>
        </div>
        <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: theme.soft }}>
          <Eye className="h-4 w-4" style={{ color: theme.accentPrimary }} />
          <span className="text-sm" style={{ color: theme.label }}>Permissions de lecture</span>
        </div>
      </div>
    </PremiumCard>
  );
}

/* =============================================================================
   Permissions (read-only viewer + modal + button)
============================================================================= */
function PermissionsViewer({ node, tree, theme }: { node: NodeItem; tree: NodeItem; theme: Theme }) {
  const isInherited = (node.depth ?? 0) > 3;
  const parentWithPerms = isInherited ? findParentWithPermissions(tree, node) : null;
  const effective = isInherited && parentWithPerms ? parentWithPerms : node;

  const editGroups = effective.editGroups ?? [];
  const readGroups = effective.readGroups ?? [];
  const restricted = !!effective.restricted;
  const highSecurity = !!effective.highSecurity;

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: theme.soft, border: `1px solid ${theme.cardBorder}` }}>
      {isInherited && (
        <div className="text-xs rounded-lg px-3 py-1.5" style={{ background: `${theme.warning}20`, color: theme.warning, border: `1px solid ${theme.warning}30` }}>
          Permissions héritées{parentWithPerms ? ` de "${parentWithPerms.name}"` : ""}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wider mb-1" style={{ color: theme.labelMuted }}>Groupes (édition)</div>
        <div className="min-h-[32px] rounded-lg p-2" style={{ background: theme.card, border: `1px solid ${theme.cardBorder}` }}>
          {editGroups.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {editGroups.map((g) => (
                <span key={g} className="text-xs px-2 py-0.5 rounded" style={{ background: `${theme.success}20`, color: theme.success }}>
                  {g}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs" style={{ color: theme.labelMuted }}>(aucun)</div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wider mb-1" style={{ color: theme.labelMuted }}>Groupes (lecture)</div>
        <div className="min-h-[32px] rounded-lg p-2" style={{ background: theme.card, border: `1px solid ${theme.cardBorder}` }}>
          {readGroups.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {readGroups.map((g) => (
                <span key={g} className="text-xs px-2 py-0.5 rounded" style={{ background: `${theme.accentPrimary}20`, color: theme.accentPrimary }}>
                  {g}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs" style={{ color: theme.labelMuted }}>(aucun)</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <label className="flex items-center gap-2 text-xs" style={{ color: theme.label }}>
          <input type="checkbox" checked={restricted} readOnly disabled /> Accès restreint
        </label>
        <label className="flex items-center gap-2 text-xs" style={{ color: theme.label }}>
          <input type="checkbox" checked={highSecurity} readOnly disabled /> Haute sécurité
        </label>
      </div>
    </div>
  );
}

function PermissionsButton({ node, onSave, theme }: { node: NodeItem; onSave: (p: PermSpec) => void; theme: Theme }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        data-node-action
        className="p-1.5 rounded-lg transition-all hover:scale-110"
        style={{ background: `${theme.accentSecondary}15`, color: theme.accentSecondary }}
        title="Éditer permissions"
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
          theme={theme}
        />
      )}
    </>
  );
}

function PermissionModal({ initial, onClose, onSubmit, theme }: {
  initial,
  onClose,
  onSubmit,
  theme,
}: {
  initial: PermSpec; onClose: () => void; onSubmit: (p: PermSpec) => void; theme: Theme
}) {
  const [editGroups, setEditGroups] = React.useState<string[]>(
    initial?.editGroups && initial.editGroups.length > 0 ? initial.editGroups : [""]
  );
  const [readGroups, setReadGroups] = React.useState<string[]>(
    initial?.readGroups && initial.readGroups.length > 0 ? initial.readGroups : [""]
  );
  const [restricted, setRestricted] = React.useState(!!initial?.restricted);
  const [highSecurity, setHighSecurity] = React.useState(!!initial?.highSecurity);

  const optionsLeft = (currentIndex: number, pool: readonly string[], used: string[]) =>
    pool.filter((g) => !used.includes(g));

  const canAddEdit = editGroups.every((g) => g.trim()) && optionsLeft(-1, SECURITY_GROUPS, editGroups).length > 0;
  const canAddRead = readGroups.every((g) => g.trim()) && optionsLeft(-1, SECURITY_GROUPS, readGroups).length > 0;

  return (
    <div className="fixed inset-0 z-[70] backdrop-blur-sm flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto backdrop-blur-2xl"
        style={{ background: theme.card, border: `1px solid ${theme.cardBorder}` }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: theme.gradientPrimary }}>
                <Shield className="h-5 w-5" style={{ color: theme.accentSecondary }} />
              </div>
              <h3 className="text-lg font-bold" style={{ color: theme.foreground }}>Éditer les permissions (Niveau 3)</h3>
            </div>
            <button className="p-2 rounded-lg" style={{ background: theme.soft, color: theme.label }} onClick={onClose}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Edit groups */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: theme.label }}>Groupes (édition)</label>
                <button
                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: canAddEdit ? `${theme.success}20` : theme.soft,
                    color: canAddEdit ? theme.success : theme.labelMuted,
                    opacity: canAddEdit ? 1 : 0.6,
                    cursor: canAddEdit ? "pointer" : "not-allowed",
                  }}
                  onClick={() => canAddEdit && setEditGroups([...editGroups, ""])}
                  disabled={!canAddEdit}
                >
                  + Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {editGroups.map((group, index) => {
                  const used = editGroups.filter((g, i) => g && i !== index);
                  const available = optionsLeft(index, SECURITY_GROUPS, used);
                  return (
                    <div key={index} className="flex gap-2">
                      <select
                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ background: theme.soft, border: `1px solid ${theme.cardBorder}`, color: theme.foreground }}
                        value={group}
                        onChange={(e) => {
                          const next = [...editGroups];
                          next[index] = e.target.value;
                          setEditGroups(next);
                        }}
                      >
                        <option value="" disabled>Sélectionner un groupe</option>
                        {available.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      {editGroups.length > 1 && (
                        <button className="p-2 rounded-lg" style={{ background: `${theme.danger}20`, color: theme.danger }}
                          onClick={() => setEditGroups(editGroups.filter((_, i) => i !== index))}>
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Read groups */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: theme.label }}>Groupes (lecture)</label>
                <button
                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: canAddRead ? `${theme.accentPrimary}20` : theme.soft,
                    color: canAddRead ? theme.accentPrimary : theme.labelMuted,
                    opacity: canAddRead ? 1 : 0.6,
                    cursor: canAddRead ? "pointer" : "not-allowed",
                  }}
                  onClick={() => canAddRead && setReadGroups([...readGroups, ""])}
                  disabled={!canAddRead}
                >
                  + Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {readGroups.map((group, index) => {
                  const used = readGroups.filter((g, i) => g && i !== index);
                  const available = optionsLeft(index, SECURITY_GROUPS, used);
                  return (
                    <div key={index} className="flex gap-2">
                      <select
                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ background: theme.soft, border: `1px solid ${theme.cardBorder}`, color: theme.foreground }}
                        value={group}
                        onChange={(e) => {
                          const next = [...readGroups];
                          next[index] = e.target.value;
                          setReadGroups(next);
                        }}
                      >
                        <option value="" disabled>Sélectionner un groupe</option>
                        {available.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      {readGroups.length > 1 && (
                        <button className="p-2 rounded-lg" style={{ background: `${theme.danger}20`, color: theme.danger }}
                          onClick={() => setReadGroups(readGroups.filter((_, i) => i !== index))}>
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Flags */}
            <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: theme.soft }}>
              <label className="flex items-center gap-2 text-sm" style={{ color: theme.label }}>
                <input type="checkbox" checked={restricted} onChange={(e) => setRestricted(e.target.checked)} />
                Accès restreint
              </label>
              <label className="flex items-center gap-2 text-sm" style={{ color: theme.label }}>
                <input type="checkbox" checked={highSecurity} onChange={(e) => setHighSecurity(e.target.checked)} />
                Haute sécurité
              </label>
            </div>

            <div className="text-xs rounded-lg p-3" style={{ background: `${theme.accentPrimary}10`, color: theme.label, border: `1px solid ${theme.accentPrimary}20` }}>
              Ces permissions s'appliqueront à ce dossier et seront héritées par tous ses sous-dossiers.
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: theme.soft, color: theme.label, border: `1px solid ${theme.cardBorder}` }} onClick={onClose}>
              Annuler
            </button>
            <button
              className="px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
              style={{ color: "#000", background: `linear-gradient(135deg, ${theme.accentPrimary} 0%, ${theme.accentSecondary} 100%)` }}
              onClick={() =>
                onSubmit({
                  restricted,
                  highSecurity,
                  editGroups: editGroups.filter((g) => g.trim() !== "").length > 0 ? editGroups.filter((g) => g.trim() !== "") : null,
                  readGroups: readGroups.filter((g) => g.trim() !== "").length > 0 ? readGroups.filter((g) => g.trim() !== "") : null,
                })
              }
            >
              <Save className="h-4 w-4" />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
