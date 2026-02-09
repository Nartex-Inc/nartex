"use client";

import NartexLogo from "@/components/nartex-logo";

export default function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))] py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <NartexLogo className="h-5 w-auto text-[hsl(var(--text-muted))]" />
          <span className="text-sm text-[hsl(var(--text-muted))]">
            &copy; {year} Nartex Inc. Tous droits réservés.
          </span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="mailto:n.labranche@nartex.ca"
            className="text-sm text-[hsl(var(--text-muted))] transition-colors hover:text-[hsl(var(--text-secondary))]"
          >
            Contact
          </a>
          <span className="text-xs text-[hsl(var(--text-muted))]">
            Propulsé par Nartex
          </span>
        </div>
      </div>
    </footer>
  );
}
