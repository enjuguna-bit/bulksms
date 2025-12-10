// ------------------------------------------------------
// ⚙️ src/utils/mpesaParser.ts
// Strict M-PESA billing parser + v3.5 Payment Parser
// Defensive, idempotent, fail-closed
// ------------------------------------------------------

import AsyncStorage from "@react-native-async-storage/async-storage";

// ======================================================
// 1) BILLING / SUBSCRIPTION PARSER (Strict for activation)
// ======================================================

export type MpesaPlan = "monthly" | "quarterly" | "yearly";

export interface ParsedMpesaTransaction {
  ref: string;
  amount: number;
  merchant: string;
  till: string;
  dateISO: string;
  plan: MpesaPlan;
}

const PLAN_AMOUNT_MAP: Record<MpesaPlan, number> = {
  monthly: 999,
  quarterly: 2499,
  yearly: 7499,
};

const BILLING_KEYS = {
  subEnd: "@billing.subEnd",
  subStart: "@billing.subStart",
  subPlan: "@billing.subPlan",
  subRef: "@billing.subRef",
  subMerchant: "@billing.subMerchant",
  subTill: "@billing.subTill",
} as const;

/**
 * Detect plan from amount, with very small tolerance to handle decimals.
 */
export function detectPlanFromAmount(amount: number): MpesaPlan | null {
  const rounded = Math.round(amount); // 999.00 → 999
  for (const [plan, amt] of Object.entries(PLAN_AMOUNT_MAP) as [
    MpesaPlan,
    number
  ][]) {
    if (rounded === amt) return plan;
  }
  return null;
}

/**
 * Persist full plan info for offline use by BillingProvider, ExpiredScreen, etc.
 */
export async function cacheMpesaPlanInfo(
  tx: ParsedMpesaTransaction,
  startMs: number,
  endMs: number
): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [BILLING_KEYS.subPlan, tx.plan],
      [BILLING_KEYS.subStart, String(startMs)],
      [BILLING_KEYS.subEnd, String(endMs)],
      [BILLING_KEYS.subRef, tx.ref],
      [BILLING_KEYS.subMerchant, tx.merchant],
      [BILLING_KEYS.subTill, tx.till ?? ""],
    ]);
  } catch (e) {
    console.log("[mpesaParser] cacheMpesaPlanInfo failed:", e);
  }
}

/**
 * Read cached plan info offline.
 */
export async function getCachedMpesaPlanInfo(): Promise<{
  plan?: MpesaPlan;
  start?: number;
  end?: number;
  ref?: string;
  merchant?: string;
  till?: string;
}> {
  try {
    const entries = await AsyncStorage.multiGet([
      BILLING_KEYS.subPlan,
      BILLING_KEYS.subStart,
      BILLING_KEYS.subEnd,
      BILLING_KEYS.subRef,
      BILLING_KEYS.subMerchant,
      BILLING_KEYS.subTill,
    ]);

    const map = Object.fromEntries(
      entries.map(([k, v]) => [k, v ?? ""])
    ) as Record<string, string>;

    const plan = (map[BILLING_KEYS.subPlan] as MpesaPlan | "") || undefined;
    const start = map[BILLING_KEYS.subStart]
      ? Number(map[BILLING_KEYS.subStart])
      : undefined;
    const end = map[BILLING_KEYS.subEnd]
      ? Number(map[BILLING_KEYS.subEnd])
      : undefined;

    return {
      plan,
      start,
      end,
      ref: map[BILLING_KEYS.subRef] || undefined,
      merchant: map[BILLING_KEYS.subMerchant] || undefined,
      till: map[BILLING_KEYS.subTill] || undefined,
    };
  } catch (e) {
    console.log("[mpesaParser] getCachedMpesaPlanInfo failed:", e);
    return {};
  }
}

/**
 * ✅ Parse and validate an M-PESA message for subscription.
 * Returns null if invalid, old, fake, wrong merchant, or duplicate.
 */
