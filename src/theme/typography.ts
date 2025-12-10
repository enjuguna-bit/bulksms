// ------------------------------------------------------
// src/theme/typography.ts
// Font sizes, weights, and reusable text styles
// ------------------------------------------------------

export const typography = {
  fontSizes: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 20,
    "2xl": 24,
  },
  fontWeights: {
    regular: "400",
    medium: "600",
    bold: "700",
    extrabold: "900",
  },
  lineHeights: {
    tight: 1.1,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

export type Typography = typeof typography;
