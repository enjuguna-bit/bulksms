// --------------------------------------------------------------
// 📁 src/types/ParsedPayment.ts
// 🔍 Strong typing for all parsed M-PESA messages
// --------------------------------------------------------------
//
// Used by:
//   • usePaymentCapture
//   • mpesaParser utils
//   • SMS listener
//   • POS Sync Service
//
// Ensures every parser returns a consistent structure.
// --------------------------------------------------------------

export type ParsedPaymentType =
  | "INCOMING"
  | "OUTGOING"
  | "UNKNOWN";

/**
 * Represents the standardized, fully-parsed
 * M-PESA message structure extracted from raw SMS text.
 */
export interface ParsedPayment {
  /** Detected payment type */
  type: ParsedPaymentType;

  /** Customer / sender name — required for valid payment */
  name: string;

  /** Phone number extracted, normalized to 07XXXXXXXX or +254XXXXXXXXX */
  phone: string;

  /** Amount extracted from message (KES) */
  amount: number;

  /** Optional M-PESA transaction code (e.g., QJG45H76A) */
  code?: string;

  /** Optional timestamp extracted, if message contains it */
  date?: number;

  /** Optional paybill or till number */
  paybill?: string;

  /** Optional account number (e.g. when message includes “Account XYZ”) */
  account?: string;

  /** Parsed message source */
  source?: "SMS" | "INBOX" | "LISTENER" | "MANUAL" | "SERVER";

  /** Raw message for debugging — always preserved */
  raw: string;
}
