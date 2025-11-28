// src/components/dashboard/header.tsx
"use client";

import * as React from "react";
import { Bell, Menu, Plus, Search, Command, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/dashboard/user-nav";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  notificationCount?: number;
}

/**
 * Clean, minimal header for Nartex SaaS platform.
 * Solid background, no glassmorphism.
 */
export function Header({
  onToggleMobileSidebar,
  notificationCount = 0,
}: HeaderProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const [searchFocused, setSearchFocused] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Subtle shadow on scroll
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ⌘K / Ctrl+K shortcut
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && searchFocused) {
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchFocused]);

  return (
    <header
      className={`
        sticky top-0 z-40 w-full transition-all duration-200
        bg-[hsl(var(--bg-base))] border-b
        ${scrolled 
          ? "border-[hsl(var(--border-default))] shadow-sm" 
          : "border-transparent"
        }
      `}
    >
      <div className="flex h-16 items-center gap-4 px-4 lg:pl-[calc(var(--sidebar-w)+1rem)] lg:pr-6">
        {/* Mobile menu button */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden rounded-lg p-2 text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] transition-colors"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Nartex Brand */}
        <div className="hidden lg:flex items-center">
          <span className="text-lg font-bold tracking-tight text-[hsl(var(--text-primary))]">
            nartex
          </span>
          <span className="ml-0.5 text-lg font-bold text-[hsl(var(--accent))]">.</span>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <div
            className={`
              relative flex items-center rounded-lg transition-all duration-200
              bg-[hsl(var(--bg-muted))] border
              ${searchFocused 
                ? "border-[hsl(var(--accent))] ring-2 ring-[hsl(var(--accent)/0.2)]" 
                : "border-transparent hover:border-[hsl(var(--border-default))]"
              }
            `}
          >
            <Search className="absolute left-3 h-4 w-4 text-[hsl(var(--text-muted))]" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Rechercher..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="h-9 w-full bg-transparent pl-10 pr-16 text-sm font-medium text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none"
              aria-label="Rechercher"
            />
            <kbd className="absolute right-3 hidden sm:flex items-center gap-1 rounded-md bg-[hsl(var(--bg-elevated))] px-1.5 py-0.5 text-[10px] font-semibold text-[hsl(var(--text-muted))] border border-[hsl(var(--border-subtle))]">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 md:hidden" />

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Raccourcis - hidden on smaller screens */}
          <button
            className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] transition-colors"
            aria-label="Raccourcis clavier"
          >
            <Command className="h-4 w-4" />
            <span className="text-xs font-semibold">Raccourcis</span>
          </button>

          {/* Create New */}
          <button
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))] font-semibold text-xs hover:bg-[hsl(var(--accent-hover))] transition-colors"
            aria-label="Créer"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span>Nouveau</span>
          </button>

          {/* Mobile Create */}
          <button
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]"
            aria-label="Créer"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>

          {/* Theme Toggle */}
          <ModeToggle />

          {/* Notifications */}
          <button
            className="relative flex items-center justify-center w-9 h-9 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[hsl(var(--accent))] animate-ping" />
              </>
            )}
          </button>

          {/* User Menu */}
          <UserNav />
        </div>
      </div>
    </header>
  );
}

export default Header;
