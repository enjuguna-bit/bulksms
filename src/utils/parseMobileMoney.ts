// ------------------------------------------------------
// 💬 src/utils/parseMobileMoney.ts
// Generic M-PESA / Airtel / Equitel SMS parser (offline safe)
// ------------------------------------------------------

import { normalizePhone } from "./dataParsers";

export interface ParsedMobileMoney {
  name: string;
  phone: string;
  ref: string;
  dateISO: string;
  type: "INCOMING" | "OUTGOING";
}

/**
 * ✅ Parse an incoming or outgoing mobile money message.
 * Detects PayBill, Buy Goods, personal transfers, deposits, etc.
 * Returns `null` if unrecognized.
 */
export function parseMobileMoneyMessage(message: string): ParsedMobileMoney | null {
  try {
    if (!message || typeof message !== "string") return null;

    const text = message.replace(/\s+/g, " ").trim();

    // 🔹 Reference (e.g., QAB123ABC or TFJ56T6Y)
    const refMatch = text.match(/^([A-Z0-9]{8,12})\s/i);
    const ref = refMatch ? refMatch[1] : "UNKNOWN";

    // 🔹 Amount (optional but checked for structure)
    const amountMatch = text.match(/Ksh\s?([\d,]+(\.\d{1,2})?)/i);
    const amount = amountMatch ? amountMatch[1] : null;

    // 🔹 PayBill or Buy Goods ID
    const paybillMatch = text.match(/PayBill\s(\d{4,8})/i);
    const tillMatch = text.match(/till\s(?:number\s)?(\d{4,8})/i);
    const business = paybillMatch ? paybillMatch[1] : tillMatch ? tillMatch[1] : null;

    // 🔹 Sender / Recipient Name & Phone
    const fromMatch = text.match(/from\s([A-Za-z\s]+)\s(\d{7,12})/i);
    const toMatch = text.match(/to\s([A-Za-z\s]+)\s(\d{7,12})/i);

    let name = "Unknown";
    let phone = "";

    if (fromMatch) {
      name = fromMatch[1].trim();
      phone = normalizePhone(fromMatch[2]);
    } else if (toMatch) {
      name = toMatch[1].trim();
      phone = normalizePhone(toMatch[2]);
    }

    // 🔹 Date extraction
    const dateMatch = text.match(/on\s(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    let dateISO = new Date().toISOString();

    if (dateMatch) {
      const parts = dateMatch[1].split(/[\/\-]/);
      const [d, m, yRaw] = parts;
      const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
      const dateObj = new Date(
        `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T09:00:00Z`
      );
      dateISO = dateObj.toISOString();
    }

    // 🔹 Type detection
    const isIncoming =
      /(received|deposit|payment from|PayBill)/i.test(text) ||
      /Confirm(ed)?\.?\s*Ksh\s/i.test(text);

    const type: "INCOMING" | "OUTGOING" = isIncoming ? "INCOMING" : "OUTGOING";

    // 🔹 Fallback for business or merchant IDs
    const phoneResolved =
      business && !phone ? `Business:${business}` : phone || "Unknown";

    return { name, phone: phoneResolved, ref, dateISO, type };
  } catch (e) {
    console.log("[parseMobileMoneyMessage] Error:", e);
    return null;
  }
}
