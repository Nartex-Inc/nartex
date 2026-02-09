"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const CTA_DEMO =
  "mailto:n.labranche@nartex.ca?subject=Demande%20de%20d%C3%A9mo%20Nartex";
const CTA_AUDIT =
  "mailto:n.labranche@nartex.ca?subject=Audit%20ROI%20gratuit%20Nartex";

const bullets = [
  "Retours automatisés, sans Excel",
  "Tableau de bord ventes en temps réel",
  "Intégration ERP native",
];

export default function Hero() {
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 150]);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-20">
      {/* Gradient background with parallax */}
      <motion.div
        style={{ y: bgY }}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[hsl(var(--accent)/0.08)] blur-[120px]" />
        <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-[hsl(var(--accent)/0.05)] blur-[100px]" />
      </motion.div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-block rounded-full border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent-muted))] px-4 py-1.5 text-sm font-medium text-[hsl(var(--accent))]"
        >
          Plateforme B2B pour manufacturiers & distributeurs
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6 text-4xl font-bold leading-tight tracking-tight text-[hsl(var(--text-primary))] sm:text-5xl lg:text-6xl"
        >
          Vos ventes, retours et données&nbsp;ERP —{" "}
          <span className="gradient-text">dans une seule plateforme</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mb-8 max-w-2xl text-lg text-[hsl(var(--text-secondary))]"
        >
          Nartex remplace vos fichiers Excel, unifie vos systèmes et vous donne
          une vue complète de votre performance — en temps réel.
        </motion.p>

        <motion.ul
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto mb-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6"
        >
          {bullets.map((text) => (
            <li key={text} className="flex items-center gap-2 text-sm text-[hsl(var(--text-secondary))]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
              {text}
            </li>
          ))}
        </motion.ul>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <a
            href={CTA_DEMO}
            className="group inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-7 py-3.5 text-base font-semibold text-[hsl(var(--bg-base))] transition-colors hover:bg-[hsl(var(--accent-hover))]"
          >
            Demander une démo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href={CTA_AUDIT}
            className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border-default))] px-7 py-3.5 text-base font-semibold text-[hsl(var(--text-primary))] transition-colors hover:bg-[hsl(var(--bg-elevated))]"
          >
            Audit ROI gratuit
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-6 text-xs text-[hsl(var(--text-muted))]"
        >
          Aucune carte de crédit requise · Déploiement en 48 h · Support dédié
        </motion.p>
      </div>
    </section>
  );
}
