// src/lib/theme-tokens.ts
/**
 * Nartex Design System — Theme Tokens
 * Centralized theme configuration for charts and components
 * Uses SUCCESS GREEN as primary accent
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
  
  // Accent (SUCCESS GREEN)
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
 * Theme configurations — Pure neutral greys with SUCCESS GREEN accent
 */
export const THEME: Record<"light" | "dark", ThemeTokens> = {
  light: {
    // Backgrounds
    void: "#FFFFFF",
    surface1: "#FAFAFA",
    surface2: "#F5F5F5",
    surface3: "#F0F0F0",
    
    // Text
    textPrimary: "#171717",
    textSecondary: "#525252",
    textTertiary: "#737373",
    textMuted: "#999999",
    
    // Borders
    borderSubtle: "#EBEBEB",
    borderDefault: "#D9D9D9",
    
    // Accent (SUCCESS GREEN)
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
    
    // Text
    textPrimary: "#FAFAFA",
    textSecondary: "#B3B3B3",
    textTertiary: "#808080",
    textMuted: "#595959",
    
    // Borders
    borderSubtle: "#1F1F1F",
    borderDefault: "#2E2E2E",
    
    // Accent (SUCCESS GREEN - Brighter for dark mode)
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
 * Chart color palette — SUCCESS GREEN primary, complementary colors
 */
export const CHART_COLORS: Record<"light" | "dark", string[]> = {
  light: [
    "#1DB954",  // Primary green (accent)
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
    "#1ED760",  // Primary green (accent - brighter)
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
