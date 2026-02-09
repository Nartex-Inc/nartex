"use client";

import { useScroll, useMotionValueEvent, motion } from "framer-motion";
import { useState } from "react";
import NartexLogo from "@/components/nartex-logo";

const CTA_HREF =
  "mailto:n.labranche@nartex.ca?subject=Demande%20de%20d%C3%A9mo%20Nartex";

export default function LandingHeader() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 50));

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass border-b border-[hsl(var(--border-subtle))]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <a href="/landing" aria-label="Nartex accueil">
          <NartexLogo className="h-4 w-auto text-[hsl(var(--text-primary))]" />
        </a>

        <a
          href={CTA_HREF}
          className="rounded-full bg-[hsl(var(--text-primary))] px-5 py-2 text-xs font-medium tracking-wide text-[hsl(var(--bg-base))] transition-all hover:opacity-80"
        >
          Demander une démo
        </a>
      </div>
    </motion.header>
  );
}
