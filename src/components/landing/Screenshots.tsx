"use client";

import ScrollReveal from "./ScrollReveal";

const screenshots = [
  "Tableau de bord analytique",
  "Gestion des retours",
  "Cartographie clients",
];

export default function Screenshots() {
  return (
    <section className="border-y border-[hsl(var(--border-subtle))] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <p className="mb-16 text-center text-sm tracking-widest uppercase text-[hsl(var(--text-muted))]">
            Aperçu
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {screenshots.map((caption, i) => (
            <ScrollReveal key={caption} delay={i * 0.1}>
              <div className="group">
                <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-[hsl(var(--bg-surface))] transition-colors group-hover:bg-[hsl(var(--bg-elevated))]">
                  <span className="text-xs tracking-wider text-[hsl(var(--text-muted))]">
                    Bientôt disponible
                  </span>
                </div>
                <p className="mt-3 text-center text-xs text-[hsl(var(--text-tertiary))]">{caption}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
