// src/lib/theme-tokens.ts

/** Full token set for both modes */
export const THEME = {
  dark: {
    bg: "#000000",
    card: "rgba(5,7,10,0.92)",
    cardSoft: "rgba(12,14,18,0.85)",
    cardBorder: "rgba(120, 120, 130, 0.08)",
    grid: "#0f1419",
    label: "#9aa2af",
    labelMuted: "#737a86",
    foreground: "#ffffff",
    foregroundMuted: "#e5e7eb",
    accentPrimary: "#22d3ee",
    accentSecondary: "#8b5cf6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    tooltipBg: "rgba(0,0,0,0.95)",
    gradientPrimary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    gradientSuccess: "linear-gradient(135deg, #667eea 0%, #22d3ee 100%)",
    gradientDanger: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    haloCyan: "rgba(34, 211, 238, 0.10)",
    haloViolet: "rgba(139, 92, 246, 0.10)",
    soft: "rgba(255,255,255,0.01)",
  },
  light: {
    bg: "#f7f8fb",
    card: "rgba(255,255,255,0.92)",
    cardSoft: "rgba(255,255,255,0.9)",
    cardBorder: "rgba(20, 20, 25, 0.08)",
    grid: "#eaecef",
    label: "#374151",
    labelMuted: "#6b7280",
    foreground: "#0b1220",
    foregroundMuted: "#1f2937",
    accentPrimary: "#0ea5e9",
    accentSecondary: "#7c3aed",
    success: "#059669",
    warning: "#d97706",
    danger: "#dc2626",
    tooltipBg: "rgba(255,255,255,0.98)",
    gradientPrimary: "linear-gradient(135deg, #60a5fa 0%, #7c3aed 100%)",
    gradientSuccess: "linear-gradient(135deg, #60a5fa 0%, #06b6d4 100%)",
    gradientDanger: "linear-gradient(135deg, #fda4af 0%, #fb7185 100%)",
    haloCyan: "rgba(14, 165, 233, 0.12)",
    haloViolet: "rgba(124, 58, 237, 0.10)",
    soft: "rgba(0,0,0,0.02)",
  },
} as const;

export const PIE_COLORS_DARK = [
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f59e0b", // amber
  "#22d3ee", // cyan
  "#ef4444", // red
  "#a3e635", // lime
  "#f472b6", // pink
  "#6366f1", // indigo
  "#14b8a6", // teal
];

export const PIE_COLORS_LIGHT = [
  "#0284c7", // sky-700
  "#6d28d9", // violet-700
  "#059669", // emerald-600
  "#b45309", // amber-700
  "#0891b2", // cyan-700
  "#b91c1c", // red-700
  "#65a30d", // lime-600
  "#be185d", // pink-700
  "#4338ca", // indigo-700
  "#0f766e", // teal-700
];
