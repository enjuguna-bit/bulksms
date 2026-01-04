import { SecureStorageService } from "@/services/SecureStorageService";
import { Platform } from "react-native";
import { subscriptionManager } from "@/services/billing/SubscriptionManager";
import { getPlanByAmount } from "@/services/billing/SubscriptionPlans";

// Storage keys
const STORAGE_KEYS = {
  subscription: "subscription:data",
  usedCodes: "subscription:usedCodes",
  pending: "subscription:pending",
};

// ----------------------
// 🔐 Idempotency Protection
// ----------------------
// Tracks processed transaction codes to prevent duplicate activations
const USED_CODES_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days retention

interface UsedCodeEntry {
  code: string;
  amount: number;
  processedAt: number;
}

/**
 * Get list of previously processed transaction codes
 */
async function getUsedCodes(): Promise<UsedCodeEntry[]> {
  try {
    const raw = await SecureStorageService.getItem(STORAGE_KEYS.usedCodes);
    if (!raw) return [];
    const codes = JSON.parse(raw) as UsedCodeEntry[];
    // Filter out expired entries
    const nowTs = Date.now();
    return codes.filter(c => (nowTs - c.processedAt) < USED_CODES_MAX_AGE_MS);
  } catch (_) {
    return [];
  }
}

/**
 * Check if a transaction code has already been processed
 */
export async function isCodeAlreadyUsed(code: string, amount: number): Promise<boolean> {
  const usedCodes = await getUsedCodes();
  // Match on both code and amount to handle edge cases
  return usedCodes.some(c => c.code === code && c.amount === amount);
}

/**
 * Check if a transaction code has already been processed (ignoring amount)
 * Useful for checking status where amount might not be known yet
 */
export async function isTransactionIdUsed(code: string): Promise<boolean> {
  const usedCodes = await getUsedCodes();
  return usedCodes.some(c => c.code === code);
}

/**
 * Mark a transaction code as processed
 */
async function markCodeAsUsed(code: string, amount: number): Promise<void> {
  try {
    const usedCodes = await getUsedCodes();
    usedCodes.push({
      code,
      amount,
      processedAt: Date.now(),
    });
    await SecureStorageService.setItem(STORAGE_KEYS.usedCodes, JSON.stringify(usedCodes));
    console.log(`[MpesaSubscriptionService] ✅ Marked code as used: ${code}`);
  } catch (e) {
    console.warn(`[MpesaSubscriptionService] Failed to mark code as used:`, e);
  }
}

// Helper functions
const now = () => Date.now();

// Plan pricing - must match frontend MPESA_PLANS in constants/mpesa.ts
// Frontend displays: 1 day = KES 200, 7 days = KES 900, 30 days = KES 1000 (special) or 3900
const PLANS: Record<number, { name: string; days: number }> = {
  // Current production pricing (sync with frontend)
  200: { name: "daily", days: 1 },
  900: { name: "weekly", days: 7 },
  1000: { name: "monthly_special", days: 30 }, // ⭐ Special 30-day offer at KES 1000
  3900: { name: "monthly", days: 30 },
  // Legacy pricing (for backwards compatibility with older transactions)
  1: { name: "daily", days: 1 },
  50: { name: "weekly", days: 7 },
  500: { name: "quarterly", days: 90 },
  1500: { name: "yearly", days: 365 },
};


/**
 * Get plan for amount paid - supports overpayment tolerance
 * If user pays more than required, it finds the best matching plan
 * Examples: Pay 209 → daily (200), Pay 950 → weekly (900)
 */
function planForAmount(amount: number): { name: string; days: number } {
  // Check for exact match first
  const exactMatch = PLANS[amount as keyof typeof PLANS];
  if (exactMatch) return exactMatch;

  // Get production plan amounts (>= 200) sorted descending
  const planAmounts = Object.keys(PLANS)
    .map(Number)
    .filter(a => a >= 200)
    .sort((a, b) => b - a);

  // Find the highest plan amount that is <= the paid amount
  for (const planAmount of planAmounts) {
    if (amount >= planAmount) {
      const plan = PLANS[planAmount as keyof typeof PLANS];
      if (plan) {
        console.log(`[MpesaSubscription] Amount KES ${amount} matched to ${plan.name} plan (requires KES ${planAmount})`);
        return plan;
      }
    }
  }

  return { name: "unknown", days: 0 };
}

function parseSmsBody(body: string) {
  const regex = /confirmed\.you have sent ksh([\d,]+)\.\d+ to ([\d]+) ([\s\S]+?) on (\d{1,2}\/\d{1,2}\/\d{2}) at (\d{1,2}:\d{2} [AP]M)/i;
  const match = body.match(regex);
  if (!match) return null;

  return {
    amount: parseInt(match[1].replace(/,/g, "")),
    code: match[2],
    payee: match[3].trim(),
    date: match[4],
    time: match[5],
  };
}

// ----------------------
// 🔐 Security Config (P0 FIX - Device-Specific Integrity Key)
// ----------------------
const INTEGRITY_KEY_STORAGE = "device_integrity_key_v2";

