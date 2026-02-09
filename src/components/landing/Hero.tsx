"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";

const CTA_DEMO =
  "mailto:n.labranche@nartex.ca?subject=Demande%20de%20d%C3%A9mo%20Nartex";
const CTA_AUDIT =
  "mailto:n.labranche@nartex.ca?subject=Audit%20ROI%20gratuit%20Nartex";

export default function Hero() {
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 150]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-6">
      {/* Single subtle gradient orb */}
      <motion.div
        style={{ y: bgY }}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[hsl(var(--accent)/0.06)] blur-[150px]" />
      </motion.div>

      <motion.div style={{ opacity }} className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0, 1] }}
          className="mb-6 text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.1] tracking-tight text-[hsl(var(--text-primary))]"
        >
          Vos ventes, retours et données ERP
          <br />
          <span className="gradient-text">dans une seule plateforme.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.1, 0, 1] }}
          className="mx-auto mb-12 max-w-lg text-base leading-relaxed text-[hsl(var(--text-tertiary))]"
        >
          Nartex remplace vos fichiers Excel, unifie vos systèmes et vous donne
          une vue complète de votre performance — en temps réel.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0, 1] }}
          className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <a
            href={CTA_DEMO}
            className="group inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] px-7 py-3 text-sm font-semibold text-[hsl(var(--bg-base))] transition-all hover:shadow-lg hover:shadow-[hsl(var(--accent)/0.25)]"
          >
            Demander une démo
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href={CTA_AUDIT}
            className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium text-[hsl(var(--text-secondary))] transition-colors hover:text-[hsl(var(--text-primary))]"
          >
            Audit ROI gratuit
            <span className="text-[hsl(var(--accent))]">&rarr;</span>
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="h-8 w-[1px] bg-gradient-to-b from-transparent via-[hsl(var(--text-muted))] to-transparent" />
      </motion.div>
    </section>
  );
}
