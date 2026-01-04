/**
 * useSubscriptionState - React hook for subscription management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SubscriptionService } from '@/services/subscription';
import { getBypassStatus, type BypassStatus } from '@/services/devBypass';
import type {
  SubscriptionState,
  SubscriptionPlan,
  PlanId
} from '@/services/subscription';

export interface UseSubscriptionStateReturn {
  // State
  state: SubscriptionState;
  loading: boolean;
  error: string | null;

  // Computed
  isActive: boolean;
  isTrial: boolean;
  isExpiring: boolean;
  isExpired: boolean;
  hasAccess: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  expiryDate: Date | null;
  isGracePeriod: boolean;
  graceDaysRemaining: number;
  urgencyLevel: 'critical' | 'warning' | 'normal';
  bypassInfo: BypassStatus | null;

  // Display helpers
  statusText: string;
  statusColor: string;
  remainingText: string;

  // Actions
  refresh: () => Promise<void>;
  startTrial: () => Promise<void>;
  openPayment: (planId: PlanId) => Promise<boolean>;
  activateFromPayment: (
    amount: number,
    transactionCode: string,
    source?: 'lipana' | 'mpesa' | 'manual'
  ) => Promise<{ success: boolean; error?: string }>;
}

const DEFAULT_STATE: SubscriptionState = {
  status: 'none',
  subscription: null,
  daysRemaining: 0,
  hoursRemaining: 0,
  expiryDate: null,
};

export function useSubscriptionState(): UseSubscriptionStateReturn {
  const [state, setState] = useState<SubscriptionState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bypassInfo, setBypassInfo] = useState<BypassStatus | null>(null);

  const loadState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [newState, bypass] = await Promise.all([
        SubscriptionService.getState(),
        getBypassStatus()
      ]);
      setState(newState);
      setBypassInfo(bypass);
    } catch (err: any) {
      console.error('[useSubscriptionState] Load failed:', err);
      setError(err.message || 'Failed to load subscription');
      setState(DEFAULT_STATE);
      setBypassInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadState();
  }, [loadState]);

  const startTrial = useCallback(async () => {
    try {
      setLoading(true);
      await SubscriptionService.startTrial();
      await loadState();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadState]);

  const openPayment = useCallback(async (planId: PlanId) => {
    return SubscriptionService.openPaymentLink(planId);
  }, []);

  const activateFromPayment = useCallback(async (
    amount: number,
    transactionCode: string,
    source: 'lipana' | 'mpesa' | 'manual' = 'lipana'
  ) => {
    try {
      setLoading(true);
      const result = await SubscriptionService.activateFromPayment(
        amount,
        transactionCode,
        source
      );
      if (result.success) {
        await loadState();
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, [loadState]);

  // Initial load
  useEffect(() => {
    loadState();
  }, [loadState]);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = SubscriptionService.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  // Refresh on app foreground
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        loadState();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [loadState]);

  // Periodic refresh for active subscriptions
  useEffect(() => {
    if (['active', 'expiring', 'trial'].includes(state.status)) {
      const interval = setInterval(loadState, 60000);
      return () => clearInterval(interval);
    }
  }, [state.status, loadState]);

  // Computed values
  const isActive = state.status === 'active';
  const isTrial = state.status === 'trial';
  const isExpiring = state.status === 'expiring';
  const isExpired = state.status === 'expired';
  const hasAccess = ['active', 'expiring', 'trial'].includes(state.status);

  const statusText = useMemo(() => {
    switch (state.status) {
      case 'active':
        return 'Active';
      case 'trial':
        return `Trial (${state.daysRemaining}d left)`;
      case 'expiring':
        return `Expiring Soon`;
      case 'expired':
        return 'Expired';
      case 'none':
        return 'No Subscription';
      default:
        return 'Unknown';
    }
  }, [state]);

  const statusColor = useMemo(() => {
    switch (state.status) {
      case 'active':
        return '#22c55e';
      case 'trial':
        return '#3b82f6';
      case 'expiring':
        return '#f59e0b';
      case 'expired':
        return '#ef4444';
      case 'none':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  }, [state.status]);

  // Grace period detection
  const isGracePeriod = useMemo(() => {
    return state.status === 'none' && (state as any).isInGracePeriod === true;
  }, [state]);

  const graceDaysRemaining = useMemo(() => {
    return (state as any).graceDaysRemaining || 0;
  }, [state]);

  // Urgency level calculation
  const urgencyLevel = useMemo((): 'critical' | 'warning' | 'normal' => {
    if (state.status === 'expired' || isGracePeriod) return 'critical';
    if (state.daysRemaining === 0 && state.hoursRemaining < 24) return 'critical';
    if (state.daysRemaining < 3) return 'warning';
    return 'normal';
  }, [state, isGracePeriod]);

  const remainingText = useMemo(() => {
    // Developer/Admin bypass
    if (bypassInfo?.active) {
      const sourceLabel = bypassInfo.source === 'force_flag' ? 'Force Flag' :
        bypassInfo.source === 'dev_override' ? 'Dev Override' :
          'Admin Unlock';
      return `Bypass Active (${sourceLabel})`;
    }

    // No subscription
    if (state.status === 'none') return 'No subscription';

    // Grace period
    if (isGracePeriod) {
      return `Grace period: ${graceDaysRemaining}d remaining`;
    }

    // Expired
    if (state.status === 'expired') return 'Subscription expired';

    // Trial vs Subscription label
    const prefix = isTrial ? 'Trial ends in' : 'Subscription ends in';

    if (state.daysRemaining > 0) {
      return `${prefix} ${state.daysRemaining}d ${state.hoursRemaining}h`;
    }
    return `${prefix} ${state.hoursRemaining}h`;
  }, [state, isTrial, isGracePeriod, graceDaysRemaining, bypassInfo]);

  return {
    state,
    loading,
    error,
    isActive,
    isTrial,
    isExpiring,
    isExpired,
    hasAccess,
    daysRemaining: state.daysRemaining,
    hoursRemaining: state.hoursRemaining,
    expiryDate: state.expiryDate,
    isGracePeriod,
    graceDaysRemaining,
    urgencyLevel,
    bypassInfo,
    statusText,
    statusColor,
    remainingText,
    refresh,
    startTrial,
    openPayment,
    activateFromPayment,
  };
}

export default useSubscriptionState;
