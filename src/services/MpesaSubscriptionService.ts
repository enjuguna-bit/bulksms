import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Storage keys
const STORAGE_KEYS = {
  subscription: "subscription:data",
  usedCodes: "subscription:usedCodes",
  pending: "subscription:pending",
};

// Helper functions
const now = () => Date.now();

const PLANS = {
  1: { name: "daily", days: 1 },
  50: { name: "weekly", days: 7 },
  200: { name: "monthly", days: 30 },
  500: { name: "quarterly", days: 90 },
  1500: { name: "yearly", days: 365 },
};

function planForAmount(amount: number) {
  return PLANS[amount as keyof typeof PLANS] || { name: "unknown", days: 0 };
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
// 🔐 Security Config
// ----------------------
// In a real app, use a native JSI encryption key or a server-side secret.
// This is a basic obfuscation layer to prevent simple JSON editing.
const INTEGRITY_SALT = "s8#kL9@vM2!xP_doNotShareThis";

function generateHash(data: SubscriptionData): string {
  // Simple checksum of critical fields
  const raw = `${data.code}|${data.amount}|${data.expiryAt}|${INTEGRITY_SALT}`;
  let hash = 0, i, chr;
  for (i = 0; i < raw.length; i++) {
    chr = raw.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16); // Hex string
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
async function saveSubscription(sub: SubscriptionData) {
  // 1. Generate hash before saving
  sub._hash = generateHash(sub);
  await AsyncStorage.setItem(STORAGE_KEYS.subscription, JSON.stringify(sub));
}

export async function getSubscriptionInfo(): Promise<SubscriptionData | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.subscription);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SubscriptionData;
    
    // 2. Verify hash on read
    const computed = generateHash(data);
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
// 🚀 Activation Logic (Updated)
// ----------------------
export async function activateSubscriptionFromSms(body: string, arrivalTime?: number) {
  // Parse SMS body
  const parsed = parseSmsBody(body);
  if (!parsed) {
    return { ok: false, reason: "Invalid SMS format" };
  }

  const plan = planForAmount(parsed.amount);
  const nowTs = arrivalTime || now();
  const newExpiry = nowTs + (plan.days * 24 * 60 * 60 * 1000);
  const reason = `Activated ${plan.name} plan for KES ${parsed.amount}`;

  const sub: SubscriptionData = {
    code: parsed.code,
    amount: parsed.amount,
    planDays: plan.days,
    payee: parsed.payee ?? null,
    activatedAt: nowTs,
    expiryAt: newExpiry,
    source: "mpesa",
  };

  // Use secure save
  await saveSubscription(sub); 
  
  return { ok: true, reason, sub };
}

// ----------------------
// 🧪 Dev Helpers (Secured)
// ----------------------
export async function resetSubscription() {
  await AsyncStorage.multiRemove([
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