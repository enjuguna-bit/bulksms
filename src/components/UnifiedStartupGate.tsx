// src/components/UnifiedStartupGate.tsx
// Centralized startup pipeline with logging + local crash protection + cleanup

import React, { useEffect, useState, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet, Text, Button } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

// Startup hooks
import useTrial from "../hooks/useTrial";
import { usePaymentCapture } from "../hooks/usePaymentCapture";

// Gates
import TrialGate from "./TrialGate";
import SubscriptionGate from "./SubscriptionGate";
import SmsRoleGate from "./SmsRoleGate";
import AppLockGate from "./AppLockGate";

// Root navigation
import RootNavigator from "../navigation/RootNavigator";

// ⚡ FIX: Import database initialization from renamed "db" folder
import { initDatabase } from "@/db/database";
import { getUnreadByThread } from "@/db/repositories/messages";
import { pruneSendLogs } from "@/db/repositories/sendLogs";

// Enhanced error boundary for startup path with error details and retry
type StartupBoundaryState = { 
  hasError: boolean;
  errorMessage?: string;
  errorStack?: string;
};

class StartupBoundary extends React.Component<
  React.PropsWithChildren,
  StartupBoundaryState
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): StartupBoundaryState {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return { 
      hasError: true,
      errorMessage,
      errorStack: errorStack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[StartupBoundary] Unhandled error:", error, info);
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error("[StartupBoundary] Error message:", error.message);
      console.error("[StartupBoundary] Error stack:", error.stack);
    }
    console.error("[StartupBoundary] Component stack:", info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: undefined, errorStack: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Critical Startup Error</Text>
          {this.state.errorMessage && (
            <Text style={styles.errorMessage}>{this.state.errorMessage}</Text>
          )}
          {__DEV__ && this.state.errorStack && (
            <Text style={styles.errorStack}>{this.state.errorStack}</Text>
          )}
          <View style={styles.spacer} />
          <Button title="Retry" onPress={this.handleRetry} />
        </View>
      );
    }
    return this.props.children;
  }
}

// Configuration for Cleanup
const LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days

// Lightweight helper for structured logging
function logStartupEvent(event: string, extra?: Record<string, unknown>) {
  console.log(`[Startup] ${event}`, extra ? JSON.stringify(extra) : "");
}

// 🧹 Helper: Cleanup old logs
async function pruneOldLogs() {
  try {
    await pruneSendLogs(LOG_RETENTION_MS);
  } catch (e) {
    console.warn("[Startup] Log cleanup warning:", e);
  }
}

export default function UnifiedStartupGate() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [startTime] = useState(() => Date.now());

  // Run startup hooks once
  useTrial();
  usePaymentCapture();

  const prepareApp = useCallback(async () => {
    setInitError(null);
    try {
      logStartupEvent("initializing_db");

      // ⚡ FIX: Wait for DB to be truly ready
      await initDatabase();

      // ⚡ PERFORMANCE FIX: Run cleanup in background (setTimeout) 
      // instead of awaiting it. This unblocks the splash screen immediately.
      setTimeout(() => {
        pruneOldLogs();
      }, 3000);

      // (Optional) Add other async checks here
      // const perms = await checkSmsPermissions(); 

      setReady(true);
      const duration = Date.now() - startTime;
      logStartupEvent("ready", { durationMs: duration });

    } catch (e: any) {
      console.error("[Startup] Initialization failed", e);
      setInitError(e?.message || "Failed to initialize database.");
    }
  }, [startTime]);

  useEffect(() => {
    logStartupEvent("mount", { at: new Date(startTime).toISOString() });
    prepareApp();

    return () => {
      logStartupEvent("unmount");
    };
  }, [prepareApp, startTime]);

  // 🔴 Error State (Retry UI)
  if (initError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Startup Failed</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
        <View style={styles.spacer} />
        <Button title="Retry Initialization" onPress={prepareApp} />
      </View>
    );
  }

  // 🟡 Loading State
  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={styles.loadingText}>Starting up...</Text>
      </View>
    );
  }

  // 🟢 Active App
  return (
    <StartupBoundary>
      <NavigationContainer>
        <TrialGate>
          <SubscriptionGate>
            <SmsRoleGate>
              <AppLockGate>
                <RootNavigator />
              </AppLockGate>
            </SmsRoleGate>
          </SubscriptionGate>
        </TrialGate>
      </NavigationContainer>
    </StartupBoundary>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ef4444",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    marginBottom: 12,
  },
  errorStack: {
    fontSize: 11,
    color: "#999",
    fontFamily: "monospace",
    marginTop: 8,
    marginBottom: 12,
    textAlign: "left",
    maxWidth: "100%",
  },
  spacer: {
    height: 10,
  },
});