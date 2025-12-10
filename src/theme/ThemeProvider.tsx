
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ColorSchemeName, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors as tokens } from "./colors";

type ThemeMode = "system" | "light" | "dark";
export type ThemePalette = {
  background: string;
  text: string;
  subText: string;
  card: string;
  border: string;
  accent: string;
  chip: string;
  surface: string;
  success: string;
  error: string;
  warning: string;
  primary600: string;
  gradientPrimary: string[];
  gradientSuccess: string[];
  gradientError: string[];
  gradientWarning: string[];
  shadow: any;
};

type ThemeContextType = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  largeText: boolean;
  setLargeText: (v: boolean) => void;
  scheme: Exclude<ColorSchemeName, "no-preference">;
  theme: "light" | "dark";
  colors: ThemePalette;
};

const STORAGE_KEYS = {
  mode: "theme.mode",
  highContrast: "theme.highContrast",
  largeText: "theme.largeText",
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const sys = useColorScheme();

  // Initialize with defaults
  const [mode, setMode] = useState<ThemeMode>("system");
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    (async () => {
      try {
        const [m, h, l] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.mode),
          AsyncStorage.getItem(STORAGE_KEYS.highContrast),
          AsyncStorage.getItem(STORAGE_KEYS.largeText),
        ]);

        if (m === "system" || m === "light" || m === "dark") {
          setMode(m);
        }
        if (h) setHighContrast(h === "true");
        if (l) setLargeText(l === "true");
      } catch (e) {
        console.warn("Failed to load theme settings", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Persist settings
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.mode, mode).catch(console.warn);
  }, [mode, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.highContrast, String(highContrast)).catch(console.warn);
  }, [highContrast, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.largeText, String(largeText)).catch(console.warn);
  }, [largeText, loaded]);

  const scheme = useMemo(() => {
    if (mode === "system") return (sys ?? "light") as "light" | "dark";
    return mode;
  }, [mode, sys]);

  const theme = scheme;

  const colors = useMemo<ThemePalette>(() => {
    const isDark = theme === "dark";
    const base: ThemePalette = {
      background: isDark ? tokens.gray900 : tokens.background,
      text: isDark ? tokens.white : tokens.gray900,
      subText: isDark ? tokens.gray400 : tokens.gray600,
      card: isDark ? tokens.gray800 : tokens.white,
      border: isDark ? tokens.gray700 : tokens.border,
      accent: tokens.primary600,
      chip: isDark ? tokens.primary700 : tokens.primary200,
      surface: isDark ? tokens.gray800 : tokens.white,
      success: tokens.success500,
      error: tokens.error500,
      warning: tokens.warning500,
      primary600: tokens.primary600,
      gradientPrimary: tokens.gradientPrimary,
      gradientSuccess: tokens.gradientSuccess,
      gradientError: tokens.gradientError,
      gradientWarning: tokens.gradientWarning,
      shadow: tokens.shadow,
    };

    if (highContrast) {
      return {
        ...base,
        background: isDark ? "#000000" : "#ffffff",
        text: isDark ? "#ffffff" : "#000000",
        subText: isDark ? tokens.gray200 : tokens.gray800,
        border: isDark ? tokens.gray400 : tokens.gray600,
      };
    }

    return base;
  }, [theme, highContrast]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      highContrast,
      setHighContrast,
      largeText,
      setLargeText,
      scheme,
      theme,
      colors,
    }),
    [mode, highContrast, largeText, scheme, theme, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeSettings = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeSettings must be used within ThemeProvider");
  return ctx;
};
