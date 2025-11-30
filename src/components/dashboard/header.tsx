// src/components/dashboard/header.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Menu, Search } from "lucide-react";
import { UserNav } from "@/components/dashboard/user-nav";
import NartexLogo from "@/components/nartex-logo";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  notificationCount?: number;
}

/**
 * Premium header - Clean, centered layout.
 * Theme toggle moved to UserNav dropdown.
 * Improved search bar contrast.
 */
export function Header({
  onToggleMobileSidebar,
  notificationCount = 0,
}: HeaderProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const [searchFocused, setSearchFocused] = React.useState(false);

  // Detect scroll for subtle elevation
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-200",
        "bg-[hsl(var(--bg-base))]/80 backdrop-blur-xl backdrop-saturate-150",
        "border-b",
        scrolled
          ? "border-[hsl(var(--border-subtle))] shadow-sm shadow-black/5"
          : "border-transparent"
      )}
    >
      {/* Centered container */}
      <div className="mx-auto max-w-screen-2xl">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          {/* ─────────────────────────────────────────────────────────────────────
             Left Section: Mobile Menu + Logo
             ───────────────────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Nartex Logo — Scaled down ~25% (h-5 instead of h-6) */}
            <Link
              href="/dashboard"
              className="flex items-center group"
            >
              <NartexLogo 
                className="h-5 w-auto text-[hsl(var(--text-primary))] transition-opacity group-hover:opacity-70" 
                title="Nartex"
              />
            </Link>
          </div>

          {/* ─────────────────────────────────────────────────────────────────────
             Center Section: Search (Desktop only) — Higher contrast
             ───────────────────────────────────────────────────────────────────── */}
          <div className="hidden md:flex flex-1 justify-center max-w-md mx-8">
            <div className="relative w-full">
              <Search 
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                  searchFocused 
                    ? "text-[hsl(var(--accent))]" 
                    : "text-[hsl(var(--text-secondary))]"
                )} 
              />
              <input
                type="search"
                placeholder="Rechercher..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={cn(
                  "w-full h-9 pl-10 pr-4 rounded-lg text-sm font-medium",
                  // Higher contrast background
                  "bg-[hsl(var(--bg-elevated))]",
                  "text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-secondary))]",
                  // Visible border for better contrast
                  "border border-[hsl(var(--border-default))]",
                  // Focus state
                  "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-[hsl(var(--accent))]",
                  // Hover state
                  "hover:border-[hsl(var(--border-strong))]",
                  "transition-all duration-200"
                )}
                aria-label="Rechercher"
              />
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────────
             Right Section: Actions (Theme toggle now in UserNav)
             ───────────────────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1.5">
            {/* Notifications */}
            <button
              className="relative flex items-center justify-center h-9 w-9 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--accent))] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
                </span>
              )}
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-[hsl(var(--border-subtle))] mx-1" />

            {/* User Menu (includes theme toggle) */}
            <UserNav />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
