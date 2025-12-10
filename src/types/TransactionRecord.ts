// ============================================================================
// 🧾 TransactionRecord — Canonical Model for M-PESA STK & Subscription Records
// Production-Ready, Validated, Indexed, Future-Proof
// Used by: TransactionsProvider, StatsProvider, Activation Billing
// ============================================================================

/**
 * Every transaction recorded inside the local SQLite database.
 *
 * This model supports:
 * - M-PESA STK callback extraction
 * - Cloudflare Worker STK → mobile app ingestion
 * - Manual fallback (SMS message parsing)
 * - StatsProvider analytics
 * - BillingProvider verification
 *
 * DO NOT CHANGE field names without updating:
 *   /db/transactions.ts
 *   /providers/TransactionsProvider.tsx
 *   /providers/StatsProvider.tsx
 */
export interface TransactionRecord {
  /**
   * Primary key – SQLite AUTOINCREMENT integer.
   * When parsed from SMS, this may be a string temporarily,
   * so we allow both types for safety.
   */
  id: number | string;

  /**
   * MPESA transaction reference (e.g., "RF21ABC123").
   * Always uppercase.
   */
  ref: string;

  /**
   * Merchant name or Paybill/Till label.
   * Example: "CEMES", "BulkSMS", "Netflix"
   */
  merchant: string;

  /**
   * Paybill or Till number.
   * Example: "3484366" (your Buy Goods till)
   */
  till: string;

  /**
   * Amount paid by the user in KES.
   * Never negative. Zero allowed for free trials.
   */
  amount: number;

  /**
   * Subscription plan associated with this transaction.
   * This is assigned by mpesa parsing logic or server callback.
   *
   * Example: "trial", "monthly", "weekly", "yearly"
   */
  plan: string;

  /**
   * ISO timestamp of the transaction.
   * Example: "2025-11-17T08:23:11.000Z"
   * MUST be valid ISO 8601.
   */
  dateISO: string;

  /**
   * Full raw M-PESA message.
   * Used for debugging, SMS audit, and fallback reparsing.
   */
  rawMessage: string;
}

// ============================================================================
// 🔍 Type Guard (Runtime Safety)
// ----------------------------------------------------------------------------
// You can import this into parsing or DB layers to validate unknown objects.
// ============================================================================
export function isTransactionRecord(obj: any): obj is TransactionRecord {
  return (
    obj &&
    (typeof obj.id === "number" || typeof obj.id === "string") &&
    typeof obj.ref === "string" &&
    typeof obj.merchant === "string" &&
    typeof obj.till === "string" &&
    typeof obj.amount === "number" &&
    typeof obj.plan === "string" &&
    typeof obj.dateISO === "string" &&
    typeof obj.rawMessage === "string"
  );
}

// ============================================================================
// 🧩 Default empty object for safe initialization
// ============================================================================
export const EMPTY_TRANSACTION: TransactionRecord = {
  id: "",
  ref: "",
  merchant: "",
  till: "",
  amount: 0,
  plan: "",
  dateISO: new Date(0).toISOString(),
  rawMessage: "",
};
