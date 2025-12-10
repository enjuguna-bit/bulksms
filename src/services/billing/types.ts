// -------------------------------------------------------------------
// 🧾 types.ts — Upgraded Billing Types
// -------------------------------------------------------------------
// ✅ Stronger type safety
// ✅ Trial support
// ✅ Fallback-safe Entitlement shape
// ✅ Product metadata ready for store adapters
// ✅ Works for both MockBillingAdapter and StoreBillingAdapter
// -------------------------------------------------------------------

/**
 * Possible subscription states.
 * - `none`: no trial or active subscription
 * - `trial`: trial is active
 * - `active`: paid subscription is active
 * - `expired`: trial or subscription expired
 */
export type BillingStatus = "none" | "trial" | "active" | "expired";

/**
 * Available plans in the app.
 */
export type Plan = "monthly" | "quarterly" | "yearly";

/**
 * Mapping of plans to price strings.
 * Used by UI to display localized store prices.
 */
export type PlanPrices = Record<Plan, string>;

/**
 * Entitlement represents the current billing state of the user.
 * It is the unified shape returned by any BillingAdapter.
 */
export interface Entitlement {
  /** Whether the user has an active Pro entitlement. */
  isPro: boolean;

  /** Current billing status. */
  status: BillingStatus;

  /** When trial started (if applicable). */
  trialStartedAt?: number;

  /** When trial ends (if applicable). */
  trialEndsAt?: number;

  /** When subscription expires (if applicable). */
  expiryAt?: number;

  /** Product identifier for the active subscription (if applicable). */
  productId?: string;

  /** Plan for the active subscription (if applicable). */
  plan?: Plan;
}

/**
 * BillingAdapter interface is implemented by both:
 * - MockBillingAdapter (offline simulation)
 * - StoreBillingAdapter (RevenueCat or other real IAP SDK)
 */
export interface BillingAdapter {
  /** Initialize the billing SDK or simulation. */
  init(): Promise<void>;

  /** Get the current entitlement (trial, subscription, none, expired). */
  getEntitlement(): Promise<Entitlement | null>;

  /** Trigger purchase for a given plan. */
  purchase(plan: Plan): Promise<Entitlement>;

  /** Restore purchases (for example, reinstall scenario). */
  restore(): Promise<Entitlement | null>;

  /** Refresh subscription state (e.g. pull from server). */
  refresh(): Promise<Entitlement | null>;

  /** Get localized price labels for all plans. */
  getLocalizedPrices(): Promise<PlanPrices>;
}

import { CONFIG } from "@/constants/config";

/**
 * Product IDs for your store (Play Store / App Store).
 * These should match your in-app purchase configuration.
 */
export const PRODUCT_IDS: Record<Plan, string> = CONFIG.BILLING_PRODUCT_IDS;

/**
 * Helper: Check if trial is currently active.
 */
export function isTrialActive(ent: Entitlement | null): boolean {
  return (
    !!ent &&
    ent.status === "trial" &&
    typeof ent.trialEndsAt === "number" &&
    ent.trialEndsAt > Date.now()
  );
}

/**
 * Helper: Check if subscription is active (paid or trial).
 */
export function isSubscriptionActive(ent: Entitlement | null): boolean {
  return (
    !!ent &&
    (ent.status === "active" ||
      (ent.status === "trial" && isTrialActive(ent)))
  );
}

/**
 * Helper: Check if entitlement is expired.
 */
export function isEntitlementExpired(ent: Entitlement | null): boolean {
  if (!ent) return true;
  if (ent.status === "none") return true;
  if (ent.status === "expired") return true;
  if (ent.expiryAt && ent.expiryAt < Date.now()) return true;
  if (ent.trialEndsAt && ent.trialEndsAt < Date.now()) return true;
  return false;
}
