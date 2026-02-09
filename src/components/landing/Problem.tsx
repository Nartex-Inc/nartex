"use client";

import { FileSpreadsheet, RotateCcw, DollarSign } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import { StaggerContainer, StaggerItem } from "./StaggerChildren";

const painPoints = [
  {
    icon: FileSpreadsheet,
    title: "Ventes dispersées",
    description:
      "Vos données de ventes sont éparpillées entre Excel, votre ERP et des rapports manuels. Impossible d'avoir une vue d'ensemble fiable.",
  },
  {
    icon: RotateCcw,
    title: "Retours chaotiques",
    description:
      "Le suivi des retours passe par des courriels, des fichiers partagés et des appels téléphoniques. Résultat : des erreurs, des délais et des pertes.",
  },
  {
    icon: DollarSign,
    title: "Recouvrement imprévisible",
    description:
      "Sans visibilité sur les crédits, réclamations et notes de crédit, votre cash-flow reste imprévisible et vous perdez de l'argent.",
  },
];

export default function Problem() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--danger))]">
              Le problème
            </p>
            <h2 className="text-3xl font-bold text-[hsl(var(--text-primary))] sm:text-4xl">
              Vos outils actuels vous ralentissent
            </h2>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {painPoints.map(({ icon: Icon, title, description }) => (
            <StaggerItem key={title}>
              <div className="group rounded-xl border border-[hsl(var(--danger)/0.2)] bg-[hsl(var(--bg-surface))] p-6 transition-colors hover:border-[hsl(var(--danger)/0.4)]">
                <div className="mb-4 inline-flex rounded-lg bg-[hsl(var(--danger-muted))] p-3">
                  <Icon className="h-6 w-6 text-[hsl(var(--danger))]" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[hsl(var(--text-primary))]">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--text-secondary))]">
                  {description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
