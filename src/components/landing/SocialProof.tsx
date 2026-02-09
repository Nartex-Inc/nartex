"use client";

import { Building2, Users, TrendingUp } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import { StaggerContainer, StaggerItem } from "./StaggerChildren";

const metrics = [
  { icon: Building2, value: "10+", label: "Entreprises manufacturières" },
  { icon: Users, value: "50+", label: "Utilisateurs actifs" },
  { icon: TrendingUp, value: "100%", label: "Taux de rétention" },
];

export default function SocialProof() {
  return (
    <section className="border-y border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))] py-16">
      <div className="mx-auto max-w-7xl px-6">
        {/* Logo bar placeholder */}
        <ScrollReveal>
          <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">
            Ils nous font confiance
          </p>
          <div className="mb-12 flex flex-wrap items-center justify-center gap-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 w-28 rounded-lg bg-[hsl(var(--bg-muted))]"
                aria-label={`Logo client ${i}`}
              />
            ))}
          </div>
        </ScrollReveal>

        {/* Trust metrics */}
        <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {metrics.map(({ icon: Icon, value, label }) => (
            <StaggerItem key={label}>
              <div className="flex flex-col items-center gap-3 rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-base))] p-6 text-center">
                <Icon className="h-6 w-6 text-[hsl(var(--accent))]" />
                <p className="text-3xl font-bold text-[hsl(var(--text-primary))]">{value}</p>
                <p className="text-sm text-[hsl(var(--text-secondary))]">{label}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
