// src/app/dashboard/admin/returns/page.tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Search,
  Eye,
  Trash2,
  Armchair,
  Filter,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronUp,
  Folder as FolderIcon,
  Plus,
  X,
  Save,
  CheckCircle2,
  UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* =============================================================================
   Types & constants
============================================================================= */
type Reporter = "expert" | "transporteur" | "autre";
type Cause =
  | "production"
  | "pompe"
  | "autre_cause"
  | "exposition_sinto"
  | "transporteur"
  | "autre";

type ReturnStatus =
  | "draft" // white row
  | "awaiting_physical" // black row
  | "received_or_no_physical"; // green row

type Attachment = {
  id: string;
  name: string;
  url: string; // pdf/images for iframe
};

type ProductLine = {
  id: string;
  codeProduit: string;
  descriptionProduit: string;
  descriptionRetour?: string;
  quantite: number;
};

type ReturnRow = {
  id: string; // e.g. R6492
  reportedAt: string; // ISO date
  reporter: Reporter;
  cause: Cause;
  expert: string;
  client: string;
  noClient?: string;
  noCommande?: string;
  tracking?: string;
  status: ReturnStatus;
  standby?: boolean;
  // detail fields for modal
  amount?: number | null;
  dateCommande?: string | null; // ISO date
  transport?: string | null;
  attachments?: Attachment[];
  products?: ProductLine[];
  description?: string;
  createdBy?: { name: string; avatar?: string | null; at: string }; // stamp
};

const REPORTER_LABEL: Record<Reporter, string> = {
  expert: "Expert",
  transporteur: "Transporteur",
  autre: "Autre",
};

const CAUSE_LABEL: Record<Cause, string> = {
  production: "Production",
  pompe: "Pompe",
  autre_cause: "Autre cause",
  exposition_sinto: "Exposition Sinto",
  transporteur: "Transporteur",
  autre: "Autre",
};

const CAUSES_IN_ORDER: Cause[] = [
  "production",
  "transporteur",
  "pompe",
  "exposition_sinto",
  "autre_cause",
  "autre",
];

