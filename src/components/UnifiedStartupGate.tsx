// src/components/UnifiedStartupGate.tsx
// Simplified startup pipeline orchestrator

import React from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

// Extracted components
import StartupBoundary from "./startup/StartupBoundary";
import { useStartupLoader } from "./startup/useStartupLoader";
import { StartupErrorDisplay } from "./startup/StartupErrorDisplay";

// Gates
import TrialGate from "./TrialGate";
import SubscriptionGate from "./SubscriptionGate";
import SmsRoleGate from "./SmsRoleGate";
import AppLockGate from "./AppLockGate";

// Root navigation
import RootNavigator from "../navigation/RootNavigator";

// Message provider (must be inside NavigationContainer)
import { MessageProvider } from "../providers/MessageProvider";

export default function UnifiedStartupGate() {
  const { ready, initError, isOffline, retryContext, prepareApp } = useStartupLoader();

  // 🔴 Error State (Enhanced Retry UI)
  if (initError) {
    return (
      <StartupErrorDisplay
        initError={initError}
        isOffline={isOffline}
        retryContext={retryContext}
        onRetry={prepareApp}
      />
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
        <MessageProvider>
          <TrialGate>
            <SubscriptionGate>
              <SmsRoleGate>
                <AppLockGate>
                  <RootNavigator />
                </AppLockGate>
              </SmsRoleGate>
            </SubscriptionGate>
          </TrialGate>
        </MessageProvider>
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
});