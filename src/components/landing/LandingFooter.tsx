"use client";

import NartexLogo from "@/components/nartex-logo";

export default function LandingFooter() {
  return (
    <footer className="border-t border-[hsl(var(--border-subtle))] py-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <NartexLogo className="h-3 w-auto text-[hsl(var(--text-muted))]" />
        <span className="text-[11px] text-[hsl(var(--text-muted))]">
          &copy; {new Date().getFullYear()} Nartex Inc.
        </span>
      </div>
    </footer>
  );
}
