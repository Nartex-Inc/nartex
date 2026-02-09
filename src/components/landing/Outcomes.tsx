"use client";

import { useRef, useEffect, useState } from "react";
import { useInView, animate } from "framer-motion";
import { Eye, Zap, TrendingUp } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  prefix?: string;
}

function AnimatedCounter({ target, suffix = "", prefix = "" }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, target, {
      duration: 2,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [isInView, target]);

  return (
    <span ref={ref} className="text-4xl font-bold text-[hsl(var(--accent))]">
      {prefix}{value}{suffix}
    </span>
  );
}

const pillars = [
  {
    icon: Eye,
    title: "Visibilité totale",
    description: "Toutes vos données de ventes, retours et ERP unifiées dans un tableau de bord en temps réel.",
    counter: { target: 360, suffix: "°" },
  },
  {
    icon: Zap,
    title: "Automatisation complète",
    description: "De la création d'un retour jusqu'au crédit : chaque étape est automatisée, traçable et auditable.",
    counter: { target: 80, suffix: "%" },
  },
  {
    icon: TrendingUp,
    title: "Croissance accélérée",
    description: "Identifiez vos meilleurs clients, repérez les opportunités et prenez des décisions basées sur les données.",
    counter: { target: 3, suffix: "x" },
  },
];

export default function Outcomes() {
  return (
    <section className="bg-[hsl(var(--bg-surface))] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--accent))]">
              Les résultats
            </p>
            <h2 className="text-3xl font-bold text-[hsl(var(--text-primary))] sm:text-4xl">
              Ce que Nartex change pour vous
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, description, counter }, i) => (
            <ScrollReveal key={title} delay={i * 0.15}>
              <div className="flex flex-col items-center rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-base))] p-8 text-center">
                <div className="mb-4 inline-flex rounded-lg bg-[hsl(var(--accent-muted))] p-3">
                  <Icon className="h-6 w-6 text-[hsl(var(--accent))]" />
                </div>
                <AnimatedCounter {...counter} />
                <h3 className="mt-3 mb-2 text-lg font-semibold text-[hsl(var(--text-primary))]">
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
    </section>
  );
}
