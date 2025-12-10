// src/components/ProtectedRoute.tsx
import React, { useEffect, useState, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from "react-native";

import { useSafeRouter } from "@/hooks/useSafeRouter";
import { useBilling } from "@/providers/BillingProvider";
import { isDefaultSmsApp } from "@/services/defaultSmsRole";
import { CONFIG } from "@/constants/config";

const DEVELOPER_BYPASS = CONFIG.DEVELOPER_BYPASS;

type BillingStatus =
  | "none"
  | "trial"
  | "active"
  | "loading"
  | "expired"
  | "inactive";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps): JSX.Element {
  const router = useSafeRouter();
  const { status, isPro, trialDaysLeft } = useBilling();
  const [defaultSms, setDefaultSms] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [smsOk, setSmsOk] = useState(false);
  const [checkingSmsRole, setCheckingSmsRole] = useState(true);

  // Run SMS role check on mount
  useEffect(() => {
    const check = async () => {
      try {
        const ok = await isDefaultSmsApp();
        setSmsOk(ok);
      } catch (e) {
        console.warn("[ProtectedRoute] SMS role check failed:", e);
        setSmsOk(true); // dev fallback
      } finally {
        setCheckingSmsRole(false);
        setLoading(false);
      }
    };
    check();
  }, []);

  // Recheck when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      async (state: AppStateStatus) => {
        if (state === "active") {
          try {
            const ok = await isDefaultSmsApp();
            setSmsOk(ok);
          } catch (e) {
            console.warn("[ProtectedRoute] Foreground SMS check failed:", e);
            setSmsOk(true);
          }
        }
      }
    );
    return () => sub.remove();
  }, []);

  // LOADING UI
  if (checkingSmsRole || status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={styles.message}>Preparing your app…</Text>
      </View>
    );
  }

  // ❌ NOT DEFAULT SMS APP (only enforce in production)
  if (!smsOk && CONFIG.IS_DEV_MODE === false) {
    router.safeReplace("Startup");
    return <></>; // ✅ FIXED
  }

  // ❌ SUBSCRIPTION EXPIRED (unless dev bypass)
  if (!isPro && (status === "expired" || status === "inactive") && !DEVELOPER_BYPASS) {
    router.safeReplace("Paywall");
    return <></>; // ✅ FIXED
  }

  // ✅ All checks passed
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  message: {
    textAlign: "center",
    marginBottom: 16,
  },
});
