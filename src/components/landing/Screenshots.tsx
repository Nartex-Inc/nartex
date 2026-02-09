"use client";

import { MonitorSmartphone } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const screenshots = [
  {
    caption: "Tableau de bord — Vue complète de vos KPIs de ventes et rétention",
  },
  {
    caption: "Gestion des retours — Workflow de brouillon à finalisation",
  },
  {
    caption: "Cartographie clients — Visualisez vos clients sur la carte",
  },
];

export default function Screenshots() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--accent))]">
              Aperçu
            </p>
            <h2 className="text-3xl font-bold text-[hsl(var(--text-primary))] sm:text-4xl">
              Une interface conçue pour la productivité
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {screenshots.map(({ caption }, i) => (
            <ScrollReveal key={caption} delay={i * 0.12}>
              <div className="overflow-hidden rounded-xl border border-[hsl(var(--border-subtle))]">
                {/* Placeholder image block */}
                <div className="flex aspect-[4/3] items-center justify-center border-2 border-dashed border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))]">
                  <div className="flex flex-col items-center gap-3 text-[hsl(var(--text-muted))]">
                    <MonitorSmartphone className="h-10 w-10" />
                    <span className="text-sm">Capture d&apos;écran à venir</span>
                  </div>
                </div>
                <div className="bg-[hsl(var(--bg-surface))] p-4">
                  <p className="text-sm text-[hsl(var(--text-secondary))]">{caption}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
