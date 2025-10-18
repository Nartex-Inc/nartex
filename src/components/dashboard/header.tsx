// src/components/dashboard/header.tsx
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Bell, Menu, Plus, Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/dashboard/user-nav";
import NartexLogo from "@/components/nartex-logo";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  notificationCount?: number;
}

/**
 * Sticky, translucent app header aligned with the main content.
 * On lg+ screens it pads left by var(--sidebar-w) so it stays aligned
 * when the sidebar collapses/expands.
 *
 * Premium touches:
 *  - Glass surface with hairline; elevation appears after scroll
 *  - Command-style search (⌘K) that focuses the input
 *  - Quick-create button
 *  - Pulsing notification indicator
 */
export function Header({
  onToggleMobileSidebar,
  notificationCount = 0,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  // Elevate header only after slight scroll to preserve minimalism at rest
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ⌘K / Ctrl+K focuses the global search input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === "k") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(
          'input[aria-label="Rechercher"]'
        );
        el?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full border-b glass supports-[backdrop-filter]:glass transition-colors",
        scrolled ? "hairline shadow-soft" : "border-transparent",
      ].join(" ")}
    >
      {/* pad-left matches sidebar on lg+ */}
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-5 sm:px-8 lg:pl-[var(--sidebar-w)]">
        {/* Mobile hamburger (sidebar sits under header on mobile) */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onToggleMobileSidebar}
          aria-label="Ouvrir le menu latéral"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Brand */}
        <div className="flex items-center gap-2">
          <NartexLogo className="h-5 w-auto select-none text-foreground" />
        </div>

        {/* Command search (⌘K) — hidden on narrow screens to keep header clean */}
        <div className="relative ml-2 hidden min-w-[260px] flex-1 items-center md:flex">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Rechercher"
            placeholder="Rechercher (⌘K)"
            className="h-9 w-full rounded-xl bg-[--glass] pl-9 pr-10 text-sm ring-1 ring-transparent ring-offset-0 ring-glass placeholder:text-muted-foreground/70"
          />
          <kbd className="pointer-events-none absolute right-2 hidden rounded-md border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
            ⌘K
          </kbd>
        </div>

        <div className="ml-auto" />

        {/* Right controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Optional: shortcuts hint (shows on md+) */}
          <Button variant="ghost" size="sm" className="hidden gap-2 md:flex" aria-label="Raccourcis">
            <Command className="h-4 w-4" />
            <span className="text-xs">Raccourcis</span>
          </Button>

          {/* Quick create (primary action) */}
          <Button variant="default" size="sm" className="hidden gap-2 sm:flex" aria-label="Nouvelle ressource">
            <Plus className="h-4 w-4" />
            <span className="text-xs">Nouveau</span>
          </Button>

          <ModeToggle />

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </Button>
            {notificationCount > 0 && (
              <span
                aria-hidden
                className="absolute right-2 top-2 inline-block h-2 w-2 rounded-full bg-primary ring-2 ring-[--glass] pulse-badge"
              />
            )}
          </div>

          {/* Account menu */}
          <UserNav />
        </div>
      </div>
    </header>
  );
}

export default Header;
