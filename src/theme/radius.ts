// ------------------------------------------------------
// src/theme/radius.ts
// Rounded corners scale
// ------------------------------------------------------

export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export type Radius = typeof radius;
