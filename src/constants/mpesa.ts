// -----------------------------------------------------
// src/constants/mpesa.ts — Lipana Payment Links
// -----------------------------------------------------

// @ts-ignore - Module created by babel plugin
import { LIPANA_API_KEY, LIPANA_PUBLIC_KEY } from '@env';

/**
 * Lipana API Configuration (for SDK usage)
 */
export const LIPANA_API = {
  BASE_URL: 'https://api.lipana.dev/v1',
  PUBLIC_KEY: LIPANA_PUBLIC_KEY || 'your_lipana_public_key_here',
  SECRET_KEY: LIPANA_API_KEY || 'your_lipana_secret_key_here',
};

/**
 * Lipana Payment Links for each subscription plan
 * 
 * Plans:
 * - Daily (KES 200): https://lipana.dev/pay/daily
 * - Weekly (KES 700): https://lipana.dev/pay/weekly
 * - Monthly Normal (KES 2000): https://lipana.dev/pay/monthly-normal
 * - Monthly Premium (KES 1000): https://lipana.dev/pay/monthly-subscription-95c7-1
 */

export const LIPANA_LINKS = {
  DAILY: 'https://lipana.dev/pay/daily',
  WEEKLY: 'https://lipana.dev/pay/weekly',
  MONTHLY_NORMAL: 'https://lipana.dev/pay/monthly-normal',
  MONTHLY_PREMIUM: 'https://lipana.dev/pay/monthly-subscription-95c7-1',
} as const;

export const LIPANA_PAYMENT_LINK = LIPANA_LINKS.MONTHLY_PREMIUM;

export interface SubscriptionTier {
  id: string;
  name: string;
  amount: number;
  days: number;
  description: string;
  link: string;
  recommended?: boolean;
  badge?: string;
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'daily',
    name: 'Daily',
    amount: 200,
    days: 1,
    description: '24 hours access',
    link: LIPANA_LINKS.DAILY,
  },
  {
    id: 'weekly',
    name: 'Weekly',
    amount: 700,
    days: 7,
    description: '7 days access',
    link: LIPANA_LINKS.WEEKLY,
    badge: 'Popular',
  },
  {
    id: 'monthly_premium',
    name: 'Monthly Premium',
    amount: 1000,
    days: 30,
    description: '30 days - Special Offer!',
    link: LIPANA_LINKS.MONTHLY_PREMIUM,
    recommended: true,
    badge: '🔥 Best Deal',
  },
  {
    id: 'monthly',
    name: 'Monthly',
    amount: 2000,
    days: 30,
    description: '30 days access',
    link: LIPANA_LINKS.MONTHLY_NORMAL,
  },
];

export interface MpesaPlan {
  id: string;
  days: number;
  amount: number;
  link: string;
  bestValue?: boolean;
}

export const MPESA_PLANS: MpesaPlan[] = SUBSCRIPTION_TIERS.map(tier => ({
  id: tier.id,
  days: tier.days,
  amount: tier.amount,
  link: tier.link,
  bestValue: tier.recommended,
}));

// Amount to plan ID mapping for payment detection
export const AMOUNT_TO_PLAN_ID: Record<number, string> = {
  200: 'daily',
  700: 'weekly',
  1000: 'monthly_premium',
  2000: 'monthly',
};

export function getPlanByAmount(amount: number): SubscriptionTier | undefined {
  const planId = AMOUNT_TO_PLAN_ID[amount];
  return SUBSCRIPTION_TIERS.find(t => t.id === planId);
}

export function getPlanLink(planId: string): string | undefined {
  const plan = SUBSCRIPTION_TIERS.find(t => t.id === planId);
  return plan?.link;
}