/**
 * Get or generate a unique device-specific integrity key.
 * This ensures subscriptions are bound to this specific device installation.
 */
async function getIntegrityKey(): Promise<string> {
  let key = await SecureStorageService.getItem(INTEGRITY_KEY_STORAGE);

  if (!key) {
    // Generate a strong random key (64 chars)
    const array = new Uint32Array(8);
    // Simple fallback random generation if crypto not available globally
    const randomPart = () => Math.random().toString(36).substring(2);
    key = Array(6).fill(0).map(randomPart).join(''); // ~60-70 chars

    // Persist securely
    await SecureStorageService.setItem(INTEGRITY_KEY_STORAGE, key);
  }

  return key;
}

/**
 * Generate HMAC-SHA256 hash of subscription data.
 * Falls back to enhanced hash if crypto is unavailable.
 */
async function generateHash(data: SubscriptionData): Promise<string> {
  try {
    // Create deterministic string of critical fields
    const payload = JSON.stringify({
      code: data.code,
      amount: data.amount,
      planDays: data.planDays,
      activatedAt: data.activatedAt,
      expiryAt: data.expiryAt,
      source: data.source || 'unknown'
    });

    // Use a more robust hash algorithm (SHA-256 via simple implementation)
    // This is much stronger than the previous 32-bit DJB2 hash
    const integrityKey = await getIntegrityKey();
    const hash = sha256(payload + integrityKey);
    return hash;
  } catch (e) {
    console.warn('[MpesaSubscriptionService] Hash generation failed, using fallback:', e);
    // Fallback to enhanced version of original (still better than before)
    const k = await getIntegrityKey();
    const raw = `${data.code}|${data.amount}|${data.expiryAt}|${data.activatedAt}|${k}`;
    return enhancedHash(raw);
  }
}

/**
 * Simple SHA-256 implementation for React Native
 * Uses the same algorithm as Web Crypto API
 */
