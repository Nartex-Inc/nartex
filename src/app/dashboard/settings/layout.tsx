// src/app/dashboard/settings/layout.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Self-contained accent color hook - no external dependency
const DEFAULT_ACCENT_COLOR = "#6366f1";
function useAccentColor() {
  const [color, setColor] = useState(DEFAULT_ACCENT_COLOR);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nartex-accent-color");
      if (stored) setColor(stored);
    }
  }, []);
  return { color };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Settings Tab Configuration
   ═══════════════════════════════════════════════════════════════════════════════ */
const SETTINGS_TABS = [
  { href: "/dashboard/settings/profile", label: "Mon profil", badge: null },
  { href: "/dashboard/settings/account", label: "Compte", badge: null },
  { href: "/dashboard/settings/password", label: "Mot de passe", badge: null },
  { href: "/dashboard/settings/team", label: "Équipe", badge: null },
  { href: "/dashboard/settings/roles", label: "Rôles & Permissions", badge: null },
  { href: "/dashboard/settings/notifications", label: "Notifications", badge: 2 },
  { href: "/dashboard/settings/integrations", label: "Intégrations", badge: null },
  { href: "/dashboard/settings/api", label: "API", badge: null },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════════
   Settings Layout Component
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { color: accentColor } = useAccentColor();

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="mx-auto w-full max-w-5xl">
          {/* ─────────────────────────────────────────────────────────────────────
              Header
              ───────────────────────────────────────────────────────────────────── */}
          <header className="mb-8 animate-slide-up">
            <h1 className="text-headline">Paramètres</h1>
            <p className="text-caption mt-1">
              Gérez vos préférences et paramètres de compte
            </p>
          </header>

          {/* ─────────────────────────────────────────────────────────────────────
              Tab Navigation
              ───────────────────────────────────────────────────────────────────── */}
          <nav 
            className="mb-8 overflow-x-auto scrollbar-hide animate-slide-up stagger-1"
            role="tablist"
            aria-label="Paramètres navigation"
          >
            <div 
              className="flex gap-1 p-1 rounded-xl min-w-max"
              style={{ 
                background: "hsl(var(--bg-muted))",
                border: "1px solid hsl(var(--border-subtle))"
              }}
            >
              {SETTINGS_TABS.map((tab) => {
                const isActive = pathname === tab.href || 
                  (tab.href === "/dashboard/settings/profile" && pathname === "/dashboard/settings");
                
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    role="tab"
                    aria-selected={isActive}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all duration-200",
                      "outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                      isActive
                        ? "bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))] shadow-sm"
                        : "text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-surface))]/50"
                    )}
                    style={{
                      ...(isActive && {
                        boxShadow: `0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)`
                      })
                    }}
                  >
                    {tab.label}
                    {tab.badge && (
                      <span 
                        className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold text-white"
                        style={{ background: accentColor }}
                      >
                        {tab.badge}
                      </span>
                    )}
                    {isActive && (
                      <span 
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                        style={{ background: accentColor }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* ─────────────────────────────────────────────────────────────────────
              Content Area
              ───────────────────────────────────────────────────────────────────── */}
          <div className="animate-slide-up stagger-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
