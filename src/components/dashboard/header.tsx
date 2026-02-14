// src/components/dashboard/header.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { UserNav } from "@/components/dashboard/user-nav";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import NartexLogo from "@/components/nartex-logo";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

/**
 * Premium header - Clean, centered layout.
 * Theme toggle in UserNav dropdown.
 * SUCCESS GREEN accent color.
 */
export function Header({
  onToggleMobileSidebar,
}: HeaderProps) {
  const [scrolled, setScrolled] = React.useState(false);

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
        "bg-[hsl(var(--bg-base))]/85 backdrop-blur-lg backdrop-saturate-[1.1]",
        "border-b",
        scrolled
          ? "border-[hsl(var(--border-subtle))] shadow-sm"
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

            {/* Nartex Logo */}
            <Link
              href="/dashboard"
              className="flex items-center group"
            >
              <NartexLogo
                className="h-[18px] w-auto ml-1 text-[hsl(var(--text-primary))] transition-opacity group-hover:opacity-70"
                title="Nartex"
              />
            </Link>
          </div>

          {/* ─────────────────────────────────────────────────────────────────────
             Right Section: Actions
             ───────────────────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <NotificationBell />

            {/* Divider */}
            <div className="w-px h-5 bg-[hsl(var(--border-subtle))] mx-2" />

            {/* User Menu (includes theme toggle) */}
            <UserNav />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
