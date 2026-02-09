"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const faqs = [
  {
    question: "Combien de temps prend le déploiement ?",
    answer:
      "Nartex est opérationnel en 48 heures. Nous connectons votre ERP, configurons vos workflows et formons votre équipe — tout est inclus.",
  },
  {
    question: "Est-ce que Nartex fonctionne avec mon ERP existant ?",
    answer:
      "Oui. Nartex s'intègre nativement avec Prextra et peut se connecter à d'autres systèmes ERP via notre couche d'intégration. Vos données sont synchronisées en temps réel.",
  },
  {
    question: "Mes données sont-elles en sécurité ?",
    answer:
      "Absolument. Nartex est hébergé sur AWS au Canada (Montréal), avec chiffrement TLS/SSL, authentification multi-facteur et contrôle d'accès basé sur les rôles. Vos données ne quittent jamais le pays.",
  },
  {
    question: "Quel est le modèle de tarification ?",
    answer:
      "Nous offrons une tarification simple par utilisateur, sans frais cachés. Contactez-nous pour une soumission adaptée à la taille de votre équipe.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-[hsl(var(--bg-surface))] py-20">
      <div className="mx-auto max-w-3xl px-6">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--accent))]">
              FAQ
            </p>
            <h2 className="text-3xl font-bold text-[hsl(var(--text-primary))] sm:text-4xl">
              Questions fréquentes
            </h2>
          </div>
        </ScrollReveal>

        <div className="space-y-3">
          {faqs.map(({ question, answer }, i) => (
            <ScrollReveal key={question} delay={i * 0.08}>
              <div className="rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-base))]">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="flex w-full items-center justify-between p-5 text-left"
                >
                  <span className="text-base font-semibold text-[hsl(var(--text-primary))]">
                    {question}
                  </span>
                  <motion.span
                    animate={{ rotate: openIndex === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-5 w-5 shrink-0 text-[hsl(var(--text-muted))]" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-[hsl(var(--text-secondary))]">
                        {answer}
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
