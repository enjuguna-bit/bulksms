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

import { useSafeRouter } from "@/hooks/useSafeRouter";
import { useBilling } from "@/providers/BillingProvider";

import { smsListener } from "@/native";
import {
  getRemainingTime,
  isSubscriptionActive,
  getSubscriptionInfo,
} from "@/services/MpesaSubscriptionService";
import { activateFromEnhancedSms, checkAndActivateLipanaPayment, cleanupExpiredPayments } from "@/services/enhancedPaymentService";

import { activatePlan, getLocalPlanInfo } from "@/services/activation";

import {
  enableDeveloperBypass,
  isDeveloperBypassEnabled,
} from "@/services/devBypass";

import { MPESA_PLANS } from "@/constants/mpesa";
import { MPESA_WORKER_URL } from "@/constants/mpesa";
import { createLipanaPaymentLink } from "@/services/lipanaPayment";

// New Components
import { PaywallHeader } from "@/components/paywall/PaywallHeader";
import { PaywallStatus } from "@/components/paywall/PaywallStatus";
import { PaywallFeatures } from "@/components/paywall/PaywallFeatures";
import { PaywallPlans } from "@/components/paywall/PaywallPlans";
import { PaywallMpesa } from "@/components/paywall/PaywallMpesa";
import { PaymentDebugPanel } from "@/components/PaymentDebugPanel";

// Optional config check for developer bypass
let billingConfigDeveloperBypass: boolean | undefined = undefined;
try {
  const cfg = require("@/config/billingConfig");
  billingConfigDeveloperBypass =
    cfg?.billingConfig?.developerBypass ?? cfg?.developerBypass ?? undefined;
} catch (_) {
  // ignore
}

