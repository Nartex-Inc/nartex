// src/lib/theme-tokens.ts
// NARTEX — Dark Luxe Terminal Design System

export const THEME = {
  dark: {
    // Surfaces
    void: "hsl(0, 0%, 4%)",
    surface0: "hsl(0, 0%, 6%)",
    surface1: "hsl(0, 0%, 9%)",
    surface2: "hsl(0, 0%, 12%)",
    surface3: "hsl(0, 0%, 16%)",

    // Borders
    borderSubtle: "hsl(0, 0%, 14%)",
    borderDefault: "hsl(0, 0%, 18%)",
    borderEmphasis: "hsl(0, 0%, 24%)",

    // Text
    textPrimary: "hsl(0, 0%, 98%)",
    textSecondary: "hsl(0, 0%, 70%)",
    textTertiary: "hsl(0, 0%, 45%)",
    textMuted: "hsl(0, 0%, 32%)",

    // Accent
    accent: "hsl(187, 100%, 50%)",
    accentMuted: "hsl(187, 80%, 35%)",
    accentSubtle: "hsl(187, 60%, 15%)",

    // Semantic
    success: "hsl(142, 76%, 46%)",
    successMuted: "hsl(142, 50%, 20%)",
    warning: "hsl(38, 92%, 50%)",
    warningMuted: "hsl(38, 60%, 20%)",
    danger: "hsl(0, 84%, 60%)",
    dangerMuted: "hsl(0, 50%, 20%)",

    // Chart grid
    grid: "hsl(0, 0%, 18%)",

    // Tooltip
    tooltipBg: "hsl(0, 0%, 12%)",
    tooltipBorder: "hsl(0, 0%, 18%)",
  },
  light: {
    // Surfaces
    void: "hsl(0, 0%, 100%)",
    surface0: "hsl(0, 0%, 98%)",
    surface1: "hsl(0, 0%, 100%)",
    surface2: "hsl(0, 0%, 96%)",
    surface3: "hsl(0, 0%, 92%)",

    // Borders
    borderSubtle: "hsl(0, 0%, 92%)",
    borderDefault: "hsl(0, 0%, 88%)",
    borderEmphasis: "hsl(0, 0%, 82%)",

    // Text
    textPrimary: "hsl(0, 0%, 9%)",
    textSecondary: "hsl(0, 0%, 35%)",
    textTertiary: "hsl(0, 0%, 50%)",
    textMuted: "hsl(0, 0%, 65%)",

    // Accent
    accent: "hsl(187, 100%, 38%)",
    accentMuted: "hsl(187, 60%, 85%)",
    accentSubtle: "hsl(187, 40%, 95%)",

    // Semantic
    success: "hsl(142, 76%, 36%)",
    successMuted: "hsl(142, 50%, 90%)",
    warning: "hsl(38, 92%, 45%)",
    warningMuted: "hsl(38, 60%, 90%)",
    danger: "hsl(0, 84%, 50%)",
    dangerMuted: "hsl(0, 50%, 92%)",

    // Chart grid
    grid: "hsl(0, 0%, 88%)",

    // Tooltip
    tooltipBg: "hsl(0, 0%, 100%)",
    tooltipBorder: "hsl(0, 0%, 88%)",
  },
} as const;

export type ThemeMode = keyof typeof THEME;
export type ThemeTokens = (typeof THEME)[ThemeMode];

// Chart colors - sophisticated palette for data visualization
export const CHART_COLORS = {
  dark: [
    "hsl(187, 100%, 50%)",  // Cyan (primary)
    "hsl(262, 83%, 58%)",   // Violet
    "hsl(142, 76%, 46%)",   // Emerald
    "hsl(38, 92%, 50%)",    // Amber
    "hsl(340, 82%, 52%)",   // Rose
    "hsl(200, 98%, 39%)",   // Blue
    "hsl(24, 95%, 53%)",    // Orange
    "hsl(280, 65%, 60%)",   // Purple
  ],
  light: [
    "hsl(187, 100%, 38%)",
    "hsl(262, 83%, 48%)",
    "hsl(142, 76%, 36%)",
    "hsl(38, 92%, 45%)",
    "hsl(340, 82%, 45%)",
    "hsl(200, 98%, 35%)",
    "hsl(24, 95%, 48%)",
    "hsl(280, 65%, 50%)",
  ],
} as const;

// For backwards compatibility
export const PIE_COLORS_DARK = CHART_COLORS.dark;
export const PIE_COLORS_LIGHT = CHART_COLORS.light;

// Gradient presets
export const GRADIENTS = {
  accent: "linear-gradient(135deg, hsl(187, 100%, 50%) 0%, hsl(262, 83%, 58%) 100%)",
  success: "linear-gradient(135deg, hsl(142, 76%, 46%) 0%, hsl(187, 100%, 50%) 100%)",
  danger: "linear-gradient(135deg, hsl(0, 84%, 60%) 0%, hsl(38, 92%, 50%) 100%)",
  surface: "linear-gradient(135deg, hsl(0, 0%, 9%) 0%, hsl(0, 0%, 12%) 100%)",
} as const;
