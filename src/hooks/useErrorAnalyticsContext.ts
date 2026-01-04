/**
 * Error Analytics Context Hook
 * Updates error analytics with current user subscription state
 */

import { useEffect } from 'react';
import { useBilling } from '@/providers/BillingProvider';
import { errorAnalytics } from '@/services/errorAnalytics';

/**
 * Hook to sync subscription state with error analytics
 * Should be called within BillingProvider context
 */
export function useErrorAnalyticsContext() {
  const billing = useBilling();

  useEffect(() => {
    // Update error analytics with subscription context
    const userId = `user_${Date.now()}`; // In production, use actual user ID
    const subscriptionStatus = billing.status;

    errorAnalytics.setUserContext(userId, subscriptionStatus);

    console.log('[ErrorAnalytics] Updated context:', {
      userId,
      subscriptionStatus,
    });
  }, [billing.status]);
}

/**
 * Standalone function to update error analytics context
 * Use when outside of BillingProvider
 */
export function updateErrorAnalyticsContext(
  userId?: string,
  subscriptionStatus?: string
) {
  errorAnalytics.setUserContext(
    userId || 'anonymous',
    subscriptionStatus || 'none'
  );
}