export async function parseAndValidateMpesaSms(
  message: string
): Promise<ParsedMpesaTransaction | null> {
  try {
    if (!message || typeof message !== "string") return null;
    const normalized = message.replace(/\s+/g, " ").trim();

    // 🔹 Extract reference ID (e.g. THQ5ZPB2TN)
    const refMatch = normalized.match(/^([A-Z0-9]{8,12})\s/i);
    const ref = refMatch ? refMatch[1] : null;

    // 🔹 Extract amount (e.g. Ksh4,000.00 or Ksh 2,499.00)
    const amountMatch = normalized.match(/Ksh\s?([\d,]+(\.\d{1,2})?)/i);
    const amount = amountMatch
      ? parseFloat(amountMatch[1].replace(/,/g, ""))
      : null;

    // 🔹 Extract merchant name (CEMES or AFRISERVE LOGISTICS etc.)
    const merchantMatch = normalized.match(/paid\s+to\s+([A-Z\s]+)/i);
    const merchant = merchantMatch
      ? merchantMatch[1].trim().toUpperCase()
      : null;

    // 🔹 Extract till number (e.g. till number 3484366)
    const tillMatch = normalized.match(/till\s(?:number\s)?(\d{4,8})/i);
    const till = tillMatch ? tillMatch[1] : "";

    // 🔹 Extract date (on 26/8/25 or 26/08/2025 etc.)
    const dateMatch = normalized.match(/on\s(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    let dateISO = "";
    if (dateMatch) {
      const [d, m, y] = dateMatch[1].split("/");
      const fullYear = y.length === 2 ? `20${y}` : y;
      const parsedDate = new Date(
        `${fullYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00`
      );
      dateISO = parsedDate.toISOString();
    }

    // 🔒 Fail-closed validation
    if (!ref || !amount || !merchant || !dateISO) return null;
    if (merchant !== "AFRISERVE LOGISTICS" && merchant !== "CEMES") return null;

    // 🔹 Identify plan by amount (auto-detect using PLAN_AMOUNT_MAP)
    const plan = detectPlanFromAmount(amount);
    if (!plan) return null;

    // 🔒 Reject old (over 3 days) SMS
    const now = Date.now();
    const msgTime = new Date(dateISO).getTime();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    if (isNaN(msgTime) || now - msgTime > threeDaysMs) return null;

    // 🔁 Reject duplicates
    const key = `@mpesa.processed.${ref}`;
    const seen = await AsyncStorage.getItem(key);
    if (seen) return null;
    await AsyncStorage.setItem(key, "1");

    // ✅ Compute new expiry and persist for BillingProvider
    const durationMs =
      plan === "monthly"
        ? 30 * 24 * 60 * 60 * 1000
        : plan === "quarterly"
        ? 90 * 24 * 60 * 60 * 1000
        : 365 * 24 * 60 * 60 * 1000;

    const newExpiry = now + durationMs;

    // Backwards compat: keep original key
    await AsyncStorage.setItem(BILLING_KEYS.subEnd, String(newExpiry));

    const tx: ParsedMpesaTransaction = {
      ref,
      amount,
      merchant,
      till,
      dateISO,
      plan,
    };

    // New: full offline plan cache
    await cacheMpesaPlanInfo(tx, now, newExpiry);

    return tx;
  } catch (err) {
    console.log("[mpesaParser] fatal:", err);
    return null;
  }
}

// ======================================================
// 2) PAYMENT CAPTURE PARSER v3.5 (for usePaymentCapture)
// ======================================================

export type ParsedMobileMoney = {
  name: string;
  phone: string;
  amount: number;
  type: "INCOMING" | "OUTGOING" | "UNKNOWN";
  channel: "MPESA" | "AIRTEL" | "BANK" | "OTHER";
  accountRef?: string;
  raw?: string;
};

// ------------------------------
// Helpers
// ------------------------------
const cleanAmount = (a: string) =>
  Number(a.replace(/[^\d]/g, "")) || 0;

const cleanPhone = (p: string) => {
  const digits = p.replace(/[^\d]/g, "");
  if (digits.startsWith("254")) return "+" + digits;
  if (digits.startsWith("07")) return "+254" + digits.slice(1);
  if (digits.startsWith("01")) return "+254" + digits.slice(1);
  return digits.length >= 9 ? "+254" + digits.slice(-9) : "";
};

const extractName = (raw: string) => {
  const clean = raw
    .replace(/\d+/g, "")
    .replace(/[^A-Za-z\s.]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "";
  return clean
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

// ------------------------------
// Regex library v3.5
// ------------------------------

// 1. Classic M-PESA receive money
const rIN_MPESA_PERSONAL =
  /received\s+ksh?\s?([\d,]+)\s+from\s+([\w\s.'-]+)\s+(\d{10}|\+?\d+)/i;

// 2. "Confirmed. Ksh XXX received from NAME PHONE"
const rIN_MPESA_CONFIRMED =
  /confirmed.*ksh?\s?([\d,]+).*received\s+from\s+([\w\s.'-]+)\s+(\d{10}|\+?\d+)/i;

// 3. Buy Goods / Till
const rBUYGOODS =
  /paid\s+ksh?\s?([\d,]+).*to\s+(.+?)\s+for\s+account/i;

// 4. Paybill
const rPAYBILL =
  /paid\s+ksh?\s?([\d,]+).*to\s+(.+?)\s+account\s+(.+?)\s/i;

// 5. Bank → M-PESA
const rBANK_TO_MPESA =
  /ksh?\s?([\d,]+).*sent\s+to\s+(.*?)\s+(0\d{9}|\+?\d{12})/i;

// 6. M-PESA → Bank
const rMPESA_TO_BANK =
  /ksh?\s?([\d,]+).*transferred\s+to\s+(.+?)\s+account/i;

// 7. Airtel Money
const rAIRTEL =
  /airtel.*received.*ksh?\s?([\d,]+).*from\s+([\w\s.'-]+)\s+(\d{10}|\+?\d+)/i;

// 8. Unstructured fallback
const rUNSTRUCTURED =
  /(received|you have received).*ksh?\s?([\d,]+).*from\s+([\w\s.'-]+)/i;

// ------------------------------------------------------
// Generic parser used by Supermarket Capture / Inbox
// ------------------------------------------------------
export function parseMobileMoneyMessage(
  message: string
): ParsedMobileMoney | null {
  if (!message) return null;
  const m = message.replace(/\s+/g, " ").trim();

  // 1. Classic receive money
  let x = m.match(rIN_MPESA_PERSONAL);
  if (x) {
    return {
      amount: cleanAmount(x[1]),
      name: extractName(x[2]),
      phone: cleanPhone(x[3]),
      type: "INCOMING",
      channel: "MPESA",
      raw: message,
    };
  }

  // 2. Confirmed… received from NAME PHONE
  x = m.match(rIN_MPESA_CONFIRMED);
  if (x) {
    return {
      amount: cleanAmount(x[1]),
      name: extractName(x[2]),
      phone: cleanPhone(x[3]),
      type: "INCOMING",
      channel: "MPESA",
      raw: message,
    };
  }

  // 3. Buy Goods
  x = m.match(rBUYGOODS);
  if (x) {
    return {
      amount: cleanAmount(x[1]),
      name: extractName(x[2]),
      phone: "",
      accountRef: "BUYGOODS",
      type: "OUTGOING",
      channel: "MPESA",
      raw: message,
    };
  }

  // 4. Paybill
  x = m.match(rPAYBILL);
  if (x) {
    return {
      amount: cleanAmount(x[1]),
      name: extractName(x[2]),
      phone: "",
      accountRef: x[3],
      type: "OUTGOING",
      channel: "MPESA",
      raw: message,
    };
  }

  // 5. Bank → M-PESA
  x = m.match(rBANK_TO_MPESA);
  if (x) {
    return {
      amount: cleanAmount(x[1]),
      name: extractName(x[2]),
      phone: cleanPhone(x[3]),
      type: "INCOMING",
      channel: "BANK",
      raw: message,
    };
  }

  // 6. M-PESA → Bank
  x = m.match(rMPESA_TO_BANK);
  if (x) {
    return {
      amount: cleanAmount(x[1]),
      name: extractName(x[2]),
      phone: "",
      type: "OUTGOING",
      channel: "BANK",
      raw: message,
    };
  }

  // 7. Airtel Money
  x = m.match(rAIRTEL);
  if (x) {
    return {
      amount: cleanAmount(x[1]),
      name: extractName(x[2]),
      phone: cleanPhone(x[3]),
      type: "INCOMING",
      channel: "AIRTEL",
      raw: message,
    };
  }

  // 8. Unstructured fallback
  x = m.match(rUNSTRUCTURED);
  if (x) {
    return {
      amount: cleanAmount(x[2]),
      name: extractName(x[3]),
      phone: "",
      type: "INCOMING",
      channel: "OTHER",
      raw: message,
    };
  }

  // Fallback: nothing matched
  return {
    amount: 0,
    name: "",
    phone: "",
    type: "UNKNOWN",
    channel: "OTHER",
    raw: message,
  };
}
