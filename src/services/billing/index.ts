/**
 * Billing Services Index
 * 
 * Centralized exports for all billing-related services
 */

// Types
export * from './types';

// Subscription Plans
export * from './SubscriptionPlans';

// Subscription Manager
export { 
  subscriptionManager,
  type Subscription,
  type SubscriptionState,
  type SubscriptionStatus,
  type SubscriptionHistory,
  type SubscriptionAnalytics,
  type PromoCode,
} from './SubscriptionManager';

// Adapters
export { MockBillingAdapter } from './MockBillingAdapter';
export { StoreBillingAdapter } from './StoreBillingAdapter';
