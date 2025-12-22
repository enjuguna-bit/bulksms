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
 * Normalize phone number to E.164 format.
 * 
 * @param phone - Phone number in various formats
 * @param countryCode - Optional country code override (default: DEFAULT_COUNTRY_CODE)
 * @returns Normalized phone in E.164 format (e.g., +254712345678)
 */
export function normalizePhone(phone: string, countryCode: string = DEFAULT_COUNTRY_CODE): string {
  if (!phone) return "";
  const str = phone.toString().trim();

  // Preserve existing + if present at start (already international)
  const hasPlus = str.startsWith("+");

  // Strip all non-digits
  const digits = str.replace(/\D/g, "");

  // If empty after strip, return empty
  if (!digits) return "";

  // If already has plus, trust the format
  if (hasPlus) {
    return "+" + digits;
  }

  // Check if starts with country code (international format without +)
  if (digits.startsWith(countryCode) && digits.length === countryCode.length + (COUNTRY_CONFIGS[countryCode]?.localLength || 9)) {
    return "+" + digits;
  }

  // Handle local format starting with 0
  if (digits.startsWith("0")) {
    const withoutZero = digits.slice(1);
    return "+" + countryCode + withoutZero;
  }

  // Handle short format (just the local number)
  const config = COUNTRY_CONFIGS[countryCode];
  if (config && digits.length === config.localLength) {
    return "+" + countryCode + digits;
  }

  // Detect if it might be another international format
  // Common patterns: starts with 00 (international prefix)
  if (digits.startsWith("00") && digits.length > 10) {
    return "+" + digits.slice(2);
  }

  // Fallback: If long enough to be international (11+ digits), assume it has country code
  if (digits.length >= 11) {
    return "+" + digits;
  }

  // Default fallback: Prepend configured country code
  return "+" + countryCode + digits;
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
