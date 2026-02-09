"use client";

import { Clock, Wallet, TrendingUp } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import { StaggerContainer, StaggerItem } from "./StaggerChildren";

const metrics = [
  {
    icon: Clock,
    value: "15h",
    label: "Temps économisé / semaine",
    description: "Moins de saisie manuelle, moins de chasse aux données, plus de temps pour vendre.",
  },
  {
    icon: Wallet,
    value: "30%",
    label: "Réduction des pertes",
    description: "Traçabilité complète des retours et crédits — fini les montants perdus.",
  },
  {
    icon: TrendingUp,
    value: "2x",
    label: "Vitesse de décision",
    description: "Des données en temps réel pour prendre les bonnes décisions, plus vite.",
  },
];

export default function ROI() {
  return (
    <section className="bg-[hsl(var(--bg-surface))] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--accent))]">
              Retour sur investissement
            </p>
            <h2 className="text-3xl font-bold text-[hsl(var(--text-primary))] sm:text-4xl">
              Un impact mesurable dès le premier mois
            </h2>
          </div>
        </ScrollReveal>

        <StaggerContainer className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {metrics.map(({ icon: Icon, value, label, description }) => (
            <StaggerItem key={label}>
              <div className="rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-base))] p-6 text-center">
                <Icon className="mx-auto mb-3 h-6 w-6 text-[hsl(var(--accent))]" />
                <p className="mb-1 text-3xl font-bold text-[hsl(var(--accent))]">{value}</p>
                <p className="mb-2 text-sm font-semibold text-[hsl(var(--text-primary))]">{label}</p>
                <p className="text-sm text-[hsl(var(--text-secondary))]">{description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Green callout box */}
        <ScrollReveal>
          <div className="rounded-xl border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent-muted))] p-8 text-center">
            <p className="mb-2 text-lg font-bold text-[hsl(var(--accent))]">
              Mesurez en 30 jours
            </p>
            <p className="mx-auto max-w-xl text-sm text-[hsl(var(--text-secondary))]">
              Nous vous accompagnons pendant le premier mois pour mesurer l&apos;impact concret
              sur vos opérations. Pas de résultat ? Pas d&apos;engagement.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
