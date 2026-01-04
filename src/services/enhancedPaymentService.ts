// -----------------------------------------------------
// src/services/enhancedPaymentService.ts
// Enhanced auto-activation system for M-PESA & Lipana payments
// -----------------------------------------------------

import { SecureStorageService } from "@/services/SecureStorageService";
import { Platform } from "react-native";
import { activateSubscriptionFromSms, getSubscriptionInfo, isTransactionIdUsed } from "./MpesaSubscriptionService";
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
  // 🚫 Security: Reject common failure patterns immediately
  const lowerBody = body.toLowerCase();
  if (
    lowerBody.includes("failed") ||
    lowerBody.includes("insufficient funds") ||
    lowerBody.includes("cancelled") ||
    lowerBody.includes("reversed") ||
    lowerBody.includes("error") ||
    lowerBody.includes("declined")
  ) {
    return null; // Don't parse failure messages as success
  }

  // Standard M-PESA format (Received)
  // Strict Start Anchor ^ (or close to it) prevents embedded message attacks
  const receivedRegex = /^(?:[A-Z]{2})?([A-Z0-9]{10})\s*Confirmed\.?\s*You\s*have\s*received\s*Ksh([\d,]+(?:\.\d{2})?)\s*from\s*(.+?)\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[AP]M)/i;
  const receivedMatch = body.trim().match(receivedRegex);

  if (receivedMatch) {
    return {
      amount: parseInt(receivedMatch[2].replace(/,/g, "")),
      code: receivedMatch[1],
      payee: receivedMatch[3].trim(),
      date: receivedMatch[4],
      time: receivedMatch[5],
      source: "mpesa_received",
    };
  }

  // Lipana/Paybill payment confirmation (Paid)
  // Example: TLMOY1MF53 Confirmed. Ksh1,000.00 sent to LIPANA TECHNOLOGIES  LIMITED for account TXN17664324821442A3K0F on 22/12/25 at 10:41 PM
  // 1. Capture ID (flexible length)
  // 2. Capture Amount
  // 3. Capture Payee (and validate later)
  // 4. Capture Account (flexible)
  const paidRegex = /^([A-Z0-9]+)\s+Confirmed\.\s+Ksh([\d,.]+)\s+sent\s+to\s+(.+?)\s+for\s+account\s+(.+?)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)/i;
  const paidMatch = body.trim().match(paidRegex);

  if (paidMatch) {
    const rawPayee = paidMatch[3].trim();

    // ✅ VALIDATION: Ensure payee is accurate (LIPANA)
    if (!rawPayee.toUpperCase().includes("LIPANA")) {
      console.log("[EnhancedPayment] Rejected non-Lipana payee:", rawPayee);
      return null;
    }

    return {
      amount: parseInt(paidMatch[2].replace(/,/g, "")),
      code: paidMatch[1], // Transaction ID
      payee: rawPayee,
      date: paidMatch[5],
      time: paidMatch[6],
      source: "mpesa_paid",
    };
  }

  // Lipana specific pattern (fallback for other variations)
  // Example: QBL0000000 Confirmed. Ksh1,000.00 sent to ...
  const genericPaidRegex = /^([A-Z0-9]{10})\s*Confirmed\.?\s*Ksh([\d,]+(?:\.\d{2})?)\s*sent\s*to\s*(.+?)\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[AP]M)/i;
  const genericPaidMatch = body.trim().match(genericPaidRegex);

  if (genericPaidMatch) {
    return {
      amount: parseInt(genericPaidMatch[2].replace(/,/g, "")),
      code: genericPaidMatch[1],
      payee: genericPaidMatch[3].trim(),
      date: genericPaidMatch[4],
      time: genericPaidMatch[5],
      source: "mpesa_paid",
    };
  }

  // Lipana specific pattern (fallback) - TIGHTENED
  // Must start with "Lipana payment" and end with "confirmed" (or close)
  const lipanaRegex = /^Lipana payment of KES ([\d,]+) confirmed\. Transaction ID: ([A-Z0-9]+)$/i;
  const lipanaMatch = body.trim().match(lipanaRegex);

  if (lipanaMatch) {
    return {
      amount: parseInt(lipanaMatch[1].replace(/,/g, "")),
      code: lipanaMatch[2] || "LIPANA_DETECTED",
      payee: "Lipana Payment",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      source: "lipana_fallback",
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

  const existing = await SecureStorageService.getItem(STORAGE_KEYS.pendingPayments);
  const pending = existing ? JSON.parse(existing) : [];
  pending.push(pendingPayment);

  await SecureStorageService.setItem(STORAGE_KEYS.pendingPayments, JSON.stringify(pending));
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
    // 🛡️ IDEMPOTENCY CHECK
    const alreadyProcessed = await isTransactionIdUsed(transactionId);
    if (alreadyProcessed) {
      console.log(`[EnhancedPayment] Transaction ${transactionId} already processed.`);
      return {
        success: true,
        reason: "Transaction already processed",
      };
    }

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
    const existing = await SecureStorageService.getItem(STORAGE_KEYS.pendingPayments);
    const pending = existing ? JSON.parse(existing) : [];

    const index = pending.findIndex((p: PendingPayment) => p.id === paymentId);
    if (index !== -1) {
      pending[index].status = status;
      await SecureStorageService.setItem(STORAGE_KEYS.pendingPayments, JSON.stringify(pending));
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
    const existing = await SecureStorageService.getItem(STORAGE_KEYS.activationLog);
    const logs = existing ? JSON.parse(existing) : [];
    logs.push(entry);

    // Keep only last 50 logs
    if (logs.length > 50) {
      logs.splice(0, logs.length - 50);
    }

    await SecureStorageService.setItem(STORAGE_KEYS.activationLog, JSON.stringify(logs));
  } catch (error) {
    console.error("[EnhancedPaymentService] Failed to log activation:", error);
  }
}

/**
 * Clean up expired pending payments
 */
export async function cleanupExpiredPayments(): Promise<void> {
  try {
    const existing = await SecureStorageService.getItem(STORAGE_KEYS.pendingPayments);
    const pending = existing ? JSON.parse(existing) : [];

    const now = Date.now();
    const active = pending.filter((p: PendingPayment) => p.expiresAt > now);

    await SecureStorageService.setItem(STORAGE_KEYS.pendingPayments, JSON.stringify(active));
  } catch (error) {
    console.error("[EnhancedPaymentService] Failed to cleanup expired payments:", error);
  }
}

/**
 * Get activation logs for debugging
 */
export async function getActivationLogs(): Promise<ActivationLogEntry[]> {
  try {
    const existing = await SecureStorageService.getItem(STORAGE_KEYS.activationLog);
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
    const existing = await SecureStorageService.getItem(STORAGE_KEYS.pendingPayments);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error("[EnhancedPaymentService] Failed to get pending payments:", error);
    return [];
  }
}
