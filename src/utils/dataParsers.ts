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
// 🟢 Phone normalization
// ------------------------------------------------------
export function normalizePhone(phone: string): string {
  if (!phone) return "";
  const str = phone.toString().trim();

  // Preserve existing + if present at start
  const hasPlus = str.startsWith("+");

  // Strip all non-digits
  const digits = str.replace(/\D/g, "");

  // If empty after strip, return empty
  if (!digits) return "";

  // Helper: check lengths (Kenya mobile usually 9 digits sans prefix, 10 with 0, 12 with 254)

  if (hasPlus) {
    // Already had plus, trust the digits (format: +2547...)
    return "+" + digits;
  }

  // Handle 07... / 01... (Kenya local)
  if (digits.startsWith("0") && digits.length === 10) {
    return "+254" + digits.slice(1);
  }

  // Handle 254... (ISO no plus)
  if (digits.startsWith("254") && digits.length === 12) {
    return "+" + digits;
  }

  // Handle 7... / 1... (Short format, assume Kenya)
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) {
    return "+254" + digits;
  }

  // Fallback: If it looks international (long enough), append +. Otherwise default to +254 + digits?
  // Safest default for this specific app seems to be assuming a + prefix if missing for long numbers, or prepending +254.
  // Given previous logic, let's stick to prepending +254 if unsafe, OR just return +digits if weird.
  // Use the original fallback logic which seemed to default to +254
  return "+254" + digits;
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
