// ------------------------------------------------------
// src/theme/index.ts
// Root theme object & provider
// ------------------------------------------------------

import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";
import { radius } from "./radius";
import { semantic } from "./semantic";

export const theme = {
  colors,
  spacing,
  typography,
  radius,
  semantic,
} as const;

export type Theme = typeof theme;
