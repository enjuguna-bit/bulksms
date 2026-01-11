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

  // Mark router ready shortly after mount (reduced from 150ms to 10ms for release compatibility)
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), __DEV__ ? 50 : 10);
    return () => clearTimeout(timer);
  }, []);

  // Safe push → navigate()
  const safePush = useCallback(
    (screen: string, params?: Record<string, any>) => {
      // Debug Log
      if (__DEV__) {
        console.log(`[NAV] Safe push to ${screen}`, params);
      }

      if (!ready) {
        console.warn(`[useSafeRouter] push blocked until ready (${screen})`);
        // In release builds, try again after a short delay
        if (!__DEV__) {
          setTimeout(() => {
            if (ready) {
              console.log(`[NAV] Retry navigation to ${screen}`);
              navigation.navigate(screen, params);
            }
          }, 100);
        }
        return;
      }

      // Validation similar to the requested SafeRouter
      const safeParams = { ...params };
      if (screen === 'ChatScreen' || screen.includes('chat')) {
        if (!safeParams.threadId && safeParams.address) {
          safeParams.threadId = safeParams.address;
        }
        if (!safeParams.address) {
          safeParams.address = 'Unknown';
        }
      }

      try {
        navigation.navigate(screen, safeParams);
      } catch (e) {
        console.error("[useSafeRouter] push error:", e);
        console.error("[useSafeRouter] Screen:", screen, "Params:", safeParams);
        // In release builds, show user-friendly error
        if (!__DEV__) {
          alert(`Navigation failed. Please try again.`);
        }
      }
    },
    [navigation, ready]
  );

  // Safe replace → navigation.reset()
  const safeReplace = useCallback(
    (screen: string, params?: Record<string, any>) => {
      if (__DEV__) console.log(`[NAV] Safe replace to ${screen}`, params);

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
    if (__DEV__) console.log('[NAV] Back');
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        console.warn('[useSafeRouter] Cannot go back');
      }
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
