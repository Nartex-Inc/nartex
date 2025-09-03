// src/app/dashboard/admin/returns/page.tsx
"use client";

import * as React from "react";
import {
  Calendar,
  Filter,
  RefreshCcw,
  Search,
  ChevronDown,
  ChevronUp,
  FileDown,
  PackageOpen,
  Truck,
  Factory,
  Wrench,
} from "lucide-react";

/* =====================================================================================
   Types
===================================================================================== */

type Reporter = "expert" | "transporteur" | "autre";

type Cause =
  | "production"
  | "transporteur"
  | "pompe"
  | "autre_cause"
  | "exposition_sinto"
  | "autre"
  | "expert";

type ReturnRow = {
  code_retour: string; // e.g. "R6498"
  date_signalement: string; // ISO date
  reporter: Reporter;
  cause: Cause;
  expert: string; // "RICHARD TESSIER (046)"
  client: string; // "DISTRIBUTION RMM INC."
  no_client: string; // "EXP-046"
  no_commande: string; // "81716"
  no_tracking?: string | null;
  date_commande?: string | null; // ISO date or null
  transporter?: string | null;
  description?: string | null;
  poids_total?: number | null;
};

type SortKey =
  | "date_signalement"
  | "code_retour"
  | "reporter"
  | "cause"
  | "client"
  | "no_commande";

/* =====================================================================================
   Label Maps (strongly typed)
===================================================================================== */

const REPORTER_LABEL: Record<Reporter, string> = {
  expert: "Expert",
  transporteur: "Transporteur",
  autre: "Autre",
};

const CAUSE_LABEL = {
  production: "Production",
  transporteur: "Transporteur",
  pompe: "Pompe de transfert",
  autre_cause: "Autre cause",
  exposition_sinto: "Exposition Sinto",
  autre: "Autre",
  expert: "Expert",
} as const;

type CauseKey = keyof typeof CAUSE_LABEL;
type ReporterKey = keyof typeof REPORTER_LABEL;

/* =====================================================================================
   Dummy Data (you will replace with API later)
===================================================================================== */

const DUMMY_RETURNS: ReturnRow[] = [
  {
    code_retour: "R6498",
    date_signalement: "2025-09-02",
    reporter: "expert",
    cause: "production",
    expert: "DENIS LAVOIE (017)",
    client: "DISTRIBUTION RMM INC. (46)",
    no_client: "EXP-046",
    no_commande: "81724",
    no_tracking: "P77935962",
    date_commande: "2025-07-17",
    transporter: "DICOM-GLS (P)",
    description: "L’expert s’est trompé d’adresse de livraison.",
    poids_total: 24.96,
  },
  {
    code_retour: "R6494",
    date_signalement: "2025-08-28",
    reporter: "expert",
    cause: "pompe",
    expert: "ROBY LECLERC (023)",
    client: "REPRESENTATION R.L. INC.",
    no_client: "EXP-023",
    no_commande: "84048",
    no_tracking: null,
    date_commande: "2025-08-28",
    transporter: "EXPERT PICKUP PCC (C)",
    description: "Produit expédié en double.",
    poids_total: 12,
  },
  {
    code_retour: "R6491",
    date_signalement: "2025-08-26",
    reporter: "transporteur",
    cause: "transporteur",
    expert: "BUDDY FORD (020)",
    client: "GROUPE CIRTECH INC.",
    no_client: "2213400",
    no_commande: "81065",
    no_tracking: "P76860066",
    date_commande: "2025-07-10",
    transporter: "DICOM-GLS (P)",
    description: "Bouteilles ont coulé dans le transport.",
    poids_total: 0,
  },
  {
    code_retour: "R6492",
    date_signalement: "2025-08-27",
    reporter: "expert",
    cause: "production",
    expert: "ROXANE BOUFFARD (011)",
    client: "LES MECANOS D’HAM NORD",
    no_client: "3442109",
    no_commande: "82767",
    no_tracking: "P80976755",
    date_commande: "2025-08-12",
    transporter: "DICOM-GLS (P)",
    description: "16 bouteilles sur 8 ont coulé; elles étaient …",
    poids_total: 0,
  },
  {
    code_retour: "R6486",
    date_signalement: "2025-08-22",
    reporter: "expert",
    cause: "autre_cause",
    expert: "SYLVAIN ARVISAVIS (012)",
    client: "BIOMASSE DU LAC TAUREAU",
    no_client: "8700141",
    no_commande: "83381",
    no_tracking: "P82517515",
    date_commande: "2025-08-20",
    transporter: "DICOM-GLS (P)",
    description: "L’expert dit n’avoir jamais reçu ce refill d’huile.",
    poids_total: 0,
  },
  {
    code_retour: "R6483",
    date_signalement: "2025-08-12",
    reporter: "autre",
    cause: "autre",
    expert: "MIKE ROCHE (54)",
    client: "—",
    no_client: "—",
    no_commande: "—",
    no_tracking: null,
    date_commande: null,
    transporter: null,
    description: "Surplus inventaire",
    poids_total: 0,
  },
];

