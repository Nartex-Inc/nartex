"use client";

import ScrollReveal from "./ScrollReveal";

const points = [
  "Authentification multi-facteur (Google, Azure AD)",
  "Chiffrement TLS/SSL de bout en bout",
  "Hébergement AWS Canada (ca-central-1)",
  "Cinq niveaux de rôles et permissions",
];

export default function Security() {
  return (
    <section className="border-t border-[hsl(var(--border-subtle))] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-xl">
          <ScrollReveal>
            <p className="mb-8 text-center text-sm tracking-widest uppercase text-[hsl(var(--text-muted))]">
              Sécurité
            </p>
            <h2 className="mb-10 text-center text-2xl font-bold text-[hsl(var(--text-primary))]">
              Vos données, sous votre contrôle.
            </h2>
          </ScrollReveal>

          <ul className="space-y-4">
            {points.map((point, i) => (
              <ScrollReveal key={point} delay={i * 0.08}>
                <li className="flex items-center gap-3 text-sm text-[hsl(var(--text-secondary))]">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--accent))]" />
                  {point}
                </li>
              </ScrollReveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
