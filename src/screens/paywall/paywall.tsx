// app/paywall.tsx
// ------------------------------------------------------
// Full Paywall with hidden 5-tap dev bypass - FINAL VERSION
// ------------------------------------------------------

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  AppState,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useBilling } from "@/providers/BillingProvider";
import { useSafeRouter } from "@/hooks/useSafeRouter";

import { smsListener } from "@/native";
import {
  getRemainingTime,
  isSubscriptionActive,
  getSubscriptionInfo,
} from "@/services/MpesaSubscriptionService";
import { activateFromEnhancedSms, cleanupExpiredPayments } from "@/services/enhancedPaymentService";

import { activatePlan, getLocalPlanInfo } from "@/services/activation";

// Dev bypass key (avoid circular import)
const DEV_BYPASS_KEY = "DEV_BYPASS_OVERRIDE";
const ADMIN_UNLOCK_KEY = "@billing.adminUnlocked";

import { MPESA_PLANS, LIPANA_PAYMENT_LINK } from "@/constants/mpesa";

// New Components
import { PaywallHeader } from "@/components/paywall/PaywallHeader";
import { PaywallStatus } from "@/components/paywall/PaywallStatus";
import { PaywallFeatures } from "@/components/paywall/PaywallFeatures";
import { PaywallPlans } from "@/components/paywall/PaywallPlans";
import { PaywallMpesa } from "@/components/paywall/PaywallMpesa";
import { PaymentDebugPanel } from "@/components/PaymentDebugPanel";
import { BillingDiagnosticsBanner } from "@/components/BillingDiagnosticsBanner";

// Optional config check for developer bypass
let billingConfigDeveloperBypass: boolean | undefined = undefined;
try {
  const cfg = require("@/config/billingConfig");
  billingConfigDeveloperBypass =
    cfg?.billingConfig?.developerBypass ?? cfg?.developerBypass ?? undefined;
} catch (_) {
  // ignore
}

type Plan = "daily" | "weekly" | "monthly" | "monthly_premium";

interface RemainingTime {
  days: number;
  hours: number;
  minutes: number;
}

const DEV_TAP_THRESHOLD = 5;
const DEV_TAP_WINDOW_MS = 3000;

const STORAGE_KEYS = {
  LAST_MPESA_PHONE: "paywall:lastMpesaPhone",
};

import MpesaPaymentModal from "@/components/MpesaPaymentModal";

