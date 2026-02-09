"use client";

import ScrollReveal from "./ScrollReveal";

const painPoints = [
  {
    title: "Ventes dispersées",
    description: "Données éparpillées entre Excel, ERP et rapports manuels.",
  },
  {
    title: "Retours chaotiques",
    description: "Courriels, fichiers partagés et appels — erreurs et pertes.",
  },
  {
    title: "Cash-flow imprévisible",
    description: "Sans visibilité sur les crédits et réclamations.",
  },
];

export default function Problem() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <p className="mb-16 text-center text-sm tracking-widest uppercase text-[hsl(var(--text-muted))]">
            Le problème
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[hsl(var(--border-subtle))] md:grid-cols-3">
          {painPoints.map(({ title, description }, i) => (
            <ScrollReveal key={title} delay={i * 0.1}>
              <div className="flex flex-col justify-between bg-[hsl(var(--bg-surface))] p-8 h-full md:p-10">
                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[hsl(var(--danger))]">
                    0{i + 1}
                  </p>
                  <h3 className="mb-3 text-lg font-semibold text-[hsl(var(--text-primary))]">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[hsl(var(--text-tertiary))]">
                    {description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
