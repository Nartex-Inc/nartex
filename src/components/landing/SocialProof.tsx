"use client";

import ScrollReveal from "./ScrollReveal";

const stats = [
  { value: "10+", label: "Entreprises" },
  { value: "50+", label: "Utilisateurs" },
  { value: "100%", label: "Rétention" },
];

export default function SocialProof() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <div className="flex items-center justify-center gap-16 md:gap-24">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-[hsl(var(--text-primary))] md:text-3xl">{value}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-[hsl(var(--text-muted))]">{label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
