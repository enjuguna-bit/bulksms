// -------------------------------------------------------------
// 💳 Billing Types - Payment Plans and Subscription Models
// -------------------------------------------------------------

export interface PaymentPlan {
  id: string;
  name: string;
  amount: string;
  amountValue: number; // Numeric value for calculations
  status: 'Active' | 'Inactive';
  payments: number;
  collected: string;
  collectedValue: number;
  link: string;
  description: string;
  duration: 'daily' | 'weekly' | 'monthly' | 'yearly';
  popular?: boolean;
}

export interface BillingStats {
  totalPlans: number;
  activePlans: number;
  totalCollected: number;
  formattedCollected: string;
}

// Default payment plans matching Lipana configuration
export const DEFAULT_PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: '1',
    name: 'Monthly Normal',
    amount: 'Ksh 3,900',
    amountValue: 3900,
    status: 'Active',
    payments: 0,
    collected: 'Ksh 0',
    collectedValue: 0,
    link: 'https://lipana.dev/pay/monthly-normal',
    description: 'Standard monthly subscription',
    duration: 'monthly',
  },
  {
    id: '2',
    name: 'Weekly',
    amount: 'Ksh 900',
    amountValue: 900,
    status: 'Active',
    payments: 0,
    collected: 'Ksh 0',
    collectedValue: 0,
    link: 'https://lipana.dev/pay/weekly',
    description: 'Weekly subscription plan',
    duration: 'weekly',
  },
  {
    id: '3',
    name: 'Daily',
    amount: 'Ksh 200',
    amountValue: 200,
    status: 'Active',
    payments: 0,
    collected: 'Ksh 0',
    collectedValue: 0,
    link: 'https://lipana.dev/pay/daily',
    description: 'Daily access plan',
    duration: 'daily',
  },
  {
    id: '4',
    name: 'Monthly Subscription',
    amount: 'Ksh 1,000+',
    amountValue: 1000,
    status: 'Active',
    payments: 1,
    collected: 'Ksh 1,000',
    collectedValue: 1000,
    link: 'https://lipana.dev/pay/monthly-subscription-95c7-1',
    description: 'Premium monthly subscription',
    duration: 'monthly',
    popular: true,
  },
];

// Calculate billing stats from plans
export function calculateBillingStats(plans: PaymentPlan[]): BillingStats {
  const activePlans = plans.filter(p => p.status === 'Active').length;
  const totalCollected = plans.reduce((sum, p) => sum + p.collectedValue, 0);
  
  return {
    totalPlans: plans.length,
    activePlans,
    totalCollected,
    formattedCollected: `Ksh ${totalCollected.toLocaleString()}`,
  };
}
