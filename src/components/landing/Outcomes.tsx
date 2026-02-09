"use client";

import { useRef, useEffect, useState } from "react";
import { useInView, animate } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
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

  return <span ref={ref}>{value}{suffix}</span>;
}

const pillars = [
  { title: "Visibilité", description: "Vue 360° de toutes vos données unifiées.", counter: { target: 360, suffix: "°" } },
  { title: "Automatisation", description: "Réduction du travail manuel sur les retours.", counter: { target: 80, suffix: "%" } },
  { title: "Croissance", description: "Accélération des décisions basées sur les données.", counter: { target: 3, suffix: "x" } },
];

export default function Outcomes() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <p className="mb-16 text-center text-sm tracking-widest uppercase text-[hsl(var(--text-muted))]">
            Les résultats
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-16 md:grid-cols-3">
          {pillars.map(({ title, description, counter }, i) => (
            <ScrollReveal key={title} delay={i * 0.12}>
              <div className="text-center">
                <p className="mb-2 text-5xl font-bold text-[hsl(var(--accent))]">
                  <AnimatedCounter {...counter} />
                </p>
                <h3 className="mb-2 text-base font-semibold text-[hsl(var(--text-primary))]">
                  {title}
                </h3>
                <p className="text-sm text-[hsl(var(--text-tertiary))]">
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
