// -------------------------------------------------------------
// 🚀 Onboarding Screen — Default SMS & Permissions Check
// -------------------------------------------------------------
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

// ❌ Removed Expo version
// import { LinearGradient } from "expo-linear-gradient";

// ✅ React Native CLI compatible gradient
// ✅ React Native CLI compatible gradient
// import LinearGradient from "react-native-linear-gradient";

import { useSafeRouter } from "@/hooks/useSafeRouter";

import { isDefaultSmsApp, promptDefaultSmsApp } from "@/services/defaultSmsRole";
import { checkAndRequestPermissions } from "@/services/permissions";
import { useThemeSettings } from "@/theme/ThemeProvider";

export default function Onboarding(): JSX.Element {
  const router = useSafeRouter();
  const { theme } = useThemeSettings();

  const [isDefault, setIsDefault] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const bgColor = theme === "dark" ? "#0f172a" : "#f8fafc";
  const textColor = theme === "dark" ? "#f1f5f9" : "#1e293b";
  const subTextColor = theme === "dark" ? "#94a3b8" : "#64748b";

  // Single point for all checks
  const runChecks = useCallback(async () => {
    const granted = await checkAndRequestPermissions();
    setPermissionsGranted(granted);

    const def = await isDefaultSmsApp();
    setIsDefault(def);
  }, []);

  useEffect(() => {
    (async () => {
      await runChecks();
      setChecking(false);
    })();
  }, [runChecks]);

  // Correct navigation (React Navigation)
  const handleContinue = useCallback(() => {
    router.safeReplace("Tabs"); // main app entry
  }, [router]);

  const handleSetDefault = useCallback(async () => {
    setLoading(true);
    await promptDefaultSmsApp();
    setIsDefault(await isDefaultSmsApp());
    setLoading(false);
  }, []);

  const handleGrantPermissions = useCallback(async () => {
    setLoading(true);
    const granted = await checkAndRequestPermissions();
    setPermissionsGranted(granted);
    setLoading(false);
  }, []);

  // Auto-continue when both checks pass
  useEffect(() => {
    if (!checking && isDefault && permissionsGranted) {
      timeoutRef.current = setTimeout(() => handleContinue(), 800);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [checking, isDefault, permissionsGranted, handleContinue]);

  if (checking) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={[styles.subText, { color: subTextColor, marginTop: 10 }]}>
          Checking app status...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={[styles.title, { color: textColor }]}>
        Welcome to SMS Manager 📩
      </Text>
      <Text style={[styles.subText, { color: subTextColor }]}>
        We need a few things before you start
      </Text>

      {!isDefault && (
        <TouchableOpacity
          onPress={handleSetDefault}
          activeOpacity={0.85}
          disabled={loading}
          style={styles.buttonWrapper}
        >
          <View
            style={[styles.button, { backgroundColor: "#2563eb" }]}
          >
            <Text style={styles.buttonText}>
              {loading ? "⏳ Setting Default..." : "📱 Set as Default SMS App"}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {!permissionsGranted && (
        <TouchableOpacity
          onPress={handleGrantPermissions}
          activeOpacity={0.85}
          disabled={loading}
          style={styles.buttonWrapper}
        >
          <View
            style={[styles.button, { backgroundColor: "#16a34a" }]}
          >
            <Text style={styles.buttonText}>
              {loading ? "⏳ Granting..." : "✅ Grant Permissions"}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={handleContinue}
        disabled={loading}
        style={styles.skip}
      >
        <Text style={[styles.skipText, { color: "#2563eb" }]}>
          Skip for now
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// styles unchanged
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subText: { fontSize: 14, marginBottom: 30, textAlign: "center" },
  buttonWrapper: { width: "100%", marginBottom: 15 },
  button: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  skip: { marginTop: 15 },
  skipText: { fontSize: 14, fontWeight: "600" },
});
