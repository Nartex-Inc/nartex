// src/components/accent-color-provider.tsx
"use client";

import * as React from "react";

/**
 * Accent preset type definition
 */
export type AccentPreset = {
  readonly name: string;
  readonly light: string;
  readonly dark: string;
  readonly muted: {
    readonly light: string;
    readonly dark: string;
  };
};

/**
 * Available accent color presets
 * Each has light and dark variants for optimal contrast
 */
export const ACCENT_PRESETS: Record<string, AccentPreset> = {
  green: {
    name: "Émeraude",
    light: "#1DB954",
    dark: "#1ED760",
    muted: { light: "#E8F8ED", dark: "#1A3D2A" },
  },
  red: {
    name: "Rubis",
    light: "#DC2626",
    dark: "#EF4444",
    muted: { light: "#FEE2E2", dark: "#3D1A1A" },
  },
  blue: {
    name: "Saphir",
    light: "#2563EB",
    dark: "#3B82F6",
    muted: { light: "#DBEAFE", dark: "#1A2A3D" },
  },
  purple: {
    name: "Améthyste",
    light: "#7C3AED",
    dark: "#A78BFA",
    muted: { light: "#EDE9FE", dark: "#2D1A3D" },
  },
  orange: {
    name: "Ambre",
    light: "#EA580C",
    dark: "#FB923C",
    muted: { light: "#FFEDD5", dark: "#3D2A1A" },
  },
  pink: {
    name: "Rose",
    light: "#DB2777",
    dark: "#F472B6",
    muted: { light: "#FCE7F3", dark: "#3D1A2D" },
  },
  teal: {
    name: "Turquoise",
    light: "#0D9488",
    dark: "#2DD4BF",
    muted: { light: "#CCFBF1", dark: "#1A3D3A" },
  },
  indigo: {
    name: "Indigo",
    light: "#4F46E5",
    dark: "#818CF8",
    muted: { light: "#E0E7FF", dark: "#1A1A3D" },
  },
};

export type AccentColorKey = keyof typeof ACCENT_PRESETS;

type AccentColorContextType = {
  accentKey: AccentColorKey;
  setAccentKey: (key: AccentColorKey) => void;
  accent: AccentPreset;
};

const AccentColorContext = React.createContext<AccentColorContextType | undefined>(undefined);

const STORAGE_KEY = "sinto-accent-color";

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const [accentKey, setAccentKeyState] = React.useState<AccentColorKey>("green");
  const [mounted, setMounted] = React.useState(false);

  // Load from localStorage on mount
  React.useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in ACCENT_PRESETS) {
      setAccentKeyState(stored as AccentColorKey);
    }
  }, []);

  // Update CSS variables when accent changes
  React.useEffect(() => {
    if (!mounted) return;
    
    const preset = ACCENT_PRESETS[accentKey];
    const root = document.documentElement;
    
    // Set CSS custom properties for both light and dark modes
    root.style.setProperty("--accent-light", preset.light);
    root.style.setProperty("--accent-dark", preset.dark);
    root.style.setProperty("--accent-muted-light", preset.muted.light);
    root.style.setProperty("--accent-muted-dark", preset.muted.dark);
    
    // Also set the current accent based on theme
    const isDark = root.classList.contains("dark");
    root.style.setProperty("--accent-current", isDark ? preset.dark : preset.light);
    root.style.setProperty("--accent-muted-current", isDark ? preset.muted.dark : preset.muted.light);
  }, [accentKey, mounted]);

  // Listen for theme changes to update current accent
  React.useEffect(() => {
    if (!mounted) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const preset = ACCENT_PRESETS[accentKey];
          const root = document.documentElement;
          const isDark = root.classList.contains("dark");
          root.style.setProperty("--accent-current", isDark ? preset.dark : preset.light);
          root.style.setProperty("--accent-muted-current", isDark ? preset.muted.dark : preset.muted.light);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [accentKey, mounted]);

  const setAccentKey = React.useCallback((key: AccentColorKey) => {
    setAccentKeyState(key);
    localStorage.setItem(STORAGE_KEY, key);
  }, []);

  const value: AccentColorContextType = React.useMemo(
    () => ({
      accentKey,
      setAccentKey,
      accent: ACCENT_PRESETS[accentKey],
    }),
    [accentKey, setAccentKey]
  );

  return (
    <AccentColorContext.Provider value={value}>
      {children}
    </AccentColorContext.Provider>
  );
}

export function useAccentColor() {
  const context = React.useContext(AccentColorContext);
  if (!context) {
    throw new Error("useAccentColor must be used within AccentColorProvider");
  }
  return context;
}

/**
 * Hook to get the current accent color based on theme
 */
export function useCurrentAccent() {
  const { accent } = useAccentColor();
  const [mounted, setMounted] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
    
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return { color: accent.light, muted: accent.muted.light };
  }

  return {
    color: isDark ? accent.dark : accent.light,
    muted: isDark ? accent.muted.dark : accent.muted.light,
  };
}
