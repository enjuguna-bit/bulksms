/**
 * Sync a payment or transaction record with external POS.
 * Includes:
 *  - timeout handling
 *  - structured error logging
 *  - response validation
 *  - retry attempts
 */

import Logger from "@/utils/logger";

const POS_ENDPOINT = "https://your-pos-endpoint/api/payments";
const TIMEOUT_MS = 8000; // 8 seconds
const MAX_RETRIES = 2;
const RETRY_DELAYS = [0, 1000, 3000]; // 0ms, 1s, 3s (exponential backoff)

export interface POSRecord {
  id: string;
  name: string;
  phone: string;
  amount?: number;
  createdAt?: number;
}

async function fetchWithTimeout(resource: string, options: RequestInit, timeout: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(resource, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function syncRecordWithPOS(record: POSRecord): Promise<boolean> {
  const payload = {
    ref: record.id,
    name: record.name,
    phone: record.phone,
    amount: record.amount ?? null,
    timestamp: record.createdAt ?? Date.now(),
  };

  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      const res = await fetchWithTimeout(
        POS_ENDPOINT,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        TIMEOUT_MS
      );

      if (!res.ok) {
        Logger.warn("POS Sync", `Server responded with ${res.status}: ${res.statusText}`);
        attempt++;

        // Exponential backoff before retry
        if (attempt <= MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
        }
        continue;
      }

      const data = await res.json().catch(() => ({}));
      Logger.info("POS Sync", "Success", data);
      return true;
    } catch (e: any) {
      Logger.warn("POS Sync", `Attempt ${attempt + 1} failed`, e.message);
      attempt++;

      // Exponential backoff before retry
      if (attempt <= MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      }
    }
  }

  Logger.error("POS Sync", "All attempts failed for record", payload);
  return false;
}
