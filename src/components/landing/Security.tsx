"use client";

import { Shield, Lock, Server, Eye } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import { StaggerContainer, StaggerItem } from "./StaggerChildren";

const points = [
  {
    icon: Shield,
    title: "Authentification multi-facteur",
    description: "Google OAuth, Microsoft Azure AD et authentification par mot de passe avec vérification courriel.",
  },
  {
    icon: Lock,
    title: "Chiffrement de bout en bout",
    description: "Toutes les connexions sont chiffrées via TLS/SSL. Certificats RDS pour la base de données.",
  },
  {
    icon: Server,
    title: "Hébergement AWS Canada",
    description: "Infrastructure déployée dans la région ca-central-1 (Montréal). Vos données restent au Canada.",
  },
  {
    icon: Eye,
    title: "Contrôle d'accès granulaire",
    description: "Cinq niveaux de rôles (Gestionnaire, Analyste, Vérificateur, Facturation, Expert) pour un accès sur mesure.",
  },
];

export default function Security() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--accent))]">
              Sécurité & conformité
            </p>
            <h2 className="text-3xl font-bold text-[hsl(var(--text-primary))] sm:text-4xl">
              Vos données, sous votre contrôle
            </h2>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {points.map(({ icon: Icon, title, description }) => (
            <StaggerItem key={title}>
              <div className="flex gap-4 rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))] p-6">
                <div className="shrink-0">
                  <div className="inline-flex rounded-lg bg-[hsl(var(--accent-muted))] p-2.5">
                    <Icon className="h-5 w-5 text-[hsl(var(--accent))]" />
                  </div>
                </div>
                <div>
                  <h3 className="mb-1 text-base font-semibold text-[hsl(var(--text-primary))]">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[hsl(var(--text-secondary))]">
                    {description}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