/* =============================================================================
   Dummy dataset (replace later with a server loader)
============================================================================= */
const DUMMY: ReturnRow[] = [
  {
    id: "R6498",
    reportedAt: "2025-09-01",
    reporter: "expert",
    cause: "production",
    expert: "DENIS LAVOIE (017)",
    client: "DISTRIBUTION RMM INC. (46)",
    noClient: "EXP-046",
    noCommande: "81724",
    tracking: "P77935962",
    status: "received_or_no_physical",
    amount: 0.0,
    dateCommande: "2025-09-01",
    transport: "DICOM-GLS (P)",
    attachments: [
      {
        id: "a1",
        name: "Facture 81724.pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    products: [
      {
        id: "p1",
        codeProduit: "IP200",
        descriptionProduit: "PERFORMA: HUILE 2 TEMPS SYN 200ML",
        descriptionRetour: "BOUTEILLE VIDE",
        quantite: 1,
      },
    ],
    description:
      "Client a reçu une bouteille vide. Interaction avec support documentée dans le ticket #12345.",
    createdBy: {
      name: "Roxane Bouffard",
      avatar: null,
      at: "2025-09-01T10:31:00-04:00",
    },
  },
  {
    id: "R6492",
    reportedAt: "2025-08-26",
    reporter: "expert",
    cause: "production",
    expert: "ROXANE BOUFFARD (011)",
    client: "LES MECANOS D'HAM NORD",
    noClient: "3442109",
    noCommande: "82767",
    tracking: "P80976755",
    status: "awaiting_physical",
    attachments: [],
    products: [],
    createdBy: { name: "Suzie Boutin", avatar: null, at: "2025-08-26T10:31:00-04:00" },
  },
  {
    id: "R6491",
    reportedAt: "2025-08-25",
    reporter: "transporteur",
    cause: "transporteur",
    expert: "BUDDY FORD (020)",
    client: "GROUPE CIRTECH INC.",
    noClient: "2213400",
    noCommande: "81065",
    tracking: "P76860066",
    status: "awaiting_physical",
    attachments: [
      {
        id: "a2",
        name: "BOL 81065.pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    products: [],
    createdBy: { name: "Hugo Fortin", avatar: null, at: "2025-08-25T09:47:00-04:00" },
  },
  {
    id: "R6486",
    reportedAt: "2025-08-22",
    reporter: "expert",
    cause: "autre_cause",
    expert: "SYLVAIN ARVISAVIS (012)",
    client: "BIOMASSE DU LAC TAUREAU",
    noClient: "8700141",
    noCommande: "83381",
    tracking: "P82517515",
    status: "received_or_no_physical",
    attachments: [],
    products: [],
    createdBy: { name: "Anick Poulin", avatar: null, at: "2025-08-22T11:37:00-04:00" },
  },
  {
    id: "R6483",
    reportedAt: "2025-08-11",
    reporter: "autre",
    cause: "autre",
    expert: "MIKE ROCHE (54)",
    client: "—",
    status: "draft",
    attachments: [],
    products: [],
    createdBy: { name: "Nicolas Labranches", avatar: null, at: "2025-08-11T13:05:00-04:00" },
  },
];

/* =============================================================================
   Helper styles
============================================================================= */
function rowColor(status: ReturnStatus, isDark: boolean) {
  // Light follows your spec; dark gets equivalents
  switch (status) {
    case "draft":
      return isDark ? "bg-neutral-800 text-white" : "bg-white text-slate-900";
    case "awaiting_physical":
      return "bg-black text-white";
    case "received_or_no_physical":
      return isDark ? "bg-emerald-700 text-white" : "bg-emerald-500 text-white";
  }
}

function pill(
  text: string,
  variant: "muted" | "blue" | "green" | "yellow" | "slate" = "muted"
) {
  const base =
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium";
  const map = {
    muted:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-white dark:border-white/10",
    blue:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/20",
    green:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/20",
    yellow:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/20",
    slate:
      "bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-500/20 dark:text-slate-200 dark:border-slate-600/30",
  } as const;
  return <span className={cn(base, map[variant])}>{text}</span>;
}

/* =============================================================================
   Page
============================================================================= */
export default function ReturnsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // local UI state
  const [query, setQuery] = React.useState("");
  const [cause, setCause] = React.useState<"all" | Cause>("all");
  const [reporter, setReporter] = React.useState<"all" | Reporter>("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [expanded, setExpanded] = React.useState(true);
  const [rows, setRows] = React.useState<ReturnRow[]>(DUMMY);

  // detail modal
  const [openId, setOpenId] = React.useState<string | null>(null);
  const selected = React.useMemo(
    () => rows.find((r) => r.id === openId) ?? null,
    [rows, openId]
  );

  // filter
  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      if (cause !== "all" && r.cause !== cause) return false;
      if (reporter !== "all" && r.reporter !== reporter) return false;
      if (dateFrom && r.reportedAt < dateFrom) return false;
      if (dateTo && r.reportedAt > dateTo) return false;

      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = [
          r.id,
          r.client,
          r.expert,
          r.noClient,
          r.noCommande,
          r.tracking,
          REPORTER_LABEL[r.reporter],
          CAUSE_LABEL[r.cause],
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, cause, reporter, dateFrom, dateTo, query]);

  // actions
  const onToggleStandby = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, standby: !r.standby } : r))
    );
  };

  const onDelete = (id: string) => {
    if (!confirm(`Supprimer le retour ${id} ?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const onReset = () => {
    setQuery("");
    setCause("all");
    setReporter("all");
    setDateFrom("");
    setDateTo("");
  };

  const updateSelected = (patch: Partial<ReturnRow>) => {
    if (!selected) return;
    setRows((prev) =>
      prev.map((r) => (r.id === selected.id ? { ...r, ...patch } : r))
    );
  };

  const addProduct = () => {
    if (!selected) return;
    const next: ProductLine = {
      id: `np-${Date.now()}`,
      codeProduit: "",
      descriptionProduit: "",
      descriptionRetour: "",
      quantite: 1,
    };
    updateSelected({
      products: [...(selected.products ?? []), next],
    });
  };

  const removeProduct = (pid: string) => {
    if (!selected) return;
    updateSelected({
      products: (selected.products ?? []).filter((p) => p.id !== pid),
    });
  };

  const changeProduct = (pid: string, patch: Partial<ProductLine>) => {
    if (!selected) return;
    updateSelected({
      products: (selected.products ?? []).map((p) =>
        p.id === pid ? { ...p, ...patch } : p
      ),
    });
  };

  const saveDraft = () => {
    updateSelected({ status: "draft" });
    alert("Brouillon enregistré (fictif).");
  };

  const sendForApproval = () => {
    // move to green by default for demo
    updateSelected({ status: "received_or_no_physical" });
    alert("Envoyé pour approbation (fictif).");
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] xl:max-w-[1800px] py-8">
      {/* Title block */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Gestion des retours
          <span className="text-blue-600 dark:text-blue-400">.</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Recherchez, filtrez et inspectez les retours. (Données factices.)
        </p>
      </div>

      {/* Controls Card */}
      <div
        className={cn(
          "rounded-2xl border p-4 sm:p-5 mb-4",
          "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-slate-200",
          "dark:bg-neutral-900/80 dark:border-neutral-800"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un retour, client, expert, commande, tracking…"
                className="w-full rounded-xl border bg-white px-9 py-2 text-sm outline-none
                border-slate-200 text-slate-700 placeholder:text-slate-400
                focus:border-blue-500
                dark:bg-neutral-950 dark:border-neutral-800 dark:text-white"
              />
            </div>
          </div>

          {/* filters */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Cause du retour
              </span>
              <select
                value={cause}
                onChange={(e) => setCause(e.target.value as Cause | "all")}
                className="rounded-xl border bg-white px-3 py-2 text-sm outline-none
                border-slate-200 text-slate-700 focus:border-blue-500
                dark:bg-neutral-950 dark:border-neutral-800 dark:text-white"
              >
                <option value="all">Toutes les causes</option>
                {CAUSES_IN_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CAUSE_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Signalé par
              </span>
              <select
                value={reporter}
                onChange={(e) =>
                  setReporter(e.target.value as Reporter | "all")
                }
                className="rounded-xl border bg-white px-3 py-2 text-sm outline-none
                border-slate-200 text-slate-700 focus:border-blue-500
                dark:bg-neutral-950 dark:border-neutral-800 dark:text-white"
              >
                <option value="all">Tous</option>
                {(["expert", "transporteur", "autre"] as Reporter[]).map(
                  (r) => (
                    <option key={r} value={r}>
                      {REPORTER_LABEL[r]}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Du
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border bg-white px-3 py-2 text-sm outline-none
                border-slate-200 text-slate-700 focus:border-blue-500
                dark:bg-neutral-950 dark:border-neutral-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Au
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border bg-white px-3 py-2 text-sm outline-none
                border-slate-200 text-slate-700 focus:border-blue-500
                dark:bg-neutral-950 dark:border-neutral-800 dark:text-white"
              />
            </div>
          </div>

          {/* actions */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium
              border-slate-200 bg-white hover:bg-slate-50
              dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
              onClick={() => alert("Exporter (à brancher)")}
            >
              <Download className="h-4 w-4" />
              Exporter
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium
              border-slate-200 bg-white hover:bg-slate-50
              dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
              onClick={onReset}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </button>
          </div>

          {/* collapse for small screens */}
          <button
            className="ml-3 inline-flex lg:hidden items-center gap-2 rounded-xl border px-3 py-2 text-sm
            border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
            onClick={() => setExpanded((v) => !v)}
          >
            <Filter className="h-4 w-4" />
            Filtres{" "}
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* mobile filters */}
        {expanded && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Cause
              </label>
              <select
                value={cause}
                onChange={(e) => setCause(e.target.value as Cause | "all")}
                className="rounded-xl border bg-white px-3 py-2 text-sm outline-none
                border-slate-200 text-slate-700 focus:border-blue-500
                dark:bg-neutral-950 dark:border-neutral-800 dark:text-white"
              >
                <option value="all">Toutes les causes</option>
                {CAUSES_IN_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CAUSE_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Signalé par
              </label>
              <select
                value={reporter}
                onChange={(e) =>
                  setReporter(e.target.value as Reporter | "all")
                }
                className="rounded-xl border bg-white px-3 py-2 text-sm outline-none
                border-slate-200 text-slate-700 focus:border-blue-500
                dark:bg-neutral-950 dark:border-neutral-800 dark:text-white"
              >
                <option value="all">Tous</option>
                {(["expert", "transporteur", "autre"] as Reporter[]).map(
                  (r) => (
                    <option key={r} value={r}>
                      {REPORTER_LABEL[r]}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Du
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border bg-white px-3 py-2 text-sm outline-none
                border-slate-200 text-slate-700 focus:border-blue-500
                dark:bg-neutral-950 dark:border-neutral-800 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Au
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border bg-white px-3 py-2 text-sm outline-none
                border-slate-200 text-slate-700 focus:border-blue-500
                dark:bg-neutral-950 dark:border-neutral-800 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table Card */}
      <div
        className={cn(
          "rounded-2xl border overflow-hidden",
          "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-slate-200",
          "dark:bg-neutral-900/70 dark:border-neutral-800"
        )}
      >
        {/* Scroll area. Room for sticky header without overlap */}
        <div
          className="relative overflow-auto"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr
                className={cn(
                  "text-left text-[11px] uppercase tracking-wider",
                  "bg-slate-50/95 backdrop-blur border-b border-slate-200",
                  "dark:bg-neutral-950/70 dark:border-neutral-800"
                )}
              >
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Date signalement</th>
                <th className="px-4 py-3">Signalé par</th>
                <th className="px-4 py-3">Cause</th>
                <th className="px-4 py-3">Expert</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">No client</th>
                <th className="px-4 py-3">No commande</th>
                <th className="px-4 py-3">No tracking</th>
                <th className="px-4 py-3">P.J.</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const hasFiles = (r.attachments?.length ?? 0) > 0;
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      rowColor(r.status, isDark),
                      // taller rows + divider
                      "border-b border-slate-200/60 dark:border-white/10"
                    )}
                  >
                    <td className="px-4 py-4 font-medium">{r.id}</td>
                    <td className="px-4 py-4">
                      {new Date(r.reportedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      {pill(REPORTER_LABEL[r.reporter], "blue")}
                    </td>
                    <td className="px-4 py-4">{pill(CAUSE_LABEL[r.cause], "green")}</td>
                    <td className="px-4 py-4">{r.expert}</td>
                    <td className="px-4 py-4">{r.client}</td>
                    <td className="px-4 py-4">{r.noClient ?? "—"}</td>
                    <td className="px-4 py-4">{r.noCommande ?? "—"}</td>
                    <td className="px-4 py-4">{r.tracking ?? "—"}</td>
                    <td className="px-4 py-4">
                      {hasFiles ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-white dark:ring-white/10"
                          title={`${r.attachments!.length} pièce(s) jointe(s)`}
                        >
                          <FolderIcon className="h-4 w-4" />
                          {r.attachments!.length}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end items-center gap-2">
                        {/* Consulter */}
                        <button
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium
                          bg-white/90 text-slate-800 ring-1 ring-slate-200 hover:bg-white
                          dark:bg-white/10 dark:text-white dark:ring-white/10 dark:hover:bg-white/15"
                          onClick={() => setOpenId(r.id)}
                          title="Consulter"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">Consulter</span>
                        </button>

                        {/* Standby toggle */}
                        <button
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ring-1",
                            r.standby
                              ? "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/20"
                              : "bg-white/90 text-slate-800 ring-slate-200 hover:bg-white dark:bg-white/10 dark:text-white dark:ring-white/10 dark:hover:bg-white/15"
                          )}
                          onClick={() => onToggleStandby(r.id)}
                          title={r.standby ? "Retirer du standby" : "Mettre en standby"}
                        >
                          <Armchair className="h-4 w-4" />
                          <span className="hidden sm:inline">Standby</span>
                        </button>

                        {/* Delete */}
                        <button
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium
                          bg-red-600 text-white hover:bg-red-700"
                          onClick={() => onDelete(r.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Supprimer</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"
                    colSpan={11}
                  >
                    Aucun retour ne correspond aux filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          className={cn(
            "flex items-center justify-between px-4 py-2 text-xs",
            "border-t border-slate-200 bg-slate-50/60",
            "dark:border-neutral-800 dark:bg-neutral-950/50"
          )}
        >
          <span className="text-slate-500 dark:text-slate-400">
            {filtered.length} retour(s)
          </span>
          <span className="text-slate-400 dark:text-slate-500">
            Interface fictive — brancher à PostgreSQL / API plus tard.
          </span>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <DetailModal
          row={selected}
          onClose={() => setOpenId(null)}
          onPatch={updateSelected}
          onAddProduct={addProduct}
          onRemoveProduct={removeProduct}
          onChangeProduct={changeProduct}
          onSaveDraft={saveDraft}
          onSendForApproval={sendForApproval}
        />
      )}
    </div>
  );
}

/* =============================================================================
   Detail Modal component (in-page)
============================================================================= */
function DetailModal({
  row,
  onClose,
  onPatch,
  onAddProduct,
  onRemoveProduct,
  onChangeProduct,
  onSaveDraft,
  onSendForApproval,
}: {
  row: ReturnRow;
  onClose: () => void;
  onPatch: (patch: Partial<ReturnRow>) => void;
  onAddProduct: () => void;
  onRemoveProduct: (pid: string) => void;
  onChangeProduct: (pid: string, patch: Partial<ProductLine>) => void;
  onSaveDraft: () => void;
  onSendForApproval: () => void;
}) {
  const hasFiles = (row.attachments?.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* panel */}
      <div className="relative z-[71] w-full max-w-6xl max-h-[90vh] overflow-auto rounded-2xl border bg-white text-slate-900 border-slate-200 dark:bg-neutral-950 dark:text-white dark:border-neutral-800">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-white/80 backdrop-blur border-slate-200 dark:bg-neutral-950/80 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold">
              Retour {row.id} — {CAUSE_LABEL[row.cause]}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Signalé le {new Date(row.reportedAt).toLocaleDateString()} par{" "}
              {REPORTER_LABEL[row.reporter]}
            </p>
          </div>
          <button
            className="inline-flex items-center gap-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            onClick={onClose}
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Stamp of approval / created info */}
          {row.createdBy && (
            <div className="rounded-xl border p-3 flex items-center gap-3 border-slate-200 dark:border-neutral-800">
              {row.createdBy.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.createdBy.avatar}
                  alt={row.createdBy.name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <UserCircle2 className="h-8 w-8 text-slate-400" />
              )}
              <div className="text-sm">
                <div className="font-medium">{row.createdBy.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Créé le{" "}
                  {new Date(row.createdBy.at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>
              <div className="ml-auto">
                {pill(
                  row.status === "draft"
                    ? "Brouillon"
                    : row.status === "awaiting_physical"
                    ? "Attente retour physique"
                    : "Reçu / sans retour physique",
                  row.status === "draft"
                    ? "muted"
                    : row.status === "awaiting_physical"
                    ? "slate"
                    : "green"
                )}
              </div>
            </div>
          )}

          {/* Basic fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Expert"
              value={row.expert}
              onChange={(v) => onPatch({ expert: v })}
            />
            <Field
              label="Client"
              value={row.client}
              onChange={(v) => onPatch({ client: v })}
            />
            <Field
              label="No. client"
              value={row.noClient ?? ""}
              onChange={(v) => onPatch({ noClient: v || undefined })}
            />
            <Field
              label="No. commande"
              value={row.noCommande ?? ""}
              onChange={(v) => onPatch({ noCommande: v || undefined })}
            />
            <Field
              label="No. tracking"
              value={row.tracking ?? ""}
              onChange={(v) => onPatch({ tracking: v || undefined })}
            />
            <Field
              label="Transport"
              value={row.transport ?? ""}
              onChange={(v) => onPatch({ transport: v || null })}
            />
            <Field
              label="Montant"
              value={row.amount?.toString() ?? ""}
              onChange={(v) => onPatch({ amount: v ? Number(v) : null })}
            />
            <Field
              label="Date commande"
              type="date"
              value={row.dateCommande ?? ""}
              onChange={(v) => onPatch({ dateCommande: v || null })}
            />
            <Field
              label="Cause"
              as="select"
              value={row.cause}
              onChange={(v) => onPatch({ cause: v as Cause })}
              options={CAUSES_IN_ORDER.map((c) => ({
                value: c,
                label: CAUSE_LABEL[c],
              }))}
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FolderIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <h4 className="font-semibold">Fichiers joints</h4>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({row.attachments?.length ?? 0})
              </span>
            </div>
            {hasFiles ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {row.attachments!.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border overflow-hidden border-slate-200 dark:border-neutral-800"
                  >
                    <div className="px-3 py-2 text-sm border-b bg-slate-50/70 dark:bg-neutral-900 dark:border-neutral-800">
                      {a.name}
                    </div>
                    <iframe title={a.name} src={a.url} className="w-full h-72" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Aucune pièce jointe.
              </div>
            )}
          </div>

          {/* Products */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Produits (RMA)</h4>
              <button
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
                border-slate-200 bg-white hover:bg-slate-50
                dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                onClick={onAddProduct}
              >
                <Plus className="h-4 w-4" />
                Ajouter produit
              </button>
            </div>

            <div className="space-y-2">
              {(row.products ?? []).map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr_110px_40px] gap-2 items-center"
                >
                  <input
                    className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-neutral-800"
                    placeholder="Code de produit"
                    value={p.codeProduit}
                    onChange={(e) =>
                      onChangeProduct(p.id, { codeProduit: e.target.value })
                    }
                  />
                  <input
                    className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-neutral-800"
                    placeholder="Description du produit"
                    value={p.descriptionProduit}
                    onChange={(e) =>
                      onChangeProduct(p.id, {
                        descriptionProduit: e.target.value,
                      })
                    }
                  />
                  <input
                    className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-neutral-800"
                    placeholder="Description du retour"
                    value={p.descriptionRetour ?? ""}
                    onChange={(e) =>
                      onChangeProduct(p.id, {
                        descriptionRetour: e.target.value,
                      })
                    }
                  />
                  <input
                    type="number"
                    className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-neutral-800"
                    placeholder="Quantité"
                    min={0}
                    value={p.quantite}
                    onChange={(e) =>
                      onChangeProduct(p.id, {
                        quantite: Number(e.target.value || 0),
                      })
                    }
                  />
                  <button
                    className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                    onClick={() => onRemoveProduct(p.id)}
                    title="Retirer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {(row.products?.length ?? 0) === 0 && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Aucun produit. Ajoutez des lignes à l’aide du bouton ci-haut.
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="font-semibold">Description</h4>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-neutral-800"
              rows={4}
              placeholder="Notes internes, contexte, instructions…"
              value={row.description ?? ""}
              onChange={(e) => onPatch({ description: e.target.value })}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-t bg-white/80 backdrop-blur border-slate-200 dark:bg-neutral-950/80 dark:border-neutral-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Les changements sont locaux (demo). Connecter au backend
            PostgreSQL plus tard.
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
              border-slate-200 bg-white hover:bg-slate-50
              dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              onClick={onSaveDraft}
            >
              <Save className="h-4 w-4" />
              Enregistrer brouillon
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={onSendForApproval}
            >
              <CheckCircle2 className="h-4 w-4" />
              Envoyer pour approbation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   Small input helper
============================================================================= */
function Field({
  label,
  value,
  onChange,
  type = "text",
  as,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  as?: "select";
  options?: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      {as === "select" ? (
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-neutral-800"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          className="rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 dark:bg-neutral-950 dark:border-neutral-800"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
