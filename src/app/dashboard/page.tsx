// app/dashboard/page.tsx
"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";

type Rep = {
  id: number;
  code?: string;
  name: string;
  city?: string;
  isActive?: boolean;
};

const fetcher = async (url: string) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 10_000);

  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: c.signal,
  }).finally(() => clearTimeout(t));

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${
        body ? ` – ${body.slice(0, 300)}` : ""
      }`
    );
  }
  return res.json();
};

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR<Rep[]>("/api/sales-reps", fetcher);

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [asc, setAsc] = useState(true);

  const rows = useMemo(() => {
    const src = Array.isArray(data) ? data : [];
    const filtered = src.filter((r) => {
      const hay =
        `${r.name ?? ""} ${r.code ?? ""} ${r.city ?? ""}`.toLowerCase();
      const passText = hay.includes(q.toLowerCase().trim());
      const passActive = !onlyActive || !!r.isActive;
      return passText && passActive;
    });
    return filtered.sort((a, b) =>
      asc
        ? (a.name || "").localeCompare(b.name || "")
        : (b.name || "").localeCompare(a.name || "")
    );
  }, [data, q, onlyActive, asc]);

  if (error)
    return (
      <main className="px-6 py-10">
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          Erreur: {String(error.message || error)}
        </p>
      </main>
    );

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {/* Page heading */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Représentants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Liste des représentants commerciaux (extraits de PostgreSQL).
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {rows?.length ?? 0} résultat{(rows?.length ?? 0) > 1 ? "s" : ""}
        </span>
      </div>

      {/* Card */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(16,18,27,0.66)] shadow-xl ring-1 ring-white/10 backdrop-blur">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (nom, code, ville)…"
              className="w-full rounded-xl border border-white/10 bg-neutral-900/60 px-10 py-2.5 text-sm outline-none ring-0 placeholder:text-neutral-400 focus:border-indigo-500/40 focus:outline-none"
            />
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.65 10.5a6.15 6.15 0 11-12.3 0 6.15 6.15 0 0112.3 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyActive((v) => !v)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                onlyActive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
                  : "border-white/10 bg-neutral-900/50 text-neutral-300 hover:border-white/20"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  onlyActive ? "bg-emerald-400" : "bg-neutral-500"
                )}
              />
              Actifs uniquement
            </button>

            <button
              onClick={() => setAsc((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900/50 px-3 py-2 text-sm text-neutral-300 hover:border-white/20"
            >
              Trier par nom
              <svg
                className={cn("h-4 w-4 transition", asc ? "rotate-0" : "rotate-180")}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-t border-white/10 text-sm">
            <thead className="sticky top-0 z-10 bg-neutral-900/60 backdrop-blur">
              <tr className="text-left text-neutral-300">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Ville</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(isLoading ? Array.from({ length: 8 }) : rows).map((r, idx) => (
                <tr key={r?.id ?? idx} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-neutral-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/15 ring-1 ring-indigo-400/30">
                        <span className="text-xs font-semibold text-indigo-300">
                          {(r?.name ?? "—").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="leading-tight">
                        <div className="font-medium text-neutral-100">{r?.name ?? "—"}</div>
                        {r?.code ? (
                          <div className="text-xs text-neutral-400">Code: {r.code}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-200">{r?.code ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-300">{r?.city ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
                        r?.isActive
                          ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
                          : "bg-rose-500/10 text-rose-300 ring-rose-500/30"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          r?.isActive ? "bg-emerald-400" : "bg-rose-400"
                        )}
                      />
                      {r?.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                </tr>
              ))}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                    Aucun résultat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
