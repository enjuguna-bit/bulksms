/**
 * Subscription Types - Clean billing system with Lipana payments
 */

export type PlanId = 'daily' | 'weekly' | 'monthly' | 'monthly_premium' | 'monthly_special' | 'quarterly' | 'yearly' | 'trial';

export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'expiring' | 'expired';

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  amount: number; // KES
  days: number;
  description: string;
  features: string[];
  lipanaLink?: string; // Optional (trial/server plans might not need links)
  recommended?: boolean;
  bestValue?: boolean;
  badge?: string;
  discountPercent?: number;
}

export interface Subscription {
  planId: PlanId;
  activatedAt: number;
  expiryAt: number;
  transactionCode?: string;
  source: 'lipana' | 'mpesa' | 'manual' | 'store' | 'promo' | 'trial';
}

export interface SubscriptionState {
  status: SubscriptionStatus;
  subscription: Subscription | null;
  daysRemaining: number;
  hoursRemaining: number;
  expiryDate: Date | null;
}

export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
  trial: {
    id: 'trial',
    name: 'Free Trial',
    days: 2,
    amount: 0,
    description: '2 days free access',
    features: ['Full app access', 'Limited to 2 days'],
  },
  daily: {
    id: 'daily',
    name: 'Daily',
    amount: 200,
    days: 1,
    description: '24 hours access',
    features: ['Full app access', 'Unlimited SMS', 'All features'],
    lipanaLink: 'https://lipana.dev/pay/daily',
  },
  weekly: {
    id: 'weekly',
    name: 'Weekly',
    amount: 900,
    days: 7,
    description: '7 days access',
    features: ['Full app access', 'Unlimited SMS', 'All features', 'Save 35%'],
    lipanaLink: 'https://lipana.dev/pay/weekly',
    badge: 'Popular',
    discountPercent: 35,
  },
  monthly_special: {
    id: 'monthly_special',
    name: 'Monthly Special',
    days: 30,
    amount: 1000,
    description: '30 days - Special Offer!',
    features: ['Full app access', 'Unlimited SMS', 'Limited time offer', 'Save 83%'],
    recommended: true,
    bestValue: true,
    discountPercent: 83,
    lipanaLink: 'https://lipana.dev/pay/monthly-special-1000',
    badge: '🔥 Best Deal',
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    amount: 3900,
    days: 30,
    description: '30 days access',
    features: ['Full app access', 'Unlimited SMS', 'All features', 'Priority support'],
    lipanaLink: 'https://lipana.dev/pay/monthly-subscription-95c7-1',
    discountPercent: 35,
  },
  monthly_premium: {
    // Keeping for backward compat, mapped to 3900 pricing now or alias
    id: 'monthly_premium',
    name: 'Monthly Premium',
    amount: 3900,
    days: 30,
    description: '30 days access',
    features: ['Full app access', 'Unlimited SMS', 'All features', 'Priority support'],
    lipanaLink: 'https://lipana.dev/pay/monthly-subscription-95c7-1',
  },
  quarterly: {
    id: 'quarterly',
    name: 'Quarterly',
    days: 90,
    amount: 9900,
    description: '90 days access',
    features: ['Full app access', 'Unlimited SMS', 'Priority support', 'Save 45%'],
    discountPercent: 45,
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly',
    days: 365,
    amount: 29900,
    description: '365 days access',
    features: ['Full app access', 'Unlimited SMS', 'Priority support', 'Best value', 'Save 59%'],
    bestValue: true,
    discountPercent: 59,
  },
};

// Amount to plan mapping for SMS payment detection
export const AMOUNT_TO_PLAN: Record<number, PlanId> = {
  // Current production pricing (from SubscriptionPlans.ts)
  200: 'daily',
  900: 'weekly',
  1000: 'monthly_special',
  3900: 'monthly',
  9900: 'quarterly',
  29900: 'yearly',
  // Legacy / aliases
  // 700? 2000? -> keeping old ones commented or mapped if we suspect usage
  700: 'weekly', // Alias legacy price to new weekly logic if acceptable or ignore
  2000: 'monthly', // Alias legacy
};

/**
 * Get plan by amount paid - supports overpayment tolerance
 */
export function getPlanByAmount(amount: number): SubscriptionPlan | null {
  const exactPlanId = AMOUNT_TO_PLAN[amount];
  if (exactPlanId) return SUBSCRIPTION_PLANS[exactPlanId];

  // Logic duplicated from SubscriptionPlans.ts for now to keep this file standalone as compat layer
  const planAmounts = Object.keys(AMOUNT_TO_PLAN)
    .map(Number)
    .sort((a, b) => b - a);

  for (const planAmount of planAmounts) {
    if (amount >= planAmount) {
      const planId = AMOUNT_TO_PLAN[planAmount];
      if (planId) {
        return SUBSCRIPTION_PLANS[planId];
      }
    }
  }

  return null;
}

export function getPlanById(id: PlanId): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[id];
}

export function getAllPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS);
}

export function getDisplayPlans(): SubscriptionPlan[] {
  return [
    SUBSCRIPTION_PLANS.daily,
    SUBSCRIPTION_PLANS.weekly,
    SUBSCRIPTION_PLANS.monthly_special,
    SUBSCRIPTION_PLANS.monthly,
  ];
}