type Plan = "monthly" | "quarterly" | "yearly";

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
  const router = useSafeRouter();

  const {
    status,
    trialDaysLeft,
    isPro,
    purchase,
    restore,
    refresh,
  } = useBilling();

  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("yearly");

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
        const enabled = await isDeveloperBypassEnabled();
        if (!mounted) return;
        setDevBypassOverride(enabled);
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
          router.safeReplace("Tabs");
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
    [router, loadPlanInfo, refreshSubscriptionState]
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
      router.safeReplace("Tabs");
    } catch (err) {
      console.log("Restore error:", err);
      setActivationMessage("❌ Failed to restore subscription.");
    } finally {
      setLoading(false);
    }
  }, [restore, router, loadPlanInfo, refreshSubscriptionState]);

  // ----------------------------------------------------
  // Phone validation
  // ----------------------------------------------------
  const validatePhone = useCallback((p: string) => /^2547\d{8}$/.test(p), []);

  // ----------------------------------------------------
  // Trigger STK push
  // ----------------------------------------------------
  const triggerMpesaStk = useCallback(
    async (amount: number) => {
      if (!mpesaPhone || !validatePhone(mpesaPhone)) {
        Alert.alert(
          "⚠️ Invalid number",
          "Enter a valid phone: 2547XXXXXXXX"
        );
        return;
      }

      try {
        setMpesaLoading(true);
        setActivationMessage("Sending STK push…");

        const res = await fetch(MPESA_WORKER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: mpesaPhone,
            amount,
            accountRef: "SMSPRO",
          }),
        });

        if (!res.ok) throw new Error("Worker Error");

        await AsyncStorage.setItem(STORAGE_KEYS.LAST_MPESA_PHONE, mpesaPhone);

        Alert.alert(
          "📲 M-PESA",
          "You will receive a PIN prompt shortly."
        );

        setMpesaModalVisible(false);
        setActivationMessage("STK push sent. Awaiting SMS confirmation…");
      } catch (err) {
        console.log("STK error:", err);
        setActivationMessage("❌ Failed to initiate payment.");
      } finally {
        setMpesaLoading(false);
      }
    },
    [mpesaPhone, validatePhone]
  );

  const handleSelectPlanFromModal = useCallback(
    (amount: number) => void triggerMpesaStk(amount),
    [triggerMpesaStk]
  );

  // ----------------------------------------------------
  // Lipana Payment Handler
  // ----------------------------------------------------
  const handleLipanaPayment = useCallback(async () => {
    try {
      setLoading(true);
      setActivationMessage("Creating payment link...");

      const monthlyPlan = MPESA_PLANS.find(plan => plan.days === 30);
      if (!monthlyPlan) {
        throw new Error("Monthly plan not found");
      }

      const result = await createLipanaPaymentLink({
        title: "CEMES BulkSMS Pro - Monthly Subscription",
        amount: monthlyPlan.amount,
        currency: "KES",
      });

      if (result.success && result.paymentLink) {
        setActivationMessage("✅ Payment link created. Opening browser...");

        // Open the payment link in browser
        await Linking.openURL(result.paymentLink);

        // Start polling for payment status
        setActivationMessage("Payment initiated. Awaiting confirmation...");

        if (result.transactionId) {
          // Poll for payment status every 10 seconds for 5 minutes
          let pollCount = 0;
          const maxPolls = 30; // 30 * 10 seconds = 5 minutes

          const pollInterval = setInterval(async () => {
            pollCount++;

            try {
              const statusResult = await checkAndActivateLipanaPayment(result.transactionId!);

              if (statusResult.success) {
                clearInterval(pollInterval);
                setActivationMessage("✅ Payment confirmed! Subscription activated.");
                await refreshSubscriptionState();

                // Redirect to main app after successful activation
                setTimeout(() => {
                  router.safeReplace("Tabs");
                }, 2000);
              } else if (pollCount >= maxPolls) {
                clearInterval(pollInterval);
                setActivationMessage("⏰ Payment confirmation timed out. Please complete payment and check for SMS confirmation.");
              }
            } catch (error) {
              console.error("[Paywall] Lipana polling error:", error);
            }
          }, 10000); // Poll every 10 seconds

          // Store interval ID for cleanup
          (window as any).__lipanaPollInterval = pollInterval;
        }
      } else {
        throw new Error(result.error || "Failed to create payment link");
      }
    } catch (error) {
      console.error("Lipana payment error:", error);
      setActivationMessage("❌ Failed to create payment link.");
      Alert.alert(
        "Payment Error",
        error instanceof Error ? error.message : "Failed to create payment link"
      );
    } finally {
      setLoading(false);
    }
  }, [router, refreshSubscriptionState]);

  const expiryText = planInfo.trialEnd
    ? new Date(planInfo.trialEnd).toLocaleDateString()
    : undefined;

  // ----------------------------------------------------
  // Developer Bypass (5 taps)
  // ----------------------------------------------------
  const activateDevBypass = useCallback(async () => {
    try {
      await enableDeveloperBypass();
      await refresh();
      setDevBypassOverride(true);
      bypassActivatedRef.current = true;

      Alert.alert("Dev bypass enabled");
      router.safeReplace("Tabs");
    } catch (e) {
      Alert.alert("Error", "Failed to enable bypass.");
    }
  }, [refresh, router]);

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
        router.safePush("Support");
      }
      tapCountRef.current = 0;
      firstTapTimestampRef.current = null;
    }, 600);
  }, [activateDevBypass, router]);

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
      router.safeReplace("Tabs");
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

            // Redirect to main app after successful activation
            setTimeout(() => {
              router.safeReplace("Tabs");
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
    };
  }, [
    devBypass,
    isPro,
    router,
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

      // Cleanup Lipana polling interval
      const pollInterval = (window as any).__lipanaPollInterval;
      if (pollInterval) {
        clearInterval(pollInterval);
        delete (window as any).__lipanaPollInterval;
      }
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

          <PaywallPlans
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            loading={loading}
            mpesaLoading={mpesaLoading}
            onPurchase={handleStorePurchase}
            onRestore={handleRestore}
          />

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
            onPress={() => router.safeReplace("Settings")}
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
        </View>
      </ScrollView>

      {/* M-PESA MODAL */}
      <MpesaPaymentModal
        visible={mpesaModalVisible}
        phone={mpesaPhone}
        onPhoneChange={setMpesaPhone}
        onClose={() => setMpesaModalVisible(false)}
        onSelectPlan={handleSelectPlanFromModal}
        plans={MPESA_PLANS}
      />

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