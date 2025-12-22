// ------------------------------------------------------
// src/theme/colors.ts
// Central color palette for all screens
// ------------------------------------------------------

export const colors = {
  // Base
  white: "#ffffff",
  black: "#000000",
  background: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",

  // Primary (Enhanced Blue - Default)
  primary50: "#eff6ff",
  primary100: "#dbeafe",
  primary200: "#bfdbfe",
  primary300: "#93c5fd",
  primary400: "#60a5fa",
  primary500: "#3b82f6",
  primary600: "#2563eb",
  primary700: "#1d4ed8",
  primary800: "#1e40af",
  primary900: "#1e3a8a",

  // Premium Gradients
  gradientPrimary: ["#667eea", "#764ba2"],
  gradientSuccess: ["#16a34a", "#15803d"],
  gradientError: ["#dc2626", "#b91c1c"],
  gradientWarning: ["#f59e0b", "#d97706"],

  // Success (Green)
  success50: "#f0fdf4",
  success100: "#dcfce7",
  success500: "#16a34a",
  success600: "#15803d",
  success700: "#166534",

  // Error (Red)
  error50: "#fef2f2",
  error100: "#fee2e2",
  error500: "#dc2626",
  error600: "#b91c1c",
  error700: "#991b1b",

  // Warning (Amber)
  warning50: "#fffbeb",
  warning100: "#fef9c3",
  warning500: "#ca8a04",
  warning600: "#a16207",
  warning700: "#854d0e",

  // Neutral (Enhanced Gray Scale)
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#475569",
  gray700: "#334155",
  gray800: "#1e293b",
  gray900: "#0f172a",

  // Premium Colors
  purple: "#8b5cf6",
  purpleDark: "#6d28d9",
  teal: "#14b8a6",
  tealDark: "#0f766e",
  indigo: "#6366f1",
  indigoDark: "#4f46e5",

  // Shadows
  shadow: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 10,
    },
  },

  // Kenya / Safaricom Specific Palettes
  kenya: {
    // Light Mode (Kenya Green)
    light: {
      primary: "#006600",
      primaryDark: "#004400",
      accent: "#FF9900", // Kenya Orange
      background: "#FFFFFF",
      surface: "#F5F5F5",
      text: "#333333",
      subText: "#666666",
      card: "#FFFFFF",
      border: "#e5e7eb"
    },
    // Dark Mode (Brighter Green)
    dark: {
      primary: "#009900",
      primaryDark: "#007700",
      accent: "#FFAA00",
      background: "#121212",
      surface: "#1E1E1E",
      text: "#E0E0E0",
      subText: "#AAAAAA",
      card: "#2D2D2D",
      border: "#404040"
    },
    // Safaricom Theme
    safaricom: {
      primary: "#43B02A", // Official Safaricom Green
      primaryDark: "#008C3E",
      accent: "#F37021", // M-Pesa Orange
      background: "#FFFFFF",
      surface: "#F0F9F4", // Light minty green surface
      text: "#333333",
      subText: "#666666",
      card: "#FFFFFF",
      border: "#e2e8f0"
    }
  }
};
