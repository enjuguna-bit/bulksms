// src/components/SubscriptionGate.tsx
import React, { useEffect, useRef, ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { useSafeRouter } from "@/hooks/useSafeRouter";
import { useBilling } from "@/providers/BillingProvider";
import { CONFIG } from "@/constants/config";

const DEVELOPER_BYPASS = CONFIG.DEVELOPER_BYPASS;

type BillingStatus =
  | "none"
  | "trial"
  | "active"
  | "loading"
  | "expired"
  | "inactive";

interface SubscriptionGateProps {
  children: ReactNode;
  redirectPath?: string; // must be a screen name for RN navigation
}

export default function SubscriptionGate({
  children,
  redirectPath = "Paywall",
}: SubscriptionGateProps): JSX.Element {
  const router = useSafeRouter();
  const { isPro, status } = useBilling() as {
    isPro: boolean;
    status: BillingStatus;
  };

  const redirectedRef = useRef(false);

  const isTrial = status === "trial";
  const isExpired =
    status === "expired" || status === "none" || status === "inactive";

  useEffect(() => {
    if (DEVELOPER_BYPASS) return;

    if (isExpired && !redirectedRef.current) {
      redirectedRef.current = true;
      // Safe navigation: wrap in try-catch to handle cases where NavigationContainer isn't ready
      try {
        router.safeReplace(redirectPath);
      } catch (error) {
        console.warn("[SubscriptionGate] Navigation error:", error);
        // Navigation will be retried on next render if still needed
        redirectedRef.current = false;
      }
    }
  }, [isExpired, router, redirectPath]);

  // Loading (skip entirely if bypass enabled)
  if (status === "loading" && !DEVELOPER_BYPASS) {
    return (
      <View style={styles.container}>
        <Text style={styles.subtitle}>Checking subscription…</Text>
      </View>
    );
  }

  // Full access
  if (DEVELOPER_BYPASS || isPro || isTrial) {
    return <>{children}</>;
  }

  // Fallback UI if user lands here improperly
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Access Restricted</Text>
      <Text style={styles.subtitle}>Your trial has expired.</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          try {
            router.safeReplace(redirectPath);
          } catch (error) {
            console.warn("[SubscriptionGate] Navigation error on button press:", error);
          }
        }}
      >
        <Text style={styles.buttonText}>Go to Paywall</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007aff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
