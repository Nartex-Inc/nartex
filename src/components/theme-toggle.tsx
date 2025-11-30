// src/components/theme-toggle.tsx
"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        className="flex items-center justify-center h-9 w-9 rounded-lg bg-transparent text-[hsl(var(--text-secondary))]"
        aria-label="Toggle theme"
      >
        <Sun className="h-[18px] w-[18px]" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative flex items-center justify-center h-9 w-9 rounded-lg",
        "text-[hsl(var(--text-secondary))]",
        "hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))]",
        "transition-colors duration-200",
        "outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg-base))]"
      )}
      aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
    >
      {/* Sun icon */}
      <Sun
        className={cn(
          "h-[18px] w-[18px] transition-all duration-300 ease-out",
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        )}
      />
      {/* Moon icon */}
      <Moon
        className={cn(
          "absolute h-[18px] w-[18px] transition-all duration-300 ease-out",
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        )}
      />
      <span className="sr-only">
        {isDark ? "Activer le mode clair" : "Activer le mode sombre"}
      </span>
    </button>
  );
}

/**
 * Advanced theme switcher with three states (light, dark, system)
 * Use this if you want to give users the system option
 */
export function ModeToggleAdvanced() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[hsl(var(--bg-muted))]">
        <div className="h-7 w-7 rounded-md" />
        <div className="h-7 w-7 rounded-md" />
        <div className="h-7 w-7 rounded-md" />
      </div>
    );
  }

  const options = [
    { value: "light", icon: Sun, label: "Clair" },
    { value: "dark", icon: Moon, label: "Sombre" },
    { value: "system", icon: Monitor, label: "Système" },
  ];

  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-lg bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]"
      role="radiogroup"
      aria-label="Sélectionner le thème"
    >
      {options.map((option) => {
        const isActive = theme === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            role="radio"
            aria-checked={isActive}
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-md transition-all duration-200",
              isActive
                ? "bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))] shadow-sm"
                : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-secondary))]"
            )}
            aria-label={option.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

export default ModeToggle;
