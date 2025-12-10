// -------------------------------------------------------------------
// 📦 MockBillingAdapter.ts — Local Billing Simulation
// -------------------------------------------------------------------
// ✅ Simulates purchases with AsyncStorage
// ✅ Handles trial lifecycle (start / end)
// ✅ Auto-expires after plan duration
// ✅ Includes reset() helper for testing
// ✅ Mirrors BillingAdapter interface exactly
// -------------------------------------------------------------------

import AsyncStorage from "@react-native-async-storage/async-storage";
import { BillingAdapter, Entitlement, Plan } from "./types";
import { STORAGE_KEYS } from "@/constants/storage";
import { CONFIG } from "@/constants/config";

const K = {
  isPro: STORAGE_KEYS.BILLING_IS_PRO,
  status: STORAGE_KEYS.BILLING_STATUS,
  trialStartedAt: STORAGE_KEYS.BILLING_TRIAL_START,
  trialEndsAt: STORAGE_KEYS.BILLING_TRIAL_END,
  expiryAt: STORAGE_KEYS.BILLING_EXPIRY,
  prices: STORAGE_KEYS.BILLING_PRICES,
};

function now() {
  return Date.now();
}

// Helper: Add N months to a timestamp
function addMonthsToTimestamp(ts: number, months: number): number {
  const d = new Date(ts);
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

// Default price list
const DEFAULT_PRICES = CONFIG.BILLING_DEFAULT_PRICES;

export class MockBillingAdapter implements BillingAdapter {
  async init(): Promise<void> {
    const prices = await AsyncStorage.getItem(K.prices);
    if (!prices) {
      await AsyncStorage.setItem(K.prices, JSON.stringify(DEFAULT_PRICES));
    }

    // Initialize trial on first run if not present
    const status = await AsyncStorage.getItem(K.status);
    if (!status) {
      const trialStart = now();
      const trialEnd2Days = trialStart + 2 * 24 * 3600 * 1000; // 2-day trial
      await AsyncStorage.multiSet([
        [K.isPro, "0"],
        [K.status, "trial"],
        [K.trialStartedAt, String(trialStart)],
        [K.trialEndsAt, String(trialEnd2Days)],
      ]);
    }
  }

  async getLocalizedPrices() {
    const v = await AsyncStorage.getItem(K.prices);
    return v ? JSON.parse(v) : DEFAULT_PRICES;
  }

  async getEntitlement(): Promise<Entitlement | null> {
    const [isPro, status, trialEndsAt, expiryAt] = await Promise.all([
      AsyncStorage.getItem(K.isPro),
      AsyncStorage.getItem(K.status),
      AsyncStorage.getItem(K.trialEndsAt),
      AsyncStorage.getItem(K.expiryAt),
    ]);

    if (!status) return null;

    return {
      isPro: isPro === "1",
      status: status as Entitlement["status"],
      trialEndsAt: trialEndsAt ? parseInt(trialEndsAt) : undefined,
      expiryAt: expiryAt ? parseInt(expiryAt) : undefined,
    };
  }

  async purchase(plan: Plan): Promise<Entitlement> {
    const months = plan === "monthly" ? 1 : plan === "quarterly" ? 3 : 12;
    const expiry = addMonthsToTimestamp(now(), months);

    const ent: Entitlement = {
      isPro: true,
      status: "active",
      expiryAt: expiry,
    };

    await AsyncStorage.multiSet([
      [K.isPro, "1"],
      [K.status, "active"],
      [K.expiryAt, String(expiry)],
    ]);

    return ent;
  }

  async restore(): Promise<Entitlement | null> {
    return this.getEntitlement();
  }

  async refresh(): Promise<Entitlement | null> {
    await new Promise((r) => setTimeout(r, 300));
    const ent = await this.getEntitlement();

    if (!ent) return null;

    // Trial expired check
    if (ent.status === "trial" && ent.trialEndsAt && ent.trialEndsAt < now()) {
      await AsyncStorage.multiSet([
        [K.isPro, "0"],
        [K.status, "expired"],
      ]);
      return { ...ent, isPro: false, status: "expired" };
    }

    // Subscription expired check
    if (ent.status === "active" && ent.expiryAt && ent.expiryAt < now()) {
      await AsyncStorage.multiSet([
        [K.isPro, "0"],
        [K.status, "expired"],
      ]);
      return { ...ent, isPro: false, status: "expired" };
    }

    return ent;
  }

  // 🧼 Developer helper to reset everything
  static async reset(): Promise<void> {
    await AsyncStorage.multiRemove([
      K.isPro,
      K.status,
      K.trialStartedAt,
      K.trialEndsAt,
      K.expiryAt,
      K.prices,
    ]);
  }
}
