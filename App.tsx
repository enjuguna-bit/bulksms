// App.tsx — top-level providers + enhanced startup gate

import React, { useState, useEffect } from "react";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";

// Database initialization
// DB init removed (handled in UnifiedStartupGate)

// Global UI theme
import { ThemeProvider } from "./src/theme/ThemeProvider";

// Global data/state providers
import { BillingProvider } from "./src/providers/BillingProvider";
import { StatsProvider } from "./src/providers/StatsProvider";
import { TransactionsProvider } from "./src/providers/TransactionsProvider";

// NEW: Global message store (SQLite-backed)
import { MessageProvider } from "./src/providers/MessageProvider";

// NEW: Premium UI components
import { ToastProvider } from "./src/components/ui/ToastProvider";

// Global error boundary
import { ErrorBoundary } from "./src/components/ErrorBoundary";

// Centralized startup + gating + navigation
import UnifiedStartupGate from "./src/components/UnifiedStartupGate";

export default function App() {
  // DB init handled in UnifiedStartupGate
  // No local state needed here



  // Database ready - render providers
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <BillingProvider>
            <TransactionsProvider>
              <StatsProvider>
                {/* 👇 NEW: Wrap entire app in MessageProvider */}
                <MessageProvider>
                  <UnifiedStartupGate />
                </MessageProvider>
              </StatsProvider>
            </TransactionsProvider>
          </BillingProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
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