export default function PaywallScreen(): JSX.Element {
  const { navigation } = useSafeRouter();

  const {
    status,
    trialDaysLeft,
    isPro,
    purchase,
    restore,
    refresh,
  } = useBilling();

  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("monthly_premium");

  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaModalVisible, setMpesaModalVisible] = useState(false);

  const [mpesaActive, setMpesaActive] = useState(false);
  const [remaining, setRemaining] = useState<RemainingTime>({
    days: 0,
    hours: 0,
    minutes: 0,
  });

  const [planInfo, setPlanInfo] = useState<{ plan?: string; trialEnd?: number }>(
    {}
  );

  const [activationMessage, setActivationMessage] = useState<string | null>(
    null
  );

  const [debugPanelVisible, setDebugPanelVisible] = useState(false);

  // ✅ CORRECT: The native module now guarantees this type
  const smsSubRef = useRef<{ remove: () => void } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const successRedirectRef = useRef<NodeJS.Timeout | null>(null);

  const [devBypassOverride, setDevBypassOverride] = useState(false);
  const tapCountRef = useRef(0);
  const supportNavTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bypassActivatedRef = useRef(false);
  const firstTapTimestampRef = useRef<number | null>(null);

  const devBypass = useMemo(() => {
    const envBypass =
      process.env.EXPO_PUBLIC_DEVELOPER_BYPASS === "true" ||
      process.env.DEV_BYPASS === "true";
    const cfg = billingConfigDeveloperBypass === true;
    return cfg || envBypass || devBypassOverride;
  }, [devBypassOverride]);

  const isTrialActive = useMemo(
    () => status === "trial" && !!trialDaysLeft && trialDaysLeft > 0,
    [status, trialDaysLeft]
  );

  // ----------------------------------------------------
  // Restore saved bypass flag
  // ----------------------------------------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const enabled = await AsyncStorage.getItem(DEV_BYPASS_KEY);
        if (!mounted) return;
        setDevBypassOverride(enabled === 'true');
      } catch (_) { }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ----------------------------------------------------
  // Load plan info
  // ----------------------------------------------------
  const loadPlanInfo = useCallback(async () => {
    try {
      const info = await getLocalPlanInfo();
      setPlanInfo(info || {});
    } catch (err) {
      console.log("[Paywall] Failed to load local plan info:", err);
    }
  }, []);

  const refreshSubscriptionState = useCallback(async () => {
    try {
      const active = await isSubscriptionActive();
      setMpesaActive(active);

      // Get subscription data to calculate remaining time
      const subscription = await getSubscriptionInfo();
      if (subscription) {
        const t = await getRemainingTime(subscription);
        setRemaining(t);
      } else {
        setRemaining({ days: 0, hours: 0, minutes: 0 });
      }

      // Cleanup expired payments
      await cleanupExpiredPayments();
    } catch (e) {
      console.log("[Paywall] Subscription state refresh error:", e);
      setRemaining({ days: 0, hours: 0, minutes: 0 });
    }
  }, []);

  // ----------------------------------------------------
  // Subscription activation via server
  // ----------------------------------------------------
  const handleActivate = useCallback(
    async (plan: Plan) => {
      try {
        setLoading(true);
        setActivationMessage("Activating your subscription...");

        const result = await activatePlan(plan);

        if (
          result?.status === "activated" ||
          result?.status === "renewed" ||
          result?.status === "active"
        ) {
          await loadPlanInfo();
          await refreshSubscriptionState();
          setActivationMessage("✅ Subscription active. Redirecting...");
          Alert.alert("✅ Success", `Your ${plan} subscription is active.`);
          navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
        } else {
          setActivationMessage("❌ Activation failed. Try again.");
          Alert.alert("❌ Error", "Activation failed. Try again.");
        }
      } catch (e) {
        console.log("Activation error", e);
        setActivationMessage("❌ Failed to activate subscription.");
        Alert.alert("❌ Error", "Failed to activate subscription.");
      } finally {
        setLoading(false);
      }
    },
    [navigation, loadPlanInfo, refreshSubscriptionState]
  );

  // ----------------------------------------------------
  // Google/Apple Store Billing
  // ----------------------------------------------------
  const handleStorePurchase = useCallback(async () => {
    try {
      setLoading(true);
      setActivationMessage("Processing store purchase...");
      await purchase(selectedPlan);
      await handleActivate(selectedPlan);
    } catch (err) {
      console.log("Purchase error:", err);
      setActivationMessage("❌ Store purchase failed.");
      Alert.alert("❌ Error", "Purchase failed.");
    } finally {
      setLoading(false);
    }
  }, [purchase, selectedPlan, handleActivate]);

  const handleRestore = useCallback(async () => {
    try {
      setLoading(true);
      setActivationMessage("Restoring purchases...");
      await restore();
      await loadPlanInfo();
      await refreshSubscriptionState();
      setActivationMessage("✅ Subscription restored. Redirecting...");
      Alert.alert("Restored", "Subscription restored successfully.");
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    } catch (err) {
      console.log("Restore error:", err);
      setActivationMessage("❌ Failed to restore subscription.");
    } finally {
      setLoading(false);
    }
  }, [restore, navigation, loadPlanInfo, refreshSubscriptionState]);

  // ----------------------------------------------------
  // Phone validation
  // ----------------------------------------------------
  const validatePhone = useCallback((p: string) => /^2547\d{8}$/.test(p), []);

  // ----------------------------------------------------
  // Lipana Payment Handler
  // ----------------------------------------------------

  // ----------------------------------------------------
  // Lipana Payment Handler
  // ----------------------------------------------------
  // ----------------------------------------------------
  // Lipana Payment Handler (Direct Link)
  // ----------------------------------------------------
  const handleLipanaPayment = useCallback(async () => {
    try {
      setLoading(true);
      setActivationMessage("Opening payment page...");

      // Get link for selected plan using new MPESA_PLANS structure
      const planConfig = MPESA_PLANS.find(p => p.id === selectedPlan);
      const targetLink: string = planConfig?.link || LIPANA_PAYMENT_LINK;

      console.log(`[Paywall] Opening link for ${selectedPlan}: ${targetLink}`);

      // Open the payment link directly in default browser
      // Note: Don't use canOpenURL check - it's unreliable on Android 11+ due to package visibility
      await Linking.openURL(targetLink);
      setActivationMessage("Payment page opened. Complete payment and return here.");

    } catch (error) {
      console.error("Lipana payment error:", error);
      setActivationMessage("❌ Failed to open payment page.");
      Alert.alert(
        "Payment Error",
        "Failed to open payment page. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedPlan]);

  const expiryText = planInfo.trialEnd
    ? new Date(planInfo.trialEnd).toLocaleDateString()
    : undefined;

  // ----------------------------------------------------
  // Developer Bypass (5 taps)
  // ----------------------------------------------------
  const activateDevBypass = useCallback(async () => {
    try {
      await AsyncStorage.setItem(DEV_BYPASS_KEY, 'true');
      await AsyncStorage.setItem(ADMIN_UNLOCK_KEY, '1');
      await refresh();
      setDevBypassOverride(true);
      bypassActivatedRef.current = true;

      Alert.alert("Dev bypass enabled");
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    } catch (e) {
      Alert.alert("Error", "Failed to enable bypass.");
    }
  }, [refresh, navigation]);

  const onPrioritySupportTap = useCallback(() => {
    const now = Date.now();

    if (
      firstTapTimestampRef.current === null ||
      now - firstTapTimestampRef.current > DEV_TAP_WINDOW_MS
    ) {
      firstTapTimestampRef.current = now;
      tapCountRef.current = 0;
    }

    tapCountRef.current += 1;

    if (
      tapCountRef.current >= DEV_TAP_THRESHOLD &&
      now - firstTapTimestampRef.current <= DEV_TAP_WINDOW_MS &&
      !bypassActivatedRef.current
    ) {
      tapCountRef.current = 0;
      firstTapTimestampRef.current = null;
      void activateDevBypass();
      return;
    }

    if (supportNavTimerRef.current) {
      clearTimeout(supportNavTimerRef.current);
    }

    supportNavTimerRef.current = setTimeout(() => {
      if (!bypassActivatedRef.current) {
        navigation.navigate("Tabs"); // Navigate to main instead of Support
      }
      tapCountRef.current = 0;
      firstTapTimestampRef.current = null;
    }, 600);
  }, [activateDevBypass, navigation]);

  // ----------------------------------------------------
  // Load last phone
  // ----------------------------------------------------
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(
        STORAGE_KEYS.LAST_MPESA_PHONE
      );
      if (stored) setMpesaPhone(stored);
    })();
  }, []);

  // ----------------------------------------------------
  // SMS listener + interval refresh - SIMPLIFIED & SAFE
  // ----------------------------------------------------
  useEffect(() => {
    void loadPlanInfo();

    if (isPro || devBypass) {
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
      return;
    }

    // ✅ SIMPLIFIED: The native module now handles all safety checks internally
    // No need for extra null checks here - just set up the listener
    const setupSmsListener = () => {
      console.log("[Paywall] Setting up SMS listener...");

      // The native module guarantees a safe subscription object
      const subscription = smsListener.addListener(
        async (payload: { body: string; timestamp: number }) => {
          console.log("[Paywall] SMS received:", payload.body.substring(0, 100));

          // Use enhanced activation service
          const result = await activateFromEnhancedSms(payload.body, payload.timestamp);

          if (result.success) {
            console.log("[Paywall] SMS activation successful!");
            setActivationMessage("✅ Payment detected! Subscription activated.");
            await refreshSubscriptionState();

            // Redirect to main app after successful activation (CLEANUP SAFE)
            if (successRedirectRef.current) clearTimeout(successRedirectRef.current);
            successRedirectRef.current = setTimeout(() => {
              navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
            }, 2000);
          } else {
            console.log("[Paywall] SMS activation failed:", result.reason);
            // Don't show error to user for non-payment SMS
            if (!result.reason.includes("Invalid SMS format")) {
              setActivationMessage(`❌ Activation failed: ${result.reason}`);
            }
          }
        }
      );

      // Store the subscription for cleanup
      smsSubRef.current = subscription;
      console.log("[Paywall] SMS listener setup completed");
    };

    // Setup the SMS listener
    setupSmsListener();

    // Initial subscription state refresh
    void refreshSubscriptionState();

    // Set up periodic refresh
    intervalRef.current = setInterval(() => {
      void refreshSubscriptionState();
    }, 60000);

    // Cleanup function
    return () => {
      // ✅ SAFE: The native module guarantees remove() exists
      if (smsSubRef.current) {
        smsSubRef.current.remove();
        smsSubRef.current = null;
      }

      // Clean up interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Cleanup success redirect
      if (successRedirectRef.current) {
        clearTimeout(successRedirectRef.current);
        successRedirectRef.current = null;
      }
    };
  }, [
    devBypass,
    isPro,
    navigation,
    loadPlanInfo,
    refreshSubscriptionState,
  ]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshSubscriptionState();
    });
    return () => sub.remove();
  }, [refreshSubscriptionState]);


  useEffect(() => {
    return () => {
      if (supportNavTimerRef.current)
        clearTimeout(supportNavTimerRef.current);

      // Cleanup success redirect if user leaves early
      // Note: check setupSmsListener scope or ref scope. 
      // Actually redirect ref is inside useEffect, we should move it out or cleanup inside.
      // Wait, successRedirectRef currently is inside useEffect in previous edit? 
      // YES. So we must put cleanup INSIDE that useEffect (lines 397-473), not this one.

      // This useEffect (lines 485-496) was for lipanaPollIntervalRef which we deleted.
      // So we can delete this whole useEffect entirely or leave supportNavTimerRef cleanup if it's not handled elsewhere.
      // supportNavTimerRef is global to component. It should be cleaned up on unmount.
    };
  }, []);

  const currentYear = new Date().getFullYear();

  // ----------------------------------------------------
  // UI helpers
  // ----------------------------------------------------

  const renderActivationMessage = () => {
    if (!activationMessage) return null;
    return (
      <View style={styles.activationMessageBox}>
        <Text style={styles.activationMessageText}>{activationMessage}</Text>
      </View>
    );
  };

  // ----------------------------------------------------
  // MAIN RENDER
  // ----------------------------------------------------

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <PaywallHeader
            isTrialActive={isTrialActive}
            trialDaysLeft={trialDaysLeft ?? 0}
            planInfo={planInfo}
            expiryText={expiryText}
          />

          <PaywallStatus mpesaActive={mpesaActive} remaining={remaining} />

          <PaywallFeatures onPrioritySupportTap={onPrioritySupportTap} />

          {/* Store Plans removed - Lipana is the only payment method */}

          <PaywallMpesa
            mpesaActive={mpesaActive}
            remaining={remaining}
            loading={loading}
            mpesaLoading={mpesaLoading}
            onPress={() => setMpesaModalVisible(true)}
            // ✅ Pass Lipana link handler here
            onLipanaPress={handleLipanaPayment}
          />

          {/* SETTINGS */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Tabs")}
            style={styles.settingsLink}
          >
            <Text style={styles.settingsLinkText}>Go to Settings</Text>
          </TouchableOpacity>

          {/* ACTIVATION MESSAGE */}
          {renderActivationMessage()}

          {/* FOOTER */}
          <Text style={styles.footerNote}>
            🔐 Secured billing via Store or M-PESA.{"\n"}© {currentYear} enjugunake / CEMES
          </Text>

          {/* Debug button (development only) */}
          {__DEV__ && (
            <TouchableOpacity
              onPress={() => setDebugPanelVisible(true)}
              style={styles.debugButton}
            >
              <Text style={styles.debugButtonText}>🔍 Debug Payments</Text>
            </TouchableOpacity>
          )}


          <BillingDiagnosticsBanner style={{ marginTop: 24 }} />
        </View>
      </ScrollView >


      {/* M-PESA Modal removed - using Lipana payment only */}

      {/* Debug Panel */}
      <PaymentDebugPanel
        visible={debugPanelVisible}
        onClose={() => setDebugPanelVisible(false)}
      />
    </>
  );
}

// ------------------------------------------------------
// STYLES (unchanged)
// ------------------------------------------------------
const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#0f172a",
  },
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: "#0f172a",
  },
  settingsLink: {
    marginTop: 20,
    alignSelf: "center",
  },
  settingsLinkText: {
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "600",
  },
  activationMessageBox: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#0b1120",
  },
  activationMessageText: {
    color: "#e5e7eb",
    fontSize: 12,
  },
  footerNote: {
    marginTop: 16,
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
  },
  debugButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#374151",
    borderRadius: 6,
    alignSelf: "center",
  },
  debugButtonText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
  },
});