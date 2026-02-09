"use client";

import ScrollReveal from "./ScrollReveal";

const metrics = [
  { value: "15h", label: "Économisé par semaine" },
  { value: "30%", label: "Moins de pertes" },
  { value: "2x", label: "Plus rapide" },
];

export default function ROI() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <p className="mb-16 text-center text-sm tracking-widest uppercase text-[hsl(var(--text-muted))]">
            ROI
          </p>
        </ScrollReveal>

        <div className="mb-16 grid grid-cols-3 gap-8">
          {metrics.map(({ value, label }, i) => (
            <ScrollReveal key={label} delay={i * 0.1}>
              <div className="text-center">
                <p className="text-4xl font-bold text-[hsl(var(--text-primary))] md:text-5xl">{value}</p>
                <p className="mt-2 text-xs tracking-wider text-[hsl(var(--text-muted))]">{label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="mx-auto max-w-xl rounded-2xl border border-[hsl(var(--accent)/0.15)] bg-[hsl(var(--accent)/0.03)] px-8 py-6 text-center">
            <p className="text-sm font-medium text-[hsl(var(--accent))]">
              Mesurez en 30 jours
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--text-tertiary))]">
              Pas de résultat, pas d&apos;engagement.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
