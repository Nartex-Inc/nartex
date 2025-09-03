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
  // status determines row color
  status: ReturnStatus;
  standby?: boolean;
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
  },
  {
    id: "R6483",
    reportedAt: "2025-08-11",
    reporter: "autre",
    cause: "autre",
    expert: "MIKE ROCHE (54)",
    client: "—",
    status: "draft",
  },
];

/* =============================================================================
   Helper styles
============================================================================= */
function rowColor(status: ReturnStatus, isDark: boolean) {
  // Light colors follow your exact spec; dark get tasteful equivalents
  switch (status) {
    case "draft":
      return isDark
        ? "bg-neutral-800 text-white"
        : "bg-white text-slate-900";
    case "awaiting_physical":
      return isDark
        ? "bg-black text-white"
        : "bg-black text-white";
    case "received_or_no_physical":
      return isDark
        ? "bg-emerald-700 text-white"
        : "bg-emerald-500 text-white";
  }
}

function badge(
  text: string,
  variant:
    | "muted"
    | "blue"
    | "green"
    | "yellow"
    | "slate" = "muted"
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
  const onView = (id: string) => {
    // wire later to a drawer or /returns/[id]
    alert(`Consulter: ${id}`);
  };

  const onToggleStandby = (id: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, standby: !r.standby } : r
      )
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

  return (
    <div className="mx-auto w-full max-w-[1600px] xl:max-w-[1800px] py-8">
      {/* Title block */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Gestion des retours<span className="text-blue-600 dark:text-blue-400">.</span>
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
              <span className="text-xs text-slate-500 dark:text-slate-400">Cause du retour</span>
              <select
                value={cause}
                onChange={(e) => setCause(e.target.value as any)}
                className="rounded-xl border bg-white px-3 py-2 text-sm outline-none
                border-slate-200 text-slate-700 focus:border-blue-500
                dark:bg-neutral-950 dark:border-neutral-800 dark:text-white"
              >
                <option value="all">Toutes les causes</option>
                {(
                  ["production","transporteur","pompe","exposition_sinto","autre_cause","autre"] as Cause[]
                ).map((c) => (
                  <option key={c} value={c}>{CAUSE_LABEL[c]}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Signalé par</span>
              <select
                value={reporter}
                onChange={(e) => setReporter(e.target.value as any)}
                className="rounded-xl border bg-white px-3 py-2 text-sm outline-none
                border-slate-200 text-slate-700 focus:border-blue-500
                dark:bg-neutral-950 dark:border-neutral-800 dark:text-white"
              >
                <option value="all">Tous</option>
                {(["expert","transporteur","autre"] as Reporter[]).map((r) => (
                  <option key={r} value={r}>{REPORTER_LABEL[r]}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Du</span>
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
              <span className="text-xs text-slate-500 dark:text-slate-400">Au</span>
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
            Filtres {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* mobile filters */}
        {expanded && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">Cause</label>
              <select
                value={cause}
                onChange={(e) => setCause(e.target.value as any)}
                className="rounded-xl border bg-white px-3 py-2 text-sm outline-none
                border-slate-200 text-slate-700 focus:border-blue-500
                dark:bg-neutral-950 dark:border-neutral-800 dark:text-white"
              >
                <option value="all">Toutes les causes</option>
                {(
                  ["production","transporteur","pompe","exposition_sinto","autre_cause","autre"] as Cause[]
                ).map((c) => (
                  <option key={c} value={c}>{CAUSE_LABEL[c]}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">Signalé par</label>
              <select
                value={reporter}
                onChange={(e) => setReporter(e.target.value as any)}
                className="rounded-xl border bg-white px-3 py-2 text-sm outline-none
                border-slate-200 text-slate-700 focus:border-blue-500
                dark:bg-neutral-950 dark:border-neutral-800 dark:text-white"
              >
                <option value="all">Tous</option>
                {(["expert","transporteur","autre"] as Reporter[]).map((r) => (
                  <option key={r} value={r}>{REPORTER_LABEL[r]}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">Du</label>
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
              <label className="text-xs text-slate-500 dark:text-slate-400">Au</label>
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
        {/* Scroll area. Keep enough height for sticky header without overlap */}
        <div className="relative overflow-auto"
             style={{ maxHeight: "calc(100vh - 280px)" }}>
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
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className={cn(
                    rowColor(r.status, isDark),
                    // maintain contrast per-row
                    "border-b border-slate-200/60 dark:border-white/10"
                  )}
                >
                  <td className="px-4 py-3 font-medium">{r.id}</td>
                  <td className="px-4 py-3">
                    {new Date(r.reportedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {badge(REPORTER_LABEL[r.reporter], "blue")}
                  </td>
                  <td className="px-4 py-3">
                    {badge(CAUSE_LABEL[r.cause], "green")}
                  </td>
                  <td className="px-4 py-3">{r.expert}</td>
                  <td className="px-4 py-3">{r.client}</td>
                  <td className="px-4 py-3">{r.noClient ?? "—"}</td>
                  <td className="px-4 py-3">{r.noCommande ?? "—"}</td>
                  <td className="px-4 py-3">{r.tracking ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end items-center gap-2">
                      {/* Consulter */}
                      <button
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium
                        bg-white/90 text-slate-800 ring-1 ring-slate-200 hover:bg-white
                        dark:bg-white/10 dark:text-white dark:ring-white/10 dark:hover:bg-white/15"
                        onClick={() => onView(r.id)}
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
                        <span className="hidden sm:inline">{r.standby ? "Standby" : "Standby"}</span>
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
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"
                    colSpan={10}
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
    </div>
  );
}
