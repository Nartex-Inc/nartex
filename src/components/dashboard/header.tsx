// src/components/dashboard/header.tsx
"use client";

import * as React from "react";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/dashboard/user-nav";
import NartexLogo from "@/components/nartex-logo";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  notificationCount?: number;
}

/**
 * Sticky, translucent app header with safe z-index.
 * Uses the same container width as your pages to keep rhythm.
 */
export function Header({
  onToggleMobileSidebar,
  notificationCount = 0,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-5 sm:px-8">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onToggleMobileSidebar}
          aria-label="Ouvrir le menu latéral"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Brand (theme-aware via currentColor) */}
        <div className="flex items-center gap-2">
          <NartexLogo className="h-6 w-auto text-foreground transition-colors" />
        </div>

        <div className="ml-auto" />

        {/* Right controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <ModeToggle />

          {/* Notifications (dot for count) */}
          <div className="relative">
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Button>
            {notificationCount > 0 && (
              <span
                aria-hidden
                className="absolute right-2 top-2 inline-block h-2 w-2 rounded-full bg-primary ring-2 ring-background"
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
