"use client";

import {
  BarChart3,
  RotateCcw,
  Package,
  Users,
  Map,
  FileText,
  Settings,
} from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import { StaggerContainer, StaggerItem } from "./StaggerChildren";

const modules = [
  {
    icon: BarChart3,
    title: "Tableau de bord analytique",
    description: "KPIs, comparaisons annuelles, rétention client et tendances de ventes en temps réel.",
  },
  {
    icon: RotateCcw,
    title: "Gestion des retours",
    description: "Workflow complet : brouillon → vérification → finalisation avec suivi de poids et restockage.",
  },
  {
    icon: Package,
    title: "Catalogue & tarification",
    description: "Gestion centralisée des items, produits et listes de prix avec synchronisation ERP.",
  },
  {
    icon: Users,
    title: "CRM & clients",
    description: "Fiche client enrichie, historique de commandes et analyse de rétention par représentant.",
  },
  {
    icon: Map,
    title: "Cartographie clients",
    description: "Visualisez géographiquement vos clients et identifiez les zones à fort potentiel.",
  },
  {
    icon: FileText,
    title: "Intégration ERP",
    description: "Connexion native à Prextra : commandes, inventaire, expéditions et données clients.",
  },
  {
    icon: Settings,
    title: "Multi-tenant & RBAC",
    description: "Architecture multi-locataire avec gestion granulaire des rôles et permissions.",
  },
];

export default function Modules() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--accent))]">
              La plateforme
            </p>
            <h2 className="text-3xl font-bold text-[hsl(var(--text-primary))] sm:text-4xl">
              Tout ce dont vous avez besoin, unifié
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[hsl(var(--text-secondary))]">
              Sept modules intégrés qui remplacent vos outils fragmentés.
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {modules.map(({ icon: Icon, title, description }) => (
            <StaggerItem key={title}>
              <div className="card-hover rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))] p-6">
                <div className="mb-4 inline-flex rounded-lg bg-[hsl(var(--accent-muted))] p-2.5">
                  <Icon className="h-5 w-5 text-[hsl(var(--accent))]" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-[hsl(var(--text-primary))]">
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
