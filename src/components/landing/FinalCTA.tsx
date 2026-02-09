"use client";

import { ArrowRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const CTA_HREF =
  "mailto:n.labranche@nartex.ca?subject=Demande%20de%20d%C3%A9mo%20Nartex";

export default function FinalCTA() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <ScrollReveal>
          <div className="rounded-2xl border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--bg-surface))] p-12 text-center sm:p-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[hsl(var(--accent)/0.05)] to-transparent" />

            <h2 className="relative mb-4 text-3xl font-bold text-[hsl(var(--text-primary))] sm:text-4xl">
              Prêt à transformer vos opérations ?
            </h2>
            <p className="relative mx-auto mb-8 max-w-xl text-[hsl(var(--text-secondary))]">
              Rejoignez les entreprises manufacturières qui utilisent Nartex pour
              automatiser leurs processus et accélérer leur croissance.
            </p>

            <a
              href={CTA_HREF}
              className="group relative inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-8 py-4 text-lg font-bold text-[hsl(var(--bg-base))] transition-colors hover:bg-[hsl(var(--accent-hover))] animate-pulse-glow"
            >
              Demander une démo
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </a>

            <p className="relative mt-5 text-xs text-[hsl(var(--text-muted))]">
              Réponse en moins de 24 h · Démo personnalisée · Sans engagement
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
