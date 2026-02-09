"use client";

import ScrollReveal from "./ScrollReveal";
import { StaggerContainer, StaggerItem } from "./StaggerChildren";

const modules = [
  { title: "Analytique", description: "KPIs, comparaisons annuelles, tendances en temps réel." },
  { title: "Retours", description: "Workflow complet de brouillon à finalisation." },
  { title: "Catalogue", description: "Items, produits et listes de prix centralisés." },
  { title: "CRM", description: "Fiche client enrichie et analyse de rétention." },
  { title: "Cartographie", description: "Visualisation géographique des clients." },
  { title: "ERP", description: "Connexion native à Prextra." },
  { title: "RBAC", description: "Rôles et permissions granulaires." },
];

export default function Modules() {
  return (
    <section className="border-y border-[hsl(var(--border-subtle))] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <div className="mb-16 text-center">
            <p className="mb-4 text-sm tracking-widest uppercase text-[hsl(var(--text-muted))]">
              La plateforme
            </p>
            <h2 className="text-2xl font-bold text-[hsl(var(--text-primary))] sm:text-3xl">
              Sept modules. Un seul outil.
            </h2>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[hsl(var(--border-subtle))] sm:grid-cols-3 lg:grid-cols-4">
          {modules.map(({ title, description }) => (
            <StaggerItem key={title}>
              <div className="bg-[hsl(var(--bg-surface))] p-6 h-full transition-colors hover:bg-[hsl(var(--bg-elevated))]">
                <h3 className="mb-1.5 text-sm font-semibold text-[hsl(var(--text-primary))]">
                  {title}
                </h3>
                <p className="text-xs leading-relaxed text-[hsl(var(--text-tertiary))]">
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
