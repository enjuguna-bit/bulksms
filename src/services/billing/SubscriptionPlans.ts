/**
 * SubscriptionPlans.ts - Unified subscription plan definitions
 * 
 * Single source of truth for all subscription plans, pricing,
 * and plan-related utilities used across the billing system.
 */

export type PlanId = 'daily' | 'weekly' | 'monthly' | 'monthly_special' | 'quarterly' | 'yearly' | 'trial';

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  days: number;
  amount: number;           // KES
  description: string;
  features: string[];
  recommended?: boolean;
  bestValue?: boolean;
  discountPercent?: number; // For promo display
  lipanaLink?: string;
}

/**
 * Master plan definitions - single source of truth
 */
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
    days: 1,
    amount: 200,
    description: '24 hours access',
    features: ['Full app access', 'Unlimited SMS'],
  },
  weekly: {
    id: 'weekly',
    name: 'Weekly',
    days: 7,
    amount: 900,
    description: '7 days access',
    features: ['Full app access', 'Unlimited SMS', 'Save 35%'],
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
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    days: 30,
    amount: 3900,
    description: '30 days access',
    features: ['Full app access', 'Unlimited SMS', 'Priority support', 'Save 35%'],
    discountPercent: 35,
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

/**
 * Amount to plan mapping - used for SMS parsing
 * Maps payment amounts to their corresponding plans
 */
export const AMOUNT_TO_PLAN: Record<number, PlanId> = {
  // Current production pricing
  200: 'daily',
  900: 'weekly',
  1000: 'monthly_special',  // 30-day special offer at KES 1000
  3900: 'monthly',
  9900: 'quarterly',
  29900: 'yearly',
  // Legacy pricing (backwards compatibility)
  1: 'daily',
  50: 'weekly',
  500: 'quarterly',
  1500: 'yearly',
};

/**
 * Get plan by amount paid
 * Supports both overpayment and underpayment tolerance (up to 5% under)
 * 
 * Examples:
 * - Pay 200 → daily plan (exact match)
 * - Pay 209 → daily plan (overpaid by 9)
 * - Pay 950 → weekly plan (overpaid by 50)
 * - Pay 980 → monthly_special plan (underpaid by 20, within 5% tolerance)
 * - Pay 950 → monthly_special plan (underpaid by 50, within 5% tolerance)
 * - Pay 900 → weekly plan (underpaid by 100, outside tolerance for monthly_special)
 * - Pay 150 → null (underpaid for any plan)
 */
export function getPlanByAmount(amount: number): SubscriptionPlan | null {
  // First check for exact match
  const exactPlanId = AMOUNT_TO_PLAN[amount];
  if (exactPlanId) return SUBSCRIPTION_PLANS[exactPlanId];

  // Define tolerance (5% underpayment allowed)
  const UNDERPAYMENT_TOLERANCE = 0.05; // 5%

  // Get all valid plan amounts (excluding legacy pricing below 200)
  const planAmounts = Object.keys(AMOUNT_TO_PLAN)
    .map(Number)
    .filter(a => a >= 200) // Only production pricing
    .sort((a, b) => b - a); // Sort descending to find highest match first

  // First try to find exact or overpayment match (existing behavior)
  for (const planAmount of planAmounts) {
    if (amount >= planAmount) {
      const planId = AMOUNT_TO_PLAN[planAmount];
      if (planId) {
        console.log(`[SubscriptionPlans] Amount ${amount} matched to ${planId} plan (requires ${planAmount})`);
        return SUBSCRIPTION_PLANS[planId];
      }
    }
  }

  // If no overpayment match found, check for underpayment within tolerance
  for (const planAmount of planAmounts) {
    const minAmount = planAmount * (1 - UNDERPAYMENT_TOLERANCE);
    if (amount >= minAmount && amount < planAmount) {
      const planId = AMOUNT_TO_PLAN[planAmount];
      if (planId) {
        console.log(`[SubscriptionPlans] Amount ${amount} matched to ${planId} plan (underpaid by ${planAmount - amount} KES, within ${UNDERPAYMENT_TOLERANCE * 100}% tolerance)`);
        return SUBSCRIPTION_PLANS[planId];
      }
    }
  }

  return null;
}

/**
 * Get plan by ID
 */
export function getPlanById(id: PlanId): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[id];
}

/**
 * Calculate subscription duration in milliseconds
 */
export function getPlanDurationMs(planId: PlanId): number {
  const plan = SUBSCRIPTION_PLANS[planId];
  return plan.days * 24 * 60 * 60 * 1000;
}

/**
 * Get all purchasable plans (excluding trial)
 */
export function getPurchasablePlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS).filter(p => p.id !== 'trial');
}

/**
 * Get recommended plan
 */
export function getRecommendedPlan(): SubscriptionPlan {
  return Object.values(SUBSCRIPTION_PLANS).find(p => p.recommended) || SUBSCRIPTION_PLANS.monthly;
}

/**
 * Calculate daily cost for comparison
 */
export function getDailyCost(planId: PlanId): number {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (plan.days === 0) return 0;
  return Math.round(plan.amount / plan.days);
}

/**
 * Get savings compared to daily plan
 */
export function getSavingsPercent(planId: PlanId): number {
  if (planId === 'daily' || planId === 'trial') return 0;
  
  const plan = SUBSCRIPTION_PLANS[planId];
  const dailyPlan = SUBSCRIPTION_PLANS.daily;
  
  const fullPrice = dailyPlan.amount * plan.days;
  const savings = ((fullPrice - plan.amount) / fullPrice) * 100;
  
  return Math.round(savings);
}

export default SUBSCRIPTION_PLANS;
