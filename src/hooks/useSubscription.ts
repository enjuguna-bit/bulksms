/**
 * useSubscription.ts - React hook for subscription state management
 * 
 * Provides easy access to subscription state, renewal reminders,
 * and subscription-related actions in React components.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { 
  subscriptionManager, 
  type SubscriptionState, 
  type Subscription,
  type SubscriptionAnalytics 
} from '@/services/billing/SubscriptionManager';
import { SUBSCRIPTION_PLANS, type PlanId } from '@/services/billing/SubscriptionPlans';

export interface UseSubscriptionReturn {
  // State
  state: SubscriptionState;
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  
  // Computed values
  isActive: boolean;
  isExpiring: boolean;
  isInGrace: boolean;
  isExpired: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  expiryDate: Date | null;
  currentPlan: typeof SUBSCRIPTION_PLANS[PlanId] | null;
  
  // Display helpers
  statusText: string;
  statusColor: string;
  remainingTimeText: string;
  
  // Actions
  refresh: () => Promise<void>;
  activate: (amount: number, transactionCode: string, source?: 'mpesa' | 'lipana' | 'store') => Promise<{ success: boolean; error?: string }>;
  applyPromoCode: (code: string, planId: PlanId) => Promise<{ valid: boolean; bonusDays?: number; error?: string }>;
  
  // Analytics
  analytics: SubscriptionAnalytics | null;
}

const DEFAULT_STATE: SubscriptionState = {
  status: 'none',
  subscription: null,
  daysRemaining: 0,
  hoursRemaining: 0,
  isInGracePeriod: false,
  graceDaysRemaining: 0,
  renewalReminder: false,
};

export function useSubscription(): UseSubscriptionReturn {
  const [state, setState] = useState<SubscriptionState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);

  // Load subscription state
  const loadState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const subscriptionState = await subscriptionManager.getSubscriptionState();
      setState(subscriptionState);
      
      // Also load analytics
      const analyticsData = await subscriptionManager.getAnalytics();
      setAnalytics(analyticsData);
    } catch (err: any) {
      console.error('[useSubscription] Failed to load state:', err);
      setError(err.message || 'Failed to load subscription');
      setState(DEFAULT_STATE);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh subscription state
  const refresh = useCallback(async () => {
    await loadState();
  }, [loadState]);

  // Activate subscription
  const activate = useCallback(async (
    amount: number, 
    transactionCode: string, 
    source: 'mpesa' | 'lipana' | 'store' = 'mpesa'
  ) => {
    try {
      setLoading(true);
      const result = await subscriptionManager.activateFromPayment(
        amount, 
        transactionCode, 
        source
      );
      
      if (result.success) {
        await loadState(); // Refresh state after activation
      }
      
      return { success: result.success, error: result.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [loadState]);

  // Apply promo code
  const applyPromoCode = useCallback(async (code: string, planId: PlanId) => {
    return subscriptionManager.validateAndApplyPromo(code, planId);
  }, []);

  // Initial load
  useEffect(() => {
    loadState();
  }, [loadState]);

  // Refresh on app foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        loadState();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [loadState]);

  // Periodic refresh for active subscriptions (every minute)
  useEffect(() => {
    if (state.status === 'active' || state.status === 'expiring' || state.status === 'grace') {
      const interval = setInterval(loadState, 60000);
      return () => clearInterval(interval);
    }
  }, [state.status, loadState]);

  // Computed values
  const isActive = state.status === 'active' || state.status === 'expiring';
  const isExpiring = state.status === 'expiring';
  const isInGrace = state.status === 'grace';
  const isExpired = state.status === 'expired';

  const expiryDate = useMemo(() => {
    if (!state.subscription) return null;
    return new Date(state.subscription.expiryAt);
  }, [state.subscription]);

  const currentPlan = useMemo(() => {
    if (!state.subscription) return null;
    return SUBSCRIPTION_PLANS[state.subscription.planId];
  }, [state.subscription]);

  // Status text for UI display
  const statusText = useMemo(() => {
    switch (state.status) {
      case 'active':
        return 'Active';
      case 'expiring':
        return `Expiring in ${state.daysRemaining} days`;
      case 'grace':
        return `Grace Period (${state.graceDaysRemaining} days left)`;
      case 'expired':
        return 'Expired';
      case 'none':
        return 'No Subscription';
      default:
        return 'Unknown';
    }
  }, [state]);

  // Status color for UI
  const statusColor = useMemo(() => {
    switch (state.status) {
      case 'active':
        return '#22c55e'; // Green
      case 'expiring':
        return '#f59e0b'; // Amber
      case 'grace':
        return '#ef4444'; // Red
      case 'expired':
        return '#6b7280'; // Gray
      case 'none':
        return '#9ca3af'; // Light gray
      default:
        return '#6b7280';
    }
  }, [state.status]);

  // Remaining time text
  const remainingTimeText = useMemo(() => {
    if (state.status === 'none' || state.status === 'expired') {
      return 'No active subscription';
    }

    if (state.status === 'grace') {
      return `Grace period: ${state.graceDaysRemaining} day${state.graceDaysRemaining !== 1 ? 's' : ''} left`;
    }

    if (state.daysRemaining > 0) {
      return `${state.daysRemaining} day${state.daysRemaining !== 1 ? 's' : ''}, ${state.hoursRemaining} hr${state.hoursRemaining !== 1 ? 's' : ''} left`;
    }

    return `${state.hoursRemaining} hour${state.hoursRemaining !== 1 ? 's' : ''} left`;
  }, [state]);

  return {
    // State
    state,
    subscription: state.subscription,
    loading,
    error,
    
    // Computed values
    isActive,
    isExpiring,
    isInGrace,
    isExpired,
    daysRemaining: state.daysRemaining,
    hoursRemaining: state.hoursRemaining,
    expiryDate,
    currentPlan,
    
    // Display helpers
    statusText,
    statusColor,
    remainingTimeText,
    
    // Actions
    refresh,
    activate,
    applyPromoCode,
    
    // Analytics
    analytics,
  };
}

export default useSubscription;
