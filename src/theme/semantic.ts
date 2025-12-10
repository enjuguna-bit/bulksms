// ------------------------------------------------------
// src/theme/semantic.ts
// Semantic color mapping for easier usage
// ------------------------------------------------------

import { colors } from "./colors";

export const semantic = {
  textPrimary: colors.gray900,
  textSecondary: colors.gray600,
  cardBackground: colors.white,
  appBackground: colors.background,
  border: colors.border,
  success: colors.success500,
  error: colors.error500,
  warning: colors.warning500,
  info: colors.primary600,
  accent: colors.primary500,
} as const;

export type Semantic = typeof semantic;
