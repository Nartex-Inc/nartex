"use client";

import * as React from "react";
import {
  Search,
  Filter,
  Calendar,
  RefreshCw,
  FileDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";

// -----------------------------
// Types & Dummy Data
// -----------------------------
type ReturnRow = {
  id: string;                 // e.g., "R6492"
  reportedAt: string;         // ISO date string "2025-08-27"
  reporter: "expert" | "transporteur" | "autre";
  cause:
    | "production"
    | "transporteur"
    | "pompe"
    | "autre_cause"
    | "exposition_sinto"
    | "autre";
  expert: string;             // "RICHARD TESSIER (046)"
  client: string;             // "LES MECANOS D'HAM NORD"
  clientNo: string;           // "3442109"
  orderNo: string;            // "82767"
  trackingNo?: string;        // optional tracking
  orderDate?: string;         // ISO date
  files?: number;             // number of attachments
  status: "brouillon" | "actif" | "finalise";
};

const DUMMY_RETURNS: ReturnRow[] = [
  {
    id: "R6493",
    reportedAt: "2025-08-27",
    reporter: "expert",
    cause: "expert" as any, // backwards compat with your legacy labels
    expert: "RICHARD TESSIER (046)",
    client: "DISTRIBUTION RMM INC. (46)",
    clientNo: "2213400",
    orderNo: "81065",
    trackingNo: "P76860066",
    orderDate: "2025-07-10",
    files: 2,
    status: "actif",
  },
  {
    id: "R6492",
    reportedAt: "2025-08-27",
    reporter: "expert",
    cause: "production",
    expert: "ROXANE BOUFFARD (011)",
    client: "LES MECANOS D'HAM NORD",
    clientNo: "3442109",
    orderNo: "82767",
    trackingNo: "P80976755",
    orderDate: "2025-08-12",
    files: 1,
    status: "finalise",
  },
  {
    id: "R6494",
    reportedAt: "2025-08-28",
    reporter: "expert",
    cause: "pompe",
    expert: "ROBY LECLERC (023)",
    client: "REPRESENTATION R.L. INC.",
    clientNo: "EXP-023",
    orderNo: "84048",
    trackingNo: undefined,
    orderDate: "2025-08-28",
    files: 0,
    status: "actif",
  },
  {
    id: "R6496",
    reportedAt: "2025-08-28",
    reporter: "autre",
    cause: "transporteur",
    expert: "RICHARD TESSIER (046)",
    client: "DISTRIBUTION RMM INC. (46)",
    clientNo: "EXP-046",
    orderNo: "80341",
    trackingNo: "P75312882",
    orderDate: "2025-06-27",
    files: 3,
    status: "actif",
  },
  {
    id: "R6499",
    reportedAt: "2025-09-02",
    reporter: "transporteur",
    cause: "transporteur",
    expert: "BUDDY FORD (020)",
    client: "GENERAL BEARING SERVICE INC (GBS)",
    clientNo: "3782856",
    orderNo: "82698",
    trackingNo: "P80952712",
    orderDate: "2025-08-11",
    files: 1,
    status: "actif",
  },
  // Add more rows if you want to test pagination
];

// Human labels for filters
const CAUSE_LABEL: Record<ReturnRow["cause"] | "expert", string> = {
  production: "Production",
  transporteur: "Transporteur",
  pompe: "Pompe",
  autre_cause: "Autre cause",
  exposition_sinto: "Exposition Sinto",
  autre: "Autre",
  // legacy
  expert: "Expert",
};

const REPORTER_LABEL: Record<ReturnRow["reporter"], string> = {
  expert: "Expert",
  transporteur: "Transporteur",
  autre: "Autre",
};

// -----------------------------
// Utilities
// -----------------------------
function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatDate(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

function toCSV(rows: ReturnRow[]) {
  const header = [
    "Code retour",
    "Date signalement",
    "Signalé par",
    "Cause",
    "Expert",
    "Client",
    "No. client",
    "No. commande",
    "No. tracking",
    "Date commande",
    "Fichiers",
    "Statut",
  ];
  const body = rows.map((r) => [
    r.id,
    r.reportedAt,
    REPORTER_LABEL[r.reporter],
    CAUSE_LABEL[(r.cause as any) || "autre"],
    r.expert,
    r.client,
    r.clientNo,
    r.orderNo,
    r.trackingNo ?? "",
    r.orderDate ?? "",
    String(r.files ?? 0),
    r.status,
  ]);

  return [header, ...body]
    .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

// -----------------------------
// Page
// -----------------------------
export default function ReturnsPage() {
  // Filters
  const [query, setQuery] = React.useState("");
  const [cause, setCause] = React.useState<string>("all");
  const [reporter, setReporter] = React.useState<string>("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");

  // Sorting (simple: by reportedAt desc by default)
  const [sortField, setSortField] = React.useState<keyof ReturnRow>("reportedAt");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = React.useState(1);
  const pageSize = 12;

  const filtered = React.useMemo(() => {
    let rows = [...DUMMY_RETURNS];

    // Search in several fields
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        [
          r.id,
          r.expert,
          r.client,
          r.clientNo,
          r.orderNo,
          r.trackingNo ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    if (cause !== "all") {
      rows = rows.filter((r) => String(r.cause) === cause);
    }
    if (reporter !== "all") {
      rows = rows.filter((r) => r.reporter === (reporter as ReturnRow["reporter"]));
    }

    if (dateFrom) {
      rows = rows.filter((r) => new Date(r.reportedAt) >= new Date(dateFrom));
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => new Date(r.reportedAt) <= end);
    }

    // Sort
    rows.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      let cmp = 0;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [query, cause, reporter, dateFrom, dateTo, sortField, sortDir]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  React.useEffect(() => {
    // reset to page 1 whenever filters change
    setPage(1);
  }, [query, cause, reporter, dateFrom, dateTo]);

  const exportCSV = () => {
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `returns_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setQuery("");
    setCause("all");
    setReporter("all");
    setDateFrom("");
    setDateTo("");
  };

  const statActive = filtered.filter((r) => r.status === "actif").length;
  const statFinal = filtered.filter((r) => r.status === "finalise").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestion des retours<span className="text-blue-600 dark:text-blue-500">.</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Recherchez, filtrez et exportez les retours. Données factices pour l’instant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Réinitialiser
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <CardTitle>Retours (affichés)</CardTitle>
          <div className="mt-2 text-2xl font-semibold">{total}</div>
        </Card>
        <Card className="p-4">
          <CardTitle>Actifs</CardTitle>
          <div className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">
            {statActive}
          </div>
        </Card>
        <Card className="p-4">
          <CardTitle>Finalisés</CardTitle>
          <div className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {statFinal}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 flex-1">
            {/* Search */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Recherche
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Code retour, expert, client, no commande, tracking…"
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
            </div>

            {/* Cause */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Cause du retour
              </label>
              <div className="relative">
                <Filter className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={cause}
                  onChange={(e) => setCause(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="all">Toutes les causes</option>
                  {Object.entries(CAUSE_LABEL).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reporter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Signalé par
              </label>
              <select
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="all">Tous</option>
                {Object.entries(REPORTER_LABEL).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Du
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Au
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sort */}
          <div className="grid grid-cols-2 gap-2 w-full lg:w-auto">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as keyof ReturnRow)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="reportedAt">Tri: Date de signalement</option>
              <option value="id">Tri: Code retour</option>
              <option value="client">Tri: Client</option>
              <option value="orderNo">Tri: No commande</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="desc">Descendant</option>
              <option value="asc">Ascendant</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5">
                {[
                  "Code retour",
                  "Date signalement",
                  "Signalé par",
                  "Cause",
                  "Expert",
                  "Client",
                  "No. client",
                  "No. commande",
                  "No. tracking",
                  "Date commande",
                  "Fichiers",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap border-b border-slate-200 dark:border-white/10">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.map((r) => (
                <tr
                  key={r.id}
                  className={classNames(
                    "text-sm border-b border-slate-100 dark:border-white/10",
                    r.status === "finalise" && "bg-emerald-50/60 dark:bg-emerald-500/5"
                  )}
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.id}</td>
                  <td className="px-4 py-3">{formatDate(r.reportedAt)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-white/10 dark:text-slate-300">
                      {REPORTER_LABEL[r.reporter]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={classNames(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                        r.cause === "production" && "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                        r.cause === "transporteur" && "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                        r.cause === "pompe" && "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
                        (r.cause as any) === "expert" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
                        r.cause !== "production" &&
                          r.cause !== "transporteur" &&
                          r.cause !== "pompe" &&
                          (r.cause as any) !== "expert" &&
                          "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                      )}
                    >
                      {CAUSE_LABEL[(r.cause as any) || "autre"]}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.expert}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.client}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.clientNo}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.orderNo}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.trackingNo ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.orderDate)}</td>
                  <td className="px-4 py-3">{r.files ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Consulter
                      </button>
                      <button className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                        <FolderOpen className="h-3.5 w-3.5" />
                        Fichiers
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {current.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Aucun retour ne correspond aux filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {total === 0 ? "0 résultat" : `${(page - 1) * pageSize + 1}–${Math.min(
              page * pageSize,
              total
            )} sur ${total}`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </button>
            <div className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
              Page {page} / {pageCount}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
