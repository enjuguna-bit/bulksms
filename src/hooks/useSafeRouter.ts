// src/hooks/useSafeRouter.ts
// ------------------------------------------------------
// Safe router replacement for RN CLI + React Navigation.
// Replaces expo-router's useRouter, push, replace, ready.
// Prevents navigation before the app mount is stable.
// ------------------------------------------------------

import { useNavigation } from "@react-navigation/native";
import { useEffect, useState, useCallback } from "react";

export function useSafeRouter() {
  const navigation = useNavigation<any>();
  const [ready, setReady] = useState(false);

  // Mark router ready shortly after mount (reduced from 150ms to 50ms)
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Safe push → navigate() - REMOVED extra setTimeout for immediate navigation
  const safePush = useCallback(
    (screen: string, params?: Record<string, any>) => {
      if (!ready) {
        console.warn(`[useSafeRouter] push blocked until ready (${screen})`);
        return;
      }
      try {
        navigation.navigate(screen, params);
      } catch (e) {
        console.error("[useSafeRouter] push error:", e);
        console.error("[useSafeRouter] Screen:", screen, "Params:", params);
      }
    },
    [navigation, ready]
  );

  // Safe replace → navigation.reset() - REMOVED extra setTimeout for immediate navigation
  const safeReplace = useCallback(
    (screen: string, params?: Record<string, any>) => {
      if (!ready) {
        console.warn(`[useSafeRouter] replace blocked until ready (${screen})`);
        return;
      }
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: screen, params }],
        });
      } catch (e) {
        console.error("[useSafeRouter] replace error:", e);
        console.error("[useSafeRouter] Screen:", screen, "Params:", params);
      }
    },
    [navigation, ready]
  );

  const back = useCallback(() => {
    try {
      navigation.goBack();
    } catch (e) {
      console.error("[useSafeRouter] back error:", e);
    }
  }, [navigation]);

  return {
    ready,
    safePush,
    safeReplace,
    push: safePush,
    replace: safeReplace,
    back,
    navigate: safePush,
    navigation, // exported in case needed
  };
}
