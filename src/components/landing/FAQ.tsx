"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

const faqs = [
  {
    q: "Combien de temps prend le déploiement ?",
    a: "48 heures. Connexion ERP, configuration et formation incluses.",
  },
  {
    q: "Compatible avec mon ERP ?",
    a: "Intégration native Prextra. Autres ERP via notre couche d'intégration.",
  },
  {
    q: "Mes données sont-elles en sécurité ?",
    a: "AWS Canada, chiffrement TLS/SSL, authentification MFA, contrôle d'accès par rôles.",
  },
  {
    q: "Quel modèle de tarification ?",
    a: "Par utilisateur, sans frais cachés. Contactez-nous pour une soumission.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24">
      <div className="mx-auto max-w-2xl px-6">
        <ScrollReveal>
          <p className="mb-16 text-center text-sm tracking-widest uppercase text-[hsl(var(--text-muted))]">
            FAQ
          </p>
        </ScrollReveal>

        <div className="divide-y divide-[hsl(var(--border-subtle))]">
          {faqs.map(({ q, a }, i) => (
            <ScrollReveal key={q} delay={i * 0.06}>
              <div>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between py-5 text-left"
                >
                  <span className="text-sm font-medium text-[hsl(var(--text-primary))]">{q}</span>
                  <span className="ml-4 shrink-0 text-xs text-[hsl(var(--text-muted))]">
                    {open === i ? "−" : "+"}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-sm leading-relaxed text-[hsl(var(--text-tertiary))]">
                        {a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
