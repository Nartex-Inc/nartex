"use client";

import ScrollReveal from "./ScrollReveal";

const steps = [
  {
    number: "1",
    title: "Connexion à votre ERP",
    description:
      "On connecte Nartex à votre système Prextra existant. Vos données de commandes, clients et inventaire sont synchronisées automatiquement.",
  },
  {
    number: "2",
    title: "Configuration sur mesure",
    description:
      "On configure vos workflows de retours, vos rôles utilisateurs et vos tableaux de bord selon vos processus spécifiques.",
  },
  {
    number: "3",
    title: "Lancement en 48 heures",
    description:
      "Votre équipe est opérationnelle en 2 jours. Formation incluse, support dédié et accompagnement continu.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-[hsl(var(--bg-surface))] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--accent))]">
              Comment ça marche
            </p>
            <h2 className="text-3xl font-bold text-[hsl(var(--text-primary))] sm:text-4xl">
              Opérationnel en 3 étapes simples
            </h2>
          </div>
        </ScrollReveal>

        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="absolute left-0 right-0 top-10 hidden h-px bg-[hsl(var(--border-default))] md:block" />

          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
            {steps.map(({ number, title, description }, i) => (
              <ScrollReveal key={number} delay={i * 0.15}>
                <div className="relative flex flex-col items-center text-center">
                  {/* Number circle */}
                  <div className="relative z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[hsl(var(--accent))] bg-[hsl(var(--bg-base))] text-2xl font-bold text-[hsl(var(--accent))]">
                    {number}
                  </div>
                  <h3 className="mb-3 text-lg font-semibold text-[hsl(var(--text-primary))]">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[hsl(var(--text-secondary))]">
                    {description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
