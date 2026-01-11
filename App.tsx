// App.tsx — top-level providers + enhanced startup gate

import React, { useState, useEffect } from "react";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";

// Initialize polyfills first (required for Node modules like @lipana/sdk)
import "./src/polyfills";

// Database initialization
// DB init removed (handled in UnifiedStartupGate)

// Global UI theme
import { ThemeProvider } from "./src/theme/ThemeProvider";

// Global data/state providers
import { BillingProvider } from "./src/providers/BillingProvider";

// NEW: Global message store (SQLite-backed)

// NEW: Premium UI components
import { ToastProvider } from "./src/components/ui/ToastProvider";

// Global error boundary
import { ErrorBoundary } from "./src/components/ErrorBoundary";

// Centralized startup + gating + navigation
import UnifiedStartupGate from "./src/components/UnifiedStartupGate";

// React Native Gesture Handler Root View
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  // DB init handled in UnifiedStartupGate
  // No local state needed here



  // Database ready - render providers
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <ToastProvider>
            <BillingProvider>
              <UnifiedStartupGate />
            </BillingProvider>
          </ToastProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
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
  errorText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ef4444",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
});
