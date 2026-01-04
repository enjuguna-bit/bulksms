// ===========================================================================
// 💳 BillingProvider — Refactored to use consolidated useBillingState hook
// Offline-First / Local Validation Architecture
// ===========================================================================

import React, { createContext, useContext, ReactNode, useMemo } from "react";
import {
  useBillingState,
  BillingState,
  BillingActions,
  PlanType,
  BillingStatus
} from "@/hooks/useBillingState";
import { ADMIN_UNLOCK_STORAGE_KEY } from "@/services/devBypass";

// ---------------------------------------------------------------------------
// Re-exports for Backward Compatibility
// ---------------------------------------------------------------------------
export type { PlanType, BillingStatus };
export { ADMIN_UNLOCK_STORAGE_KEY };

// ---------------------------------------------------------------------------
// Context Definition
// ---------------------------------------------------------------------------
// Combine state and actions into one context value interface
export interface BillingContextValue extends BillingState, BillingActions { }

const BillingContext = createContext<BillingContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider Component
// ---------------------------------------------------------------------------
interface Props {
  children: ReactNode;
}

export function BillingProvider({ children }: Props) {
  // Use the extracted hook for all logic
  const billingState = useBillingState();

  return (
    <BillingContext.Provider value={billingState}>
      {children}
    </BillingContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) {
    throw new Error("useBilling must be used within BillingProvider");
  }
  return ctx;
}
