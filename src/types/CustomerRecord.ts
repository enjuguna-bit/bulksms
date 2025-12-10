// --------------------------------------------------------------
// 📁 src/types/CustomerRecord.ts
// 📡 Strong global type for all payment-capture records
// --------------------------------------------------------------
//
// Used by:
//   • usePaymentCapture hook
//   • SupermarketCapturePro screen
//   • M-PESA parsers
//   • CSV Exporter
//   • POS Sync Service
//
// This is the single source of truth for all record structures.
// --------------------------------------------------------------

export type PaymentDirection = "INCOMING" | "OUTGOING" | "UNKNOWN";

/**
 * Base structure of a captured payment record.
 * Stored in AsyncStorage under `payment.capture.records`.
 * Synced with POS and used by UI components.
 */
export interface CustomerRecord {
  /** Unique ID generated from timestamp (string) */
  id: string;

  /** Customer name extracted from M-PESA message */
  name: string;

  /** Phone number e.g. 0712345678 (UI-normalized) */
  phone: string;

  /** Raw SMS body exactly as received */
  rawMessage: string;

  /** Transaction type inferred from parser */
  type: PaymentDirection;

  /** Timestamp of last time this customer was seen (ms) */
  lastSeen: number;

  /** Number of payments seen from this customer */
  transactionCount: number;
}

/**
 * UI-specific enriched item used in SupermarketCapturePro.
 * Extends CustomerRecord with guaranteed UI fields.
 */
export interface LocalRecordItem extends CustomerRecord {
  /** FOR UI: nicely formatted display label */
  displayName?: string;

  /** FOR UI: extracted M-PESA amount (KES) */
  amount?: number;

  /** Whether parser detected outgoing payment */
  isOutgoing?: boolean;

  /** Optional override for special UI logic */
  direction?: PaymentDirection;
}

/**
 * Exported alias for consistency in components.
 */
export type RecordItem = CustomerRecord;
