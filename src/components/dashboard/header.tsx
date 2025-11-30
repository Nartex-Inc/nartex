// src/components/dashboard/header.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Menu,
  Plus,
  Search,
  Command,
  X,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { ModeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/dashboard/user-nav";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  notificationCount?: number;
}

/**
 * Premium header inspired by Linear, Vercel, and Raycast.
 * Features: Command palette search, refined spacing, smooth transitions.
 */
export function Header({
  onToggleMobileSidebar,
  notificationCount = 0,
}: HeaderProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const [searchFocused, setSearchFocused] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Detect scroll for subtle elevation
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ⌘K / Ctrl+K keyboard shortcut
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && searchFocused) {
        searchRef.current?.blur();
        setSearchValue("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchFocused]);

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
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        {/* ─────────────────────────────────────────────────────────────────────
           Mobile Menu Toggle
           ───────────────────────────────────────────────────────────────────── */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* ─────────────────────────────────────────────────────────────────────
           Brand — Desktop Only (sidebar has logo on desktop)
           ───────────────────────────────────────────────────────────────────── */}
        <Link
          href="/dashboard"
          className="hidden lg:flex items-center gap-1 group mr-4"
        >
          <span className="text-[17px] font-bold tracking-tight text-[hsl(var(--text-primary))] transition-colors group-hover:text-[hsl(var(--accent))]">
            nartex
          </span>
          <span className="text-[17px] font-bold text-[hsl(var(--accent))]">.</span>
        </Link>

        {/* ─────────────────────────────────────────────────────────────────────
           Search — Command Palette Style
           ───────────────────────────────────────────────────────────────────── */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <div
            className={cn(
              "relative flex items-center rounded-lg transition-all duration-200",
              "bg-[hsl(var(--bg-muted))]",
              searchFocused
                ? "ring-2 ring-[hsl(var(--accent))] ring-offset-1 ring-offset-[hsl(var(--bg-base))]"
                : "hover:bg-[hsl(var(--bg-elevated))]"
            )}
          >
            <Search
              className={cn(
                "absolute left-3 h-4 w-4 transition-colors",
                searchFocused
                  ? "text-[hsl(var(--accent))]"
                  : "text-[hsl(var(--text-muted))]"
              )}
            />
            <input
              ref={searchRef}
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Rechercher..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={cn(
                "h-9 w-full bg-transparent pl-10 pr-20 text-sm font-medium",
                "text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]",
                "focus:outline-none"
              )}
              aria-label="Rechercher"
            />
            {/* Keyboard shortcut badge */}
            <div className="absolute right-2 flex items-center gap-1">
              {searchValue && (
                <button
                  onClick={() => {
                    setSearchValue("");
                    searchRef.current?.focus();
                  }}
                  className="p-1 rounded hover:bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-[hsl(var(--text-muted))] bg-[hsl(var(--bg-elevated))] border border-[hsl(var(--border-subtle))]">
                <Command className="h-2.5 w-2.5" />
                <span>K</span>
              </kbd>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
           Spacer for mobile
           ───────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 md:hidden" />

        {/* ─────────────────────────────────────────────────────────────────────
           Right Actions
           ───────────────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5">
          {/* Help — Desktop only */}
          <button
            className="hidden xl:flex items-center justify-center h-9 w-9 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] transition-colors"
            aria-label="Aide"
          >
            <HelpCircle className="h-[18px] w-[18px]" />
          </button>

          {/* Theme Toggle */}
          <ModeToggle />

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
          <div className="hidden sm:block w-px h-6 bg-[hsl(var(--border-subtle))] mx-1" />

          {/* Create New — Primary CTA */}
          <button
            className={cn(
              "hidden sm:inline-flex items-center gap-2 h-9 px-3.5 rounded-lg",
              "bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]",
              "font-semibold text-sm",
              "hover:brightness-110 active:scale-[0.98]",
              "transition-all duration-150",
              "shadow-sm shadow-[hsl(var(--accent)/0.25)]"
            )}
            aria-label="Créer"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span>Nouveau</span>
          </button>

          {/* Mobile Create */}
          <button
            className={cn(
              "sm:hidden flex items-center justify-center h-9 w-9 rounded-lg",
              "bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]",
              "hover:brightness-110 active:scale-[0.98]",
              "transition-all duration-150"
            )}
            aria-label="Créer"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>

          {/* User Menu */}
          <UserNav />
        </div>
      </div>
    </header>
  );
}

export default Header;
