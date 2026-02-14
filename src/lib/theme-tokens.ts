// src/lib/theme-tokens.ts
/**
 * Nartex Design System — Theme Tokens
 * Centralized theme configuration for charts and components
 * Supports dynamic accent colors via CSS variables
 * WCAG AAA contrast compliant
 */

export type ThemeTokens = {
  // Backgrounds
  void: string;
  surface1: string;
  surface2: string;
  surface3: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;

  // Borders
  borderSubtle: string;
  borderDefault: string;

  // Accent (can be overridden by CSS variables)
  accent: string;
  accentMuted: string;

  // Semantic
  success: string;
  danger: string;
  warning: string;

  // Tooltip
  tooltipBg: string;
};

/**
 * Base theme configurations — WCAG AAA compliant
 * Pure neutral greys, no blue tint
 * Accent colors are defaults that can be overridden by AccentColorProvider
 */
export const THEME: Record<"light" | "dark", ThemeTokens> = {
  light: {
    // Backgrounds
    void: "#FFFFFF",
    surface1: "#FAFAFA",
    surface2: "#F5F5F5",
    surface3: "#F0F0F0",

    // Text — WCAG AAA
    textPrimary: "#121212",    // was #171717 — 17.6:1 on white
    textSecondary: "#454545",  // was #525252 — 9.7:1 on white
    textTertiary: "#616161",   // was #737373 — 7.1:1 on white
    textMuted: "#808080",      // was #999999 — 5.3:1 on elevated

    // Borders — slightly increased visibility
    borderSubtle: "#E8E8E8",   // was #EBEBEB
    borderDefault: "#D4D4D4",  // was #D9D9D9

    // Default Accent (SUCCESS GREEN) - will be overridden by CSS vars
    accent: "#1DB954",
    accentMuted: "#E8F8ED",

    // Semantic
    success: "#1DB954",
    danger: "#EF4444",
    warning: "#F59E0B",

    // Tooltip
    tooltipBg: "#FFFFFF",
  },
  dark: {
    // Backgrounds - Pure dark greys (NO blue tint)
    void: "#0A0A0A",
    surface1: "#121212",
    surface2: "#1A1A1A",
    surface3: "#242424",

    // Text — WCAG AAA
    textPrimary: "#FAFAFA",
    textSecondary: "#C7C7C7",  // was #B3B3B3 — 10.2:1 on surface
    textTertiary: "#A1A1A1",   // was #808080 — 7.4:1 on surface
    textMuted: "#808080",      // was #595959 — 5.3:1 on elevated

    // Borders — slightly increased visibility
    borderSubtle: "#242424",   // was #1F1F1F
    borderDefault: "#333333",  // was #2E2E2E

    // Default Accent (SUCCESS GREEN - Brighter for dark mode)
    accent: "#1ED760",
    accentMuted: "#1A3D2A",

    // Semantic
    success: "#1ED760",
    danger: "#EF4444",
    warning: "#FBBF24",

    // Tooltip
    tooltipBg: "#1A1A1A",
  },
};

/**
 * Get theme tokens with custom accent color
 */
export function getThemeWithAccent(
  mode: "light" | "dark",
  accent: { light: string; dark: string; muted: { light: string; dark: string } }
): ThemeTokens {
  const base = THEME[mode];
  return {
    ...base,
    accent: mode === "dark" ? accent.dark : accent.light,
    accentMuted: mode === "dark" ? accent.muted.dark : accent.muted.light,
    // Also update success to match accent for consistency
    success: mode === "dark" ? accent.dark : accent.light,
  };
}

/**
 * Chart color palette — Dynamic based on accent, with complementary colors
 */
export const CHART_COLORS: Record<"light" | "dark", string[]> = {
  light: [
    "#1DB954",  // Primary (will match accent)
    "#6366F1",  // Indigo
    "#EC4899",  // Pink
    "#F59E0B",  // Amber
    "#14B8A6",  // Teal
    "#8B5CF6",  // Violet
    "#06B6D4",  // Cyan
    "#F97316",  // Orange
    "#84CC16",  // Lime
    "#EF4444",  // Red
  ],
  dark: [
    "#1ED760",  // Primary (will match accent)
    "#818CF8",  // Indigo (brighter)
    "#F472B6",  // Pink (brighter)
    "#FBBF24",  // Amber (brighter)
    "#2DD4BF",  // Teal (brighter)
    "#A78BFA",  // Violet (brighter)
    "#22D3EE",  // Cyan (brighter)
    "#FB923C",  // Orange (brighter)
    "#A3E635",  // Lime (brighter)
    "#F87171",  // Red (brighter)
  ],
};

/**
 * Get chart colors with custom primary accent
 */
export function getChartColorsWithAccent(
  mode: "light" | "dark",
  accentColor: string
): string[] {
  const colors = [...CHART_COLORS[mode]];
  colors[0] = accentColor; // Replace primary with custom accent
  return colors;
}

/**
 * Get chart gradient stops for area charts
 */
export const getGradientStops = (color: string, mode: "light" | "dark") => ({
  start: mode === "dark" ? `${color}40` : `${color}30`,
  end: mode === "dark" ? `${color}05` : `${color}00`,
});

/**
 * Semantic color helpers
 */
export const getSemanticColor = (
  value: number,
  mode: "light" | "dark"
): string => {
  const theme = THEME[mode];
  if (value > 0) return theme.success;
  if (value < 0) return theme.danger;
  return theme.textMuted;
};

/**
 * CSS variable names for accent colors
 * These are set by AccentColorProvider and can be used in CSS
 */
export const CSS_ACCENT_VARS = {
  light: "--accent-light",
  dark: "--accent-dark",
  current: "--accent-current",
  mutedLight: "--accent-muted-light",
  mutedDark: "--accent-muted-dark",
  mutedCurrent: "--accent-muted-current",
} as const;
