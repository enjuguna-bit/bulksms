// -----------------------------------------------------
// app/Startup.tsx — Handles SMS Role prompt on launch
// React Navigation version (no expo-router)
// -----------------------------------------------------

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  StatusBar,
} from "react-native";

import { useSafeRouter } from "@/hooks/useSafeRouter";
import { useRole } from "@/hooks/useRole";
import { useThemeSettings } from "@/theme/ThemeProvider";

export default function Startup() {
  const router = useSafeRouter();
  const { isDefault, loading: roleLoading, requestRole } = useRole();
  const { colors, theme } = useThemeSettings();
  const isDark = theme === "dark";
  const [prompted, setPrompted] = useState(false);

  useEffect(() => {
    if (roleLoading) return;

    if (isDefault) {
      // Small delay to ensure navigation is ready and smooth transition
      const timer = setTimeout(() => {
        router.safeReplace("Tabs");
      }, 100);
      return () => clearTimeout(timer);
    }

    if (!prompted) {
      setPrompted(true);
      Alert.alert(
        "Default SMS Required",
        "To send and receive messages, set this app as your default SMS handler.",
        [
          {
            text: "Set Now",
            onPress: () => {
              requestRole();
              // We'll rely on the hook's AppState listener to detect when they return
              // and update isDefault, which will trigger the effect again.
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [isDefault, roleLoading, prompted, router, requestRole]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={[styles.text, { color: colors.text }]}>
        {roleLoading
          ? "Preparing SMS Manager…"
          : "Waiting for you to set this app as default SMS…"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 24,
    fontWeight: "500",
  },
});