/* =====================================================================================
   Helpers
===================================================================================== */

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString();
}

/* =====================================================================================
   Page
===================================================================================== */

export default function ReturnsPage() {
  // Filters
  const [q, setQ] = React.useState("");
  const [cause, setCause] = React.useState<CauseKey | "all">("all");
  const [reporter, setReporter] = React.useState<ReporterKey | "all">("all");
  const [from, setFrom] = React.useState<string>("");
  const [to, setTo] = React.useState<string>("");

  // Sorting
  const [sortKey, setSortKey] = React.useState<SortKey>("date_signalement");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  // Open/close filters panel (mobile)
  const [openFilters, setOpenFilters] = React.useState(true);

  // Derived rows
  const rows = React.useMemo(() => {
    let r = [...DUMMY_RETURNS];

    // text query (simple multi-field search)
    const query = q.trim().toLowerCase();
    if (query) {
      r = r.filter((row) => {
        const hay =
          `${row.code_retour} ${row.expert} ${row.client} ${row.no_client} ${row.no_commande} ${row.no_tracking ?? ""} ${row.description ?? ""}`.toLowerCase();
        return hay.includes(query);
      });
    }

    if (cause !== "all") {
      r = r.filter((row) => row.cause === cause);
    }
    if (reporter !== "all") {
      r = r.filter((row) => row.reporter === reporter);
    }

    if (from) {
      const f = new Date(from).getTime();
      r = r.filter((row) => new Date(row.date_signalement).getTime() >= f);
    }
    if (to) {
      const t = new Date(to).getTime();
      r = r.filter((row) => new Date(row.date_signalement).getTime() <= t);
    }

    // sort
    r.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "date_signalement":
          av = new Date(a.date_signalement).getTime();
          bv = new Date(b.date_signalement).getTime();
          break;
        case "code_retour":
          av = a.code_retour;
          bv = b.code_retour;
          break;
        case "reporter":
          av = a.reporter;
          bv = b.reporter;
          break;
        case "cause":
          av = a.cause;
          bv = b.cause;
          break;
        case "client":
          av = a.client;
          bv = b.client;
          break;
        case "no_commande":
          av = a.no_commande;
          bv = b.no_commande;
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return r;
  }, [q, cause, reporter, from, to, sortKey, sortDir]);

  const setSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const resetFilters = () => {
    setQ("");
    setCause("all");
    setReporter("all");
    setFrom("");
    setTo("");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#050507] dark:text-white">
      {/* Header */}
      <div className="sticky top-16 z-20 border-b border-slate-200/80 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/60">
        <div className="mx-auto max-w-[1600px] px-3 sm:px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Gestion des retours
                <span className="text-blue-600 dark:text-blue-400">.</span>
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Recherchez, filtrez et inspectez les retours. (Données
                factices.)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white"
                onClick={() => window.alert("Export CSV – à brancher plus tard")}
              >
                <FileDown className="h-4 w-4" />
                Exporter
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white"
                onClick={resetFilters}
              >
                <RefreshCcw className="h-4 w-4" />
                Réinitialiser
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="mt-4 grid gap-3 md:grid-cols-12">
            {/* Search */}
            <div className="md:col-span-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher un retour, client, expert, commande, tracking…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 hover:bg-slate-50 focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Filters toggle (mobile) */}
            <div className="md:hidden">
              <button
                onClick={() => setOpenFilters((v) => !v)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white"
              >
                <Filter className="h-4 w-4" />
                Filtres
                {openFilters ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Filters */}
            <div
              className={cx(
                "md:col-span-7 grid gap-3 md:grid-cols-7",
                openFilters ? "block" : "hidden md:grid"
              )}
            >
              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Cause du retour
                </label>
                <select
                  value={cause}
                  onChange={(e) => setCause(e.target.value as CauseKey | "all")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="all">Toutes les causes</option>
                  {(Object.keys(CAUSE_LABEL) as CauseKey[]).map((k) => (
                    <option key={k} value={k}>
                      {CAUSE_LABEL[k]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Signalé par
                </label>
                <select
                  value={reporter}
                  onChange={(e) =>
                    setReporter(e.target.value as ReporterKey | "all")
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="all">Tous</option>
                  {(Object.keys(REPORTER_LABEL) as ReporterKey[]).map((k) => (
                    <option key={k} value={k}>
                      {REPORTER_LABEL[k]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1">
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Du
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>

              <div className="md:col-span-1">
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Au
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1600px] px-3 sm:px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-[calc(4rem+56px)] z-[1] bg-slate-50 text-slate-600 dark:bg-neutral-800 dark:text-slate-300">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
                  <th className="w-28">
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => setSort("code_retour")}
                    >
                      Code
                      <SortIcon active={sortKey === "code_retour"} dir={sortDir} />
                    </button>
                  </th>
                  <th className="w-36">
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => setSort("date_signalement")}
                    >
                      Date signalement
                      <SortIcon
                        active={sortKey === "date_signalement"}
                        dir={sortDir}
                      />
                    </button>
                  </th>
                  <th className="w-36">Signalé par</th>
                  <th className="w-44">Cause</th>
                  <th className="min-w-[220px]">Expert</th>
                  <th className="min-w-[260px]">Client</th>
                  <th className="w-24">No client</th>
                  <th className="w-28">
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => setSort("no_commande")}
                    >
                      No commande
                      <SortIcon
                        active={sortKey === "no_commande"}
                        dir={sortDir}
                      />
                    </button>
                  </th>
                  <th className="w-40">No tracking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {rows.map((r) => {
                  const causeKey: CauseKey = r.cause as CauseKey;
                  return (
                    <tr
                      key={r.code_retour}
                      className="hover:bg-slate-50/60 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-3 font-medium">{r.code_retour}</td>
                      <td className="px-4 py-3">{formatDate(r.date_signalement)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            r.reporter === "expert"
                              ? "indigo"
                              : r.reporter === "transporteur"
                              ? "sky"
                              : "slate"
                          }
                        >
                          {REPORTER_LABEL[r.reporter]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CauseIcon cause={causeKey} />
                          <Badge
                            tone={
                              causeKey === "production"
                                ? "emerald"
                                : causeKey === "transporteur"
                                ? "sky"
                                : causeKey === "pompe"
                                ? "amber"
                                : causeKey === "exposition_sinto"
                                ? "violet"
                                : "slate"
                            }
                          >
                            {CAUSE_LABEL[causeKey]}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.expert}</td>
                      <td className="px-4 py-3">{r.client}</td>
                      <td className="px-4 py-3">{r.no_client}</td>
                      <td className="px-4 py-3">{r.no_commande}</td>
                      <td className="px-4 py-3">{r.no_tracking ?? "—"}</td>
                    </tr>
                  );
                })}

                {!rows.length && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      Aucun résultat ne correspond à vos filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer info */}
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
            <div>{rows.length} retour(s)</div>
            <div>Interface fictive — brancher à PostgreSQL / API plus tard.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================================
   Small UI bits
===================================================================================== */

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <span
      className={cx(
        "inline-block h-4 w-4 text-slate-300 dark:text-slate-500",
        active && "text-slate-500 dark:text-slate-300"
      )}
      aria-hidden
    >
      {dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

function Badge({
  tone = "slate",
  children,
}: {
  tone?: "slate" | "emerald" | "sky" | "indigo" | "amber" | "violet";
  children: React.ReactNode;
}) {
  const toneMap: Record<
    NonNullable<Parameters<typeof Badge>[0]["tone"]>,
    { bg: string; text: string; ring: string }
  > = {
    slate: {
      bg: "bg-slate-100 dark:bg-white/10",
      text: "text-slate-700 dark:text-slate-200",
      ring: "ring-slate-200/60 dark:ring-white/10",
    },
    emerald: {
      bg: "bg-emerald-100/70 dark:bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-300",
      ring: "ring-emerald-200/70 dark:ring-emerald-400/20",
    },
    sky: {
      bg: "bg-sky-100/70 dark:bg-sky-500/10",
      text: "text-sky-700 dark:text-sky-300",
      ring: "ring-sky-200/70 dark:ring-sky-400/20",
    },
    indigo: {
      bg: "bg-indigo-100/70 dark:bg-indigo-500/10",
      text: "text-indigo-700 dark:text-indigo-300",
      ring: "ring-indigo-200/70 dark:ring-indigo-400/20",
    },
    amber: {
      bg: "bg-amber-100/70 dark:bg-amber-500/10",
      text: "text-amber-800 dark:text-amber-300",
      ring: "ring-amber-200/70 dark:ring-amber-400/20",
    },
    violet: {
      bg: "bg-violet-100/70 dark:bg-violet-500/10",
      text: "text-violet-700 dark:text-violet-300",
      ring: "ring-violet-200/70 dark:ring-violet-400/20",
    },
  };

  const t = toneMap[tone];
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
        t.bg,
        t.text,
        t.ring
      )}
    >
      {children}
    </span>
  );
}

function CauseIcon({ cause }: { cause: CauseKey }) {
  if (cause === "production") return <Factory className="h-4 w-4 text-emerald-500" />;
  if (cause === "transporteur") return <Truck className="h-4 w-4 text-sky-500" />;
  if (cause === "pompe") return <Wrench className="h-4 w-4 text-amber-500" />;
  if (cause === "exposition_sinto")
    return <PackageOpen className="h-4 w-4 text-violet-500" />;
  return <PackageOpen className="h-4 w-4 text-slate-400" />;
}
