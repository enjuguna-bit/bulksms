// -----------------------------------------------------
// app/index.tsx — Safe entry point redirect with Dev Bypass
// React Native CLI version (no expo-router)
// -----------------------------------------------------

import "../polyfills";

import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

import { useSafeRouter } from "@/hooks/useSafeRouter";
import { CONFIG } from "@/constants/config";

const DEVELOPER_BYPASS = CONFIG.DEVELOPER_BYPASS;

export default function Index() {
  const [ready, setReady] = useState(false);
  const router = useSafeRouter();

  // Target screen (compute before any hook or return)
  const target = DEVELOPER_BYPASS ? "Tabs" : "Startup";

  // Warm-up delay
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Safe redirect once router + warm-up are ready
  useEffect(() => {
    if (ready && router.ready) {
      router.safeReplace(target);
    }
  }, [ready, router.ready, router, target]);

  // Splash while warming up or router not ready
  const showSplash = !ready || !router.ready;

  if (showSplash) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  // Just in case routing is slow — keep fallback
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#007aff" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
