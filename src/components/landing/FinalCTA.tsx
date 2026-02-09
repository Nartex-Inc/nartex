"use client";

import { ArrowRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const CTA_HREF =
  "mailto:n.labranche@nartex.ca?subject=Demande%20de%20d%C3%A9mo%20Nartex";

export default function FinalCTA() {
  return (
    <section className="border-t border-[hsl(var(--border-subtle))] py-32">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold text-[hsl(var(--text-primary))] sm:text-4xl">
              Prêt à commencer ?
            </h2>
            <p className="mx-auto mb-10 max-w-md text-sm text-[hsl(var(--text-tertiary))]">
              Rejoignez les entreprises qui utilisent Nartex pour automatiser
              leurs processus et accélérer leur croissance.
            </p>

            <a
              href={CTA_HREF}
              className="group inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] px-8 py-3.5 text-sm font-semibold text-[hsl(var(--bg-base))] transition-all hover:shadow-lg hover:shadow-[hsl(var(--accent)/0.25)] animate-pulse-glow"
            >
              Demander une démo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>

            <p className="mt-6 text-xs text-[hsl(var(--text-muted))]">
              Réponse en moins de 24 h
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
