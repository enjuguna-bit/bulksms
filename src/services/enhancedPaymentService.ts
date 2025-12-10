// -----------------------------------------------------
// src/services/enhancedPaymentService.ts
// Enhanced auto-activation system for M-PESA & Lipana payments
// -----------------------------------------------------

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { activateSubscriptionFromSms, getSubscriptionInfo } from "./MpesaSubscriptionService";
import { checkLipanaTransactionStatus } from "./lipanaPayment";

// Storage keys for enhanced tracking
const STORAGE_KEYS = {
  pendingPayments: "enhanced:pendingPayments",
  paymentAttempts: "enhanced:paymentAttempts",
  activationLog: "enhanced:activationLog",
};

export interface PendingPayment {
  id: string;
  type: "mpesa" | "lipana";
  amount: number;
  phone?: string;
  transactionId?: string;
  createdAt: number;
  status: "pending" | "completed" | "failed";
  expiresAt: number;
}

export interface ActivationLogEntry {
  id: string;
  type: "mpesa" | "lipana" | "auto";
  amount: number;
  status: "success" | "failed";
  reason: string;
  timestamp: number;
  data?: any;
}

/**
 * Enhanced SMS parser that supports multiple M-PESA formats
 */
function parseEnhancedSmsBody(body: string): {
  amount: number;
  code: string;
  payee: string;
  date: string;
  time: string;
  source: string;
} | null {
  // Standard M-PESA format
  const standardRegex = /confirmed\.you have sent ksh([\d,]+)\.\d+ to ([\d]+) ([\s\S]+?) on (\d{1,2}\/\d{1,2}\/\d{2}) at (\d{1,2}:\d{2} [AP]M)/i;
  const standardMatch = body.match(standardRegex);
  
  if (standardMatch) {
    return {
      amount: parseInt(standardMatch[1].replace(/,/g, "")),
      code: standardMatch[2],
      payee: standardMatch[3].trim(),
      date: standardMatch[4],
      time: standardMatch[5],
      source: "mpesa_standard",
    };
  }

  // Lipana payment confirmation format
  const lipanaRegex = /lipana.*?payment.*?ksh([\d,]+).*?confirmed/i;
  const lipanaMatch = body.match(lipanaRegex);
  
  if (lipanaMatch) {
    return {
      amount: parseInt(lipanaMatch[1].replace(/,/g, "")),
      code: "LIPANA",
      payee: "Lipana Payment",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      source: "lipana",
    };
  }

  // Generic M-PESA format
  const genericRegex = /ksh([\d,]+).*?sent.*?([a-zA-Z0-9]{6,})/i;
  const genericMatch = body.match(genericRegex);
  
  if (genericMatch) {
    return {
      amount: parseInt(genericMatch[1].replace(/,/g, "")),
      code: genericMatch[2],
      payee: "Unknown",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      source: "mpesa_generic",
    };
  }

  return null;
}

/**
 * Track a pending payment for monitoring
 */
export async function trackPendingPayment(payment: Omit<PendingPayment, "id" | "createdAt" | "expiresAt">): Promise<string> {
  const id = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const pendingPayment: PendingPayment = {
    ...payment,
    id,
    createdAt: Date.now(),
    expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes expiry
  };

  const existing = await AsyncStorage.getItem(STORAGE_KEYS.pendingPayments);
  const pending = existing ? JSON.parse(existing) : [];
  pending.push(pendingPayment);
  
  await AsyncStorage.setItem(STORAGE_KEYS.pendingPayments, JSON.stringify(pending));
  return id;
}

/**
 * Enhanced SMS activation with better error handling and logging
 */
