// src/components/TrialGate.tsx
import React, { useEffect, useRef, ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
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

interface TrialGateProps {
  children?: ReactNode;
}

export default function TrialGate({ children }: TrialGateProps) {
  const router = useSafeRouter();
  const { status, isPro } = useBilling() as {
    status: BillingStatus;
    isPro: boolean;
  };

  const didRedirect = useRef(false);

  const bypass = DEVELOPER_BYPASS;

  const isExpired =
    status === "none" || status === "inactive" || status === "expired";

  useEffect(() => {
    if (didRedirect.current) return;
    if (bypass) return;

    if (isExpired && !isPro) {
      didRedirect.current = true;
      // Safe navigation: wrap in try-catch to handle cases where NavigationContainer isn't ready
      try {
        router.safeReplace("Paywall");
      } catch (error) {
        console.warn("[TrialGate] Navigation error:", error);
        // Navigation will be retried on next render if still needed
        didRedirect.current = false;
      }
    }
  }, [isExpired, isPro, router, bypass]);

  // LOADING screen (skip if bypass)
  if (!bypass && status === "loading") {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Checking subscription…</Text>
      </View>
    );
  }

  // If active, trial, or bypass — allow
  if (bypass || isPro || status === "trial") {
    return <>{children}</>;
  }

  // Fallback when redirecting
  return (
    <View style={styles.center}>
      <Text style={styles.loadingText}>Redirecting to paywall…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b1220",
  },
  loadingText: {
    color: "#9db0d3",
    fontSize: 16,
  },
});