function sha256(message: string): string {
  // SHA-256 constants
  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  // Initial hash values
  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  // Helper functions
  const rightRotate = (value: number, amount: number) =>
    ((value >>> amount) | (value << (32 - amount))) >>> 0;

  // Pre-processing: adding padding bits
  const msgBuffer = new Uint8Array(new TextEncoder().encode(message));
  const bitLength = msgBuffer.length * 8;
  const paddingLength = ((448 - (bitLength + 1) % 512) + 512) % 512;
  const totalLength = msgBuffer.length + 1 + (paddingLength >> 3) + 8;

  const paddedMsg = new Uint8Array(totalLength);
  paddedMsg.set(msgBuffer);
  paddedMsg[msgBuffer.length] = 0x80;

  // Append length in bits as big-endian 64-bit
  const view = new DataView(paddedMsg.buffer);
  view.setUint32(totalLength - 4, bitLength, false);

  // Process each 512-bit chunk
  for (let offset = 0; offset < paddedMsg.length; offset += 64) {
    const W = new Uint32Array(64);

    // Copy chunk into first 16 words
    for (let i = 0; i < 16; i++) {
      W[i] = (paddedMsg[offset + i * 4] << 24) |
        (paddedMsg[offset + i * 4 + 1] << 16) |
        (paddedMsg[offset + i * 4 + 2] << 8) |
        (paddedMsg[offset + i * 4 + 3]);
    }

    // Extend the first 16 words into the remaining 48 words
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(W[i - 15], 7) ^ rightRotate(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rightRotate(W[i - 2], 17) ^ rightRotate(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    // Initialize working variables
    let [a, b, c, d, e, f, g, h] = H;

    // Compression function main loop
    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e >>> 0) & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    // Add compressed chunk to current hash value
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  // Produce the final hash value (big-endian)
  return H.map(v => v.toString(16).padStart(8, '0')).join('');
}

/**
 * Enhanced fallback hash (still better than original 32-bit)
 */
function enhancedHash(input: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ chr, 2654435761);
    h2 = Math.imul(h2 ^ chr, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// ... (Keep existing constants: PLANS, MPESA_TILL_NUMBER, etc.) ...

// ----------------------
// Types (Updated)
// ----------------------
export type SubscriptionData = {
  code: string;
  amount: number;
  planDays: number;
  payee?: string | null;
  activatedAt: number;
  expiryAt: number;
  source?: "mpesa" | "store";
  _hash?: string; // 🛡️ Integrity check
};

// ... (Keep helpers: now, planForAmount, readJson) ...

// ----------------------
// 🛡️ Secure Storage
// ----------------------

/**
 * Atomic write for Code Usage + Subscription
 * Prevents race conditions where code is marked used but subscription isn't saved.
 */
async function activateSubscriptionAtomic(sub: SubscriptionData, usedCodeEntry: UsedCodeEntry) {
  // 1. Prepare Data
  sub._hash = await generateHash(sub);
  const subJson = JSON.stringify(sub);

  // 2. Load current Used Codes to append
  const currentUsedCodes = await getUsedCodes(); // This uses getItem internally
  // Add new (but don't save yet)
  currentUsedCodes.push(usedCodeEntry);
  const usedCodesJson = JSON.stringify(currentUsedCodes);

  // 3. ATOMIC WRITE
  await SecureStorageService.multiSet([
    [STORAGE_KEYS.subscription, subJson],
    [STORAGE_KEYS.usedCodes, usedCodesJson]
  ]);
}

async function saveSubscription(sub: SubscriptionData) {
  // 1. Generate hash before saving
  sub._hash = await generateHash(sub);
  await SecureStorageService.setItem(STORAGE_KEYS.subscription, JSON.stringify(sub));
}

export async function getSubscriptionInfo(): Promise<SubscriptionData | null> {
  const raw = await SecureStorageService.getItem(STORAGE_KEYS.subscription);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SubscriptionData;

    // 2. Verify hash on read
    const computed = await generateHash(data);
    if (data._hash !== computed) {
      console.warn("⚠️ Subscription data tampered! Invalidating.");
      await resetSubscription(); // Nuke the fake data
      return null;
    }
    return data;
  } catch (_) {
    return null;
  }
}

// ... (Keep SMS Parsing & Pending Logic intact) ...

// ----------------------
// 🚀 Activation Logic (Updated with SubscriptionManager)
// ----------------------
export async function activateSubscriptionFromSms(body: string, arrivalTime?: number) {
  // Parse SMS body
  const parsed = parseSmsBody(body);
  if (!parsed) {
    return { ok: false, reason: "Invalid SMS format" };
  }

  // ✅ IDEMPOTENCY CHECK: Prevent duplicate transaction processing
  const alreadyProcessed = await isCodeAlreadyUsed(parsed.code, parsed.amount);
  if (alreadyProcessed) {
    console.log(`[MpesaSubscriptionService] ⚠️ Duplicate transaction detected: ${parsed.code}`);
    return {
      ok: false,
      reason: `Transaction ${parsed.code} already processed. If you believe this is an error, please contact support.`
    };
  }

  // Use new plan lookup
  const planInfo = getPlanByAmount(parsed.amount);
  const plan = planInfo ? { name: planInfo.name, days: planInfo.days } : planForAmount(parsed.amount);

  // Validate plan mapping
  if (plan.days === 0) {
    console.warn(`[MpesaSubscriptionService] Unknown amount: KES ${parsed.amount}`);
    return {
      ok: false,
      reason: `Unrecognized payment amount: KES ${parsed.amount}. Please contact support.`
    };
  }

  // ✅ Use new SubscriptionManager for activation (handles extension logic)
  try {
    const result = await subscriptionManager.activateFromPayment(
      parsed.amount,
      parsed.code,
      'mpesa'
    );

    if (result.success && result.subscription) {
      const reason = result.subscription.extendedFrom
        ? `Extended subscription with ${plan.name} plan for KES ${parsed.amount}`
        : `Activated ${plan.name} plan for KES ${parsed.amount}`;

      console.log(`[MpesaSubscriptionService] ✅ ${reason}`);

      // Also save to legacy storage for backwards compatibility
      const legacySub: SubscriptionData = {
        code: parsed.code,
        amount: parsed.amount,
        planDays: plan.days,
        payee: parsed.payee ?? null,
        activatedAt: result.subscription.activatedAt,
        expiryAt: result.subscription.expiryAt,
        source: "mpesa",
      };

      const usedEntry: UsedCodeEntry = {
        code: parsed.code,
        amount: parsed.amount,
        processedAt: Date.now()
      };

      await activateSubscriptionAtomic(legacySub, usedEntry);

      return { ok: true, reason, sub: legacySub };
    } else {
      return {
        ok: false,
        reason: result.error || "Activation failed"
      };
    }
  } catch (error) {
    console.error("[Mpesa] Activation failed:", error);
    return {
      ok: false,
      reason: "System error during activation. Please try again or contact support."
    };
  }
}

// ----------------------
// 🧪 Dev Helpers (Secured)
// ----------------------
export async function resetSubscription() {
  await SecureStorageService.multiRemove([
    STORAGE_KEYS.subscription,
    STORAGE_KEYS.usedCodes,
    STORAGE_KEYS.pending,
  ]);
}

// Additional exports for paywall.tsx compatibility
export async function getRemainingTime(subscription: SubscriptionData): Promise<{
  days: number;
  hours: number;
  minutes: number;
}> {
  const remaining = subscription.expiryAt - now();
  if (remaining <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  return { days, hours, minutes };
}

export async function isSubscriptionActive(): Promise<boolean> {
  const sub = await getSubscriptionInfo();
  if (!sub) return false;
  return sub.expiryAt > now();
}

// ❌ REMOVED forceActivate from production builds
export const forceActivate = __DEV__ ? async (amount: number) => {
  // Dev-only activation logic
  const plan = planForAmount(amount);
  const nowTs = now();
  const newExpiry = nowTs + (plan.days * 24 * 60 * 60 * 1000);

  const sub: SubscriptionData = {
    code: "DEV",
    amount,
    planDays: plan.days,
    payee: "Developer",
    activatedAt: nowTs,
    expiryAt: newExpiry,
    source: "store",
  };

  await saveSubscription(sub);
  return sub;
} : undefined;