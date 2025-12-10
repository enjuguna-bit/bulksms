// ------------------------------------------------------
// 📲 src/services/mpesaStk.ts
// Safaricom STK Push helper — uses your MPESA_WORKER_URL
// ------------------------------------------------------

import AsyncStorage from "@react-native-async-storage/async-storage";
import { MPESA_WORKER_URL } from "@/constants/mpesa";

const LAST_PHONE_KEY = "mpesaPhone";

export async function getLastMpesaPhone(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(LAST_PHONE_KEY);
    return v || null;
  } catch (_) {
    return null;
  }
}

export async function saveLastMpesaPhone(phone: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_PHONE_KEY, phone);
  } catch (err) {
    console.warn("[mpesaStk] Failed to save phone:", err);
  }
}

/**
 * Sends an STK push request to your Cloudflare Worker (or any MPESA_WORKER_URL).
 * The worker is expected to accept:
 *   { phone: string, amount: number, reason?: string }
 */
export async function sendStkPush(phone: string, amount: number): Promise<void> {
  const body = JSON.stringify({
    phone,
    amount,
    reason: "BulkSMS subscription",
  });

  const res = await fetch(MPESA_WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || `STK push failed with status ${res.status}`
    );
  }

  await saveLastMpesaPhone(phone);
}
