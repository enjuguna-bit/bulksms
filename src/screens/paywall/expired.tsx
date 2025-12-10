// src/screens/expired.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { useSafeRouter } from "@/hooks/useSafeRouter";
import { getLocalPlanInfo } from "@/services/activation";

export default function ExpiredScreen() {
  const router = useSafeRouter();
  const [planInfo, setPlanInfo] = useState<{ plan?: string; trialEnd?: number }>({});

  useEffect(() => {
    (async () => {
      const info = await getLocalPlanInfo();
      setPlanInfo(info);
    })();
  }, []);

  const expiryText = planInfo.trialEnd
    ? new Date(planInfo.trialEnd).toLocaleDateString()
    : undefined;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Your {planInfo.plan ?? "trial"} has ended
      </Text>

      {expiryText && (
        <Text style={styles.subtitle}>Expired on {expiryText}</Text>
      )}

      <Text style={styles.subtitle}>
        Subscribe or renew to continue using the app.
      </Text>

      <TouchableOpacity
        onPress={() => router.safeReplace("Paywall")}
        style={styles.paywallButton}
      >
        <Text style={styles.paywallText}>Open Paywall</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.safePush("Settings")}
        style={styles.settingsButton}
      >
        <Text style={styles.settingsText}>Go to Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    color: "#0f172a",
  },
  subtitle: {
    textAlign: "center",
    color: "#64748b",
    marginBottom: 16,
  },
  paywallButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#2563eb",
    backgroundColor: "#2563eb",
    width: "80%",
    alignItems: "center",
  },
  paywallText: {
    color: "#fff",
    fontWeight: "600",
  },
  settingsButton: {
    padding: 12,
    marginTop: 8,
  },
  settingsText: {
    color: "#2563eb",
    fontWeight: "600",
  },
});