export async function activateFromEnhancedSms(body: string, arrivalTime?: number): Promise<{
  success: boolean;
  reason: string;
  subscription?: any;
  paymentId?: string;
}> {
  try {
    // Parse SMS with enhanced parser
    const parsed = parseEnhancedSmsBody(body);
    if (!parsed) {
      return { success: false, reason: "Invalid SMS format" };
    }

    // Track the payment attempt
    const paymentId = await trackPendingPayment({
      type: parsed.source === "lipana" ? "lipana" : "mpesa",
      amount: parsed.amount,
      status: "pending",
    });

    // Activate subscription using existing logic
    const activationResult = await activateSubscriptionFromSms(body, arrivalTime);
    
    if (activationResult.ok) {
      // Update payment status
      await updatePaymentStatus(paymentId, "completed");
      
      // Log successful activation
      await logActivation({
        id: `log_${Date.now()}`,
        type: parsed.source === "lipana" ? "lipana" : "mpesa",
        amount: parsed.amount,
        status: "success",
        reason: activationResult.reason || "SMS activation successful",
        timestamp: Date.now(),
        data: { parsed, subscription: activationResult.sub },
      });

      return {
        success: true,
        reason: activationResult.reason || "Subscription activated successfully",
        subscription: activationResult.sub,
        paymentId,
      };
    } else {
      // Update payment status to failed
      await updatePaymentStatus(paymentId, "failed");
      
      // Log failed activation
      await logActivation({
        id: `log_${Date.now()}`,
        type: parsed.source === "lipana" ? "lipana" : "mpesa",
        amount: parsed.amount,
        status: "failed",
        reason: activationResult.reason || "SMS activation failed",
        timestamp: Date.now(),
      });

      return {
        success: false,
        reason: activationResult.reason || "Activation failed",
        paymentId,
      };
    }
  } catch (error) {
    console.error("[EnhancedPaymentService] SMS activation error:", error);
    return {
      success: false,
      reason: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Check Lipana transaction status and activate if successful
 */
export async function checkAndActivateLipanaPayment(transactionId: string): Promise<{
  success: boolean;
  reason: string;
}> {
  try {
    // Track the payment check
    const paymentId = await trackPendingPayment({
      type: "lipana",
      amount: 0, // Will be updated after checking
      transactionId,
      status: "pending",
    });

    // Check transaction status
    const statusResult = await checkLipanaTransactionStatus(transactionId);
    
    if (statusResult.success && statusResult.status === "completed") {
      // Create a simulated SMS activation for Lipana
      const simulatedSmsBody = `Lipana payment of KES 3,900 confirmed. Transaction ID: ${transactionId}`;
      const activationResult = await activateFromEnhancedSms(simulatedSmsBody);
      
      if (activationResult.success) {
        return {
          success: true,
          reason: "Lipana payment activated successfully",
        };
      }
    }

    await updatePaymentStatus(paymentId, "failed");
    return {
      success: false,
      reason: statusResult.error || "Lipana payment not completed",
    };
  } catch (error) {
    console.error("[EnhancedPaymentService] Lipana activation error:", error);
    return {
      success: false,
      reason: error instanceof Error ? error.message : "Failed to check Lipana payment",
    };
  }
}

/**
 * Update payment status
 */
async function updatePaymentStatus(paymentId: string, status: "completed" | "failed"): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.pendingPayments);
    const pending = existing ? JSON.parse(existing) : [];
    
    const index = pending.findIndex((p: PendingPayment) => p.id === paymentId);
    if (index !== -1) {
      pending[index].status = status;
      await AsyncStorage.setItem(STORAGE_KEYS.pendingPayments, JSON.stringify(pending));
    }
  } catch (error) {
    console.error("[EnhancedPaymentService] Failed to update payment status:", error);
  }
}

/**
 * Log activation attempts for debugging
 */
async function logActivation(entry: ActivationLogEntry): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.activationLog);
    const logs = existing ? JSON.parse(existing) : [];
    logs.push(entry);
    
    // Keep only last 50 logs
    if (logs.length > 50) {
      logs.splice(0, logs.length - 50);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.activationLog, JSON.stringify(logs));
  } catch (error) {
    console.error("[EnhancedPaymentService] Failed to log activation:", error);
  }
}

/**
 * Clean up expired pending payments
 */
export async function cleanupExpiredPayments(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.pendingPayments);
    const pending = existing ? JSON.parse(existing) : [];
    
    const now = Date.now();
    const active = pending.filter((p: PendingPayment) => p.expiresAt > now);
    
    await AsyncStorage.setItem(STORAGE_KEYS.pendingPayments, JSON.stringify(active));
  } catch (error) {
    console.error("[EnhancedPaymentService] Failed to cleanup expired payments:", error);
  }
}

/**
 * Get activation logs for debugging
 */
export async function getActivationLogs(): Promise<ActivationLogEntry[]> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.activationLog);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error("[EnhancedPaymentService] Failed to get activation logs:", error);
    return [];
  }
}

/**
 * Get pending payments
 */
export async function getPendingPayments(): Promise<PendingPayment[]> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.pendingPayments);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error("[EnhancedPaymentService] Failed to get pending payments:", error);
    return [];
  }
}
