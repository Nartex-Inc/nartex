// src/lib/theme-tokens.ts
// NARTEX — Cutting-Edge SaaS Design Tokens

export const THEME = {
  dark: {
    // Backgrounds
    bgBase: "hsl(220, 13%, 5%)",
    bgSurface: "hsl(220, 13%, 8%)",
    bgElevated: "hsl(220, 13%, 11%)",
    bgMuted: "hsl(220, 13%, 14%)",

    // Borders
    borderSubtle: "hsl(220, 13%, 15%)",
    borderDefault: "hsl(220, 13%, 18%)",
    borderEmphasis: "hsl(220, 13%, 24%)",

    // Text
    textPrimary: "hsl(0, 0%, 98%)",
    textSecondary: "hsl(220, 10%, 70%)",
    textTertiary: "hsl(220, 10%, 50%)",
    textMuted: "hsl(220, 10%, 35%)",

    // Accent
    accent: "hsl(187, 100%, 50%)",
    accentHover: "hsl(187, 100%, 45%)",
    accentMuted: "hsl(187, 50%, 20%)",

    // Semantic
    success: "hsl(152, 69%, 50%)",
    successMuted: "hsl(152, 40%, 15%)",
    warning: "hsl(38, 92%, 50%)",
    warningMuted: "hsl(38, 50%, 15%)",
    danger: "hsl(0, 72%, 55%)",
    dangerMuted: "hsl(0, 40%, 15%)",

    // Chart
    grid: "hsl(220, 13%, 18%)",
    tooltipBg: "hsl(220, 13%, 11%)",
    tooltipBorder: "hsl(220, 13%, 18%)",
  },
  light: {
    // Backgrounds
    bgBase: "hsl(220, 20%, 97%)",
    bgSurface: "hsl(0, 0%, 100%)",
    bgElevated: "hsl(220, 20%, 98%)",
    bgMuted: "hsl(220, 15%, 94%)",

    // Borders
    borderSubtle: "hsl(220, 15%, 90%)",
    borderDefault: "hsl(220, 15%, 85%)",
    borderEmphasis: "hsl(220, 15%, 75%)",

    // Text
    textPrimary: "hsl(220, 20%, 10%)",
    textSecondary: "hsl(220, 10%, 40%)",
    textTertiary: "hsl(220, 10%, 55%)",
    textMuted: "hsl(220, 10%, 70%)",

    // Accent
    accent: "hsl(187, 100%, 40%)",
    accentHover: "hsl(187, 100%, 35%)",
    accentMuted: "hsl(187, 40%, 92%)",

    // Semantic
    success: "hsl(152, 69%, 40%)",
    successMuted: "hsl(152, 40%, 92%)",
    warning: "hsl(38, 92%, 45%)",
    warningMuted: "hsl(38, 50%, 92%)",
    danger: "hsl(0, 72%, 50%)",
    dangerMuted: "hsl(0, 40%, 94%)",

    // Chart
    grid: "hsl(220, 15%, 88%)",
    tooltipBg: "hsl(0, 0%, 100%)",
    tooltipBorder: "hsl(220, 15%, 88%)",
  },
} as const;

export type ThemeMode = keyof typeof THEME;
export type ThemeTokens = (typeof THEME)[ThemeMode];

// Chart colors - vibrant & professional
export const CHART_COLORS = {
  dark: [
    "hsl(187, 100%, 50%)",   // Cyan (primary)
    "hsl(280, 80%, 60%)",    // Purple
    "hsl(152, 69%, 50%)",    // Emerald
    "hsl(38, 92%, 50%)",     // Amber
    "hsl(340, 75%, 55%)",    // Rose
    "hsl(210, 100%, 55%)",   // Blue
    "hsl(25, 95%, 55%)",     // Orange
    "hsl(160, 70%, 45%)",    // Teal
  ],
  light: [
    "hsl(187, 100%, 40%)",
    "hsl(280, 80%, 50%)",
    "hsl(152, 69%, 40%)",
    "hsl(38, 92%, 45%)",
    "hsl(340, 75%, 48%)",
    "hsl(210, 100%, 48%)",
    "hsl(25, 95%, 48%)",
    "hsl(160, 70%, 38%)",
  ],
} as const;

// Legacy exports for compatibility
export const PIE_COLORS_DARK = CHART_COLORS.dark;
export const PIE_COLORS_LIGHT = CHART_COLORS.light;
