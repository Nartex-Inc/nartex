// src/app/dashboard/settings/team/page.tsx
"use client";

import * as React from "react";
import { Users, UserPlus, Mail, MoreVertical, Shield, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentAccent } from "@/components/accent-color-provider";

const TEAM_MEMBERS = [
  { id: 1, name: "Nicolas Labranche", email: "n.labranche@sinto.ca", role: "Administrateur", avatar: null, status: "active" },
  { id: 2, name: "Denis Drouin", email: "d.drouin@sinto.ca", role: "Gestionnaire", avatar: null, status: "active" },
  { id: 3, name: "Marie Tremblay", email: "m.tremblay@sinto.ca", role: "Ventes Exécutif", avatar: null, status: "active" },
  { id: 4, name: "Jean-Pierre Martin", email: "jp.martin@sinto.ca", role: "Expert", avatar: null, status: "pending" },
];

export default function TeamSettingsPage() {
  const { color: accentColor } = useCurrentAccent();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[hsl(var(--text-primary))]">
            Membres de l&apos;équipe
          </h2>
          <p className="text-[13px] text-[hsl(var(--text-muted))] mt-0.5">
            Gérez les membres de votre organisation
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
          style={{ background: accentColor }}
        >
          <UserPlus className="h-4 w-4" />
          Inviter
        </button>
      </div>

      {/* Team List */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "hsl(var(--bg-surface))",
          border: "1px solid hsl(var(--border-subtle))",
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: "hsl(var(--bg-muted))" }}>
              <th className="text-left px-6 py-3 text-[12px] font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider">
                Membre
              </th>
              <th className="text-left px-6 py-3 text-[12px] font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider">
                Rôle
              </th>
              <th className="text-left px-6 py-3 text-[12px] font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border-subtle))]">
            {TEAM_MEMBERS.map((member) => (
              <tr key={member.id} className="hover:bg-[hsl(var(--bg-muted))] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
                    >
                      {member.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[hsl(var(--text-primary))]">
                        {member.name}
                      </p>
                      <p className="text-[12px] text-[hsl(var(--text-muted))]">
                        {member.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[hsl(var(--text-muted))]" />
                    <span className="text-[13px] text-[hsl(var(--text-secondary))]">
                      {member.role}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-medium",
                      member.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {member.status === "active" ? "Actif" : "En attente"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="p-2 rounded-lg text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] transition-colors">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
