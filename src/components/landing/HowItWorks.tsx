"use client";

import ScrollReveal from "./ScrollReveal";

const steps = [
  { title: "Connexion ERP", description: "Synchronisation automatique de vos données Prextra." },
  { title: "Configuration", description: "Workflows, rôles et tableaux de bord sur mesure." },
  { title: "Lancement 48h", description: "Formation incluse, support dédié, accompagnement continu." },
];

export default function HowItWorks() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <p className="mb-16 text-center text-sm tracking-widest uppercase text-[hsl(var(--text-muted))]">
            Comment ça marche
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {steps.map(({ title, description }, i) => (
            <ScrollReveal key={title} delay={i * 0.12}>
              <div className="relative pl-10">
                <span className="absolute left-0 top-0 text-3xl font-bold text-[hsl(var(--accent)/0.2)]">
                  {i + 1}
                </span>
                <h3 className="mb-2 text-base font-semibold text-[hsl(var(--text-primary))]">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--text-tertiary))]">
                  {description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
