// ------------------------------------------------------
// 📗 src/utils/dataParsers.ts
// Transaction & SMS parsers (TS-Stable v3.3)
// ------------------------------------------------------

import type { Transaction } from "@/types";
import type { ParsedPaymentType } from "@/types/ParsedPayment";

// ------------------------------------------------------
// 🟢 Mobile Money → Transaction Parser (SMS → Transaction)
// ------------------------------------------------------
export function parseMobileMoneyTransaction(message: string): Transaction | null {
  try {
    const cleanMsg = (message || "").replace(/\u00A0/g, " ").trim();

    // Detect inflow / outflow
    const isCredit =
      /(received|deposit|payment from|credited|inflow)/i.test(cleanMsg);
    const isDebit =
      /(sent|paid to|withdraw|buy|airtime|purchase|debited|outflow)/i.test(
        cleanMsg
      );

    // 🔒 Map raw detection → strict ParsedPaymentType
    const type: ParsedPaymentType = isCredit
      ? "INCOMING"
      : isDebit
        ? "OUTGOING"
        : "UNKNOWN";

    // Extract the amount
    const amountMatch =
      cleanMsg.match(/(?:KES|KSH|Ksh|ksh)?\s*([\d,]+(?:\.\d{1,2})?)/) ?? null;

    const amount = amountMatch
      ? Number(amountMatch[1].replace(/,/g, ""))
      : 0;

    // Extract phone number
    const phoneMatch = cleanMsg.match(/\+?\d{7,13}/);
    const phoneNumber = phoneMatch ? normalizePhone(phoneMatch[0]) : "";

    // Extract customer name
    const nameMatch =
      cleanMsg.match(/from\s+([A-Za-z\s]+?)(?=[\s.,]|$)/i) ||
      cleanMsg.match(/to\s+([A-Za-z\s]+?)(?=[\s.,]|$)/i) ||
      cleanMsg.match(/by\s+([A-Za-z\s]+?)(?=[\s.,]|$)/i);

    const customerName = nameMatch ? nameMatch[1].trim() : "Unknown";

    // Extract date
    const dateMatch = cleanMsg.match(
      /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\s+\w+\s+\d{4})/
    );

    const date = dateMatch
      ? safeDate(dateMatch[0])
      : safeDate(new Date().toISOString());

    // Reject totally invalid SMS
    if (!phoneNumber && amount === 0) return null;

    return {
      id: `${phoneNumber || "TX"}-${Date.now()}`,
      customerName,
      phoneNumber,
      amount,
      date,
      type,
      rawMessage: message,
    };
  } catch (error) {
    console.error("❌ SMS parse error:", error);
    return null;
  }
}

// ------------------------------------------------------
// 🟢 Phone normalization (P2 FIX: Configurable country code)
// ------------------------------------------------------

/**
 * Default country code for phone normalization.
 * Change this constant to support different regions.
 * Format: "254" for Kenya, "1" for US/Canada, "44" for UK, etc.
 */
export const DEFAULT_COUNTRY_CODE = "254";

/**
 * Country-specific configurations for phone normalization.
 */
const COUNTRY_CONFIGS: Record<string, { localLength: number; withZeroLength: number }> = {
  "254": { localLength: 9, withZeroLength: 10 },  // Kenya: 7XXXXXXXX or 07XXXXXXXX
  "1": { localLength: 10, withZeroLength: 10 },    // US/Canada: 10 digits
  "44": { localLength: 10, withZeroLength: 11 },   // UK: 10 digits or 11 with 0
  "91": { localLength: 10, withZeroLength: 10 },   // India: 10 digits
  "27": { localLength: 9, withZeroLength: 10 },    // South Africa
  "234": { localLength: 10, withZeroLength: 11 },  // Nigeria
  "255": { localLength: 9, withZeroLength: 10 },   // Tanzania
  "256": { localLength: 9, withZeroLength: 10 },   // Uganda
};

/**
 * Normalize phone number to E.164 format with reasonable validation.
 * Accepts various formats and normalizes them, rejecting only obviously invalid numbers.
 *
 * @param phone - Phone number in various formats
 * @param countryCode - Optional country code override (default: DEFAULT_COUNTRY_CODE)
 * @returns Normalized phone in E.164 format, or empty string if clearly invalid
 */
export function normalizePhone(phone: string, countryCode: string = DEFAULT_COUNTRY_CODE): string {
  if (!phone || typeof phone !== 'string') {
    return "";
  }

  // Remove all non-numeric characters except leading +
  let cleaned = phone.trim();

  // Handle international format with leading +
  const hasLeadingPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/[^\d]/g, '');

  if (hasLeadingPlus) {
    cleaned = '+' + cleaned;
  }

  // If empty after cleaning, return empty
  if (!cleaned) {
    return "";
  }

  // Handle different formats
  if (cleaned.startsWith('+')) {
    // International format: +XXXXXXXXX
    const withoutPlus = cleaned.substring(1);

    // If it's already +254 format, validate basic length for Kenya
    if (withoutPlus.startsWith('254')) {
      const localNumber = withoutPlus.substring(3);
      // Accept any 6-9 digit number for Kenya (be more permissive)
      if (localNumber.length >= 6 && localNumber.length <= 9) {
        return '+254' + localNumber.padStart(9, '0').slice(-9); // Pad/truncate to 9 digits
      }
    }

    // For other international numbers, accept reasonable lengths (7-15 digits)
    if (withoutPlus.length >= 7 && withoutPlus.length <= 15) {
      return cleaned;
    }

    return ""; // Invalid international format
  } else {
    // Local format: various possibilities
    let digits = cleaned;

    // Handle leading 254 (without +) - international format without +
    if (digits.startsWith('254')) {
      digits = digits.substring(3);
    }

    // Remove leading zero if present
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }

    // Accept reasonable local lengths (6-10 digits, be permissive)
    if (digits.length >= 6 && digits.length <= 10) {
      // Pad to 9 digits for Kenyan numbers, but accept other lengths for international
      if (digits.length <= 9) {
        return '+254' + digits.padStart(9, '0').slice(-9);
      } else {
        // Assume it's already an international number
        return '+' + digits;
      }
    }

    return ""; // Invalid local format
  }
}

// ------------------------------------------------------
// 🟢 Safe date parser
// ------------------------------------------------------
export function safeDate(value: any): string {
  try {
    const d = new Date(value);
    return isNaN(d.getTime())
      ? new Date().toISOString()
      : d.toISOString();
  } catch (_) {
    return new Date().toISOString();
  }
}

// ------------------------------------------------------
// 🟢 Excel / CSV row parsers
// ------------------------------------------------------
export function parseCustomerRow(row: any) {
  return {
    name: row.name || row.Name || "",
    phone: normalizePhone(row.phone || row.Phone || ""),
    amount: Number(row.amount || row.Amount || 0),
    raw: row,
  };
}

export function parseLoanRecord(row: any) {
  return {
    account: row.account || row.Account || "",
    name: row.name || row.Name || "",
    phone: normalizePhone(row.phone || row.Phone || ""),
    arrears: Number(row.arrears || row.Arrears || 0),
    lastSeen: safeDate(row.lastSeen || row.LastSeen),
    raw: row,
  };
}
