/**
 * SubscriptionService - Backward compatibility wrapper for SubscriptionManager
 * 
 * @deprecated Prefer using subscriptionManager or useBilling() directly.
 * This service now delegates all logic to SubscriptionManager to ensure a
 * Single Source of Truth (SSOT).
 */

import { Linking } from 'react-native';
// Import the SSOT manager
import { subscriptionManager, type Subscription as ManagerSub, type SubscriptionState as ManagerState } from '@/services/billing/SubscriptionManager';
import { offlineBillingManager } from '@/services/billing/OfflineBillingManager';
// Import deprecated storage ONLY for migration
import { SubscriptionStorage } from './storage';

import {
  type Subscription,
  type SubscriptionState,
  type SubscriptionStatus,
  type PlanId,
  type SubscriptionPlan,
  SUBSCRIPTION_PLANS,
  getPlanByAmount,
  getPlanById,
} from './types';

class SubscriptionServiceClass {
  private listeners: Set<(state: SubscriptionState) => void> = new Set();

  constructor() {
    this.migrateLegacyData();
  }

  /**
   * One-time migration of legacy Async storage to Secure Storage
   */
  private async migrateLegacyData() {
    try {
      const legacySub = await SubscriptionStorage.getSubscription();
      const currentSub = await subscriptionManager.getSubscription();

      if (legacySub && !currentSub && legacySub.expiryAt > Date.now()) {
        console.log('[SubscriptionService] Migrating legacy subscription to SubscriptionManager...');
        // Manually inject into SubscriptionManager via activate logic
        await subscriptionManager.activateFromPayment(
          getPlanById(legacySub.planId).amount,
          legacySub.transactionCode || 'LEGACY_MIGRATION',
          'store'
        );

        // Clear legacy to prevent double migration
        await SubscriptionStorage.clearSubscription();
      }
    } catch (e) {
      console.warn('[SubscriptionService] Migration check failed:', e);
    }
  }


  /**
   * Get current subscription state (Mapped from SubscriptionManager)
   */
  async getState(): Promise<SubscriptionState> {
    const managerState = await subscriptionManager.getSubscriptionState();

    // MAP ManagerState -> Legacy SubscriptionState

    // 1. Status Mapping
    let status: SubscriptionStatus;
    switch (managerState.status) {
      case 'active': status = 'active'; break;
      case 'expiring': status = 'expiring'; break;
      case 'grace': status = 'active'; break; // Legacy didn't have 'grace', treat as active
      case 'expired': status = 'expired'; break;
      case 'none': status = 'none'; break;
      default: status = 'none';
    }

    // 2. Subscription Object Mapping
    let subscription: Subscription | null = null;
    if (managerState.subscription) {
      subscription = {
        planId: managerState.subscription.planId,
        activatedAt: managerState.subscription.activatedAt,
        expiryAt: managerState.subscription.expiryAt,
        transactionCode: managerState.subscription.transactionCode,
        source: managerState.subscription.source as any,
      };
    }

    // 3. Trial Check (if manager says none, check offline billing for trial)
    if (status === 'none') {
      const billingState = await offlineBillingManager.getBillingState();
      if (billingState.status === 'trial') {
        const trialEnd = billingState.subscription?.expiryAt || 0;
        const remaining = trialEnd - Date.now();

        return {
          status: 'trial',
          subscription: null,
          daysRemaining: Math.max(0, Math.floor(remaining / (86400000))),
          hoursRemaining: Math.max(0, Math.floor((remaining % 86400000) / 3600000)),
          expiryDate: new Date(trialEnd),
        };
      }
    }

    return {
      status,
      subscription,
      daysRemaining: managerState.daysRemaining,
      hoursRemaining: managerState.hoursRemaining,
      expiryDate: managerState.subscription ? new Date(managerState.subscription.expiryAt) : null,
    };
  }

  /**
   * Check if user has active access
   */
  async hasAccess(): Promise<boolean> {
    const paidAccess = await subscriptionManager.hasActiveAccess();
    if (paidAccess) return true;

    // Check trial
    const billingState = await offlineBillingManager.getBillingState();
    return billingState.hasActiveAccess;
  }

  /**
   * Start trial
   */
  async startTrial(): Promise<void> {
    await offlineBillingManager.startTrial();
    this.notifyListeners();
  }

  /**
   * Activate subscription from payment
   */
  async activateFromPayment(
    amount: number,
    transactionCode: string,
    source: 'lipana' | 'mpesa' | 'manual' | 'store' = 'lipana'
  ): Promise<{ success: boolean; error?: string; subscription?: Subscription }> {

    // Delegate to SubscriptionManager
    // Map 'manual' to 'store' or 'mpesa' if needed, or update SubscriptionManager to accept 'manual'
    // SubscriptionManager accepts 'mpesa' | 'lipana' | 'store'
    let managerSource: 'mpesa' | 'lipana' | 'store' = 'mpesa';
    if (source === 'lipana') managerSource = 'lipana';
    if (source === 'store' || source === 'manual') managerSource = 'store';

    const result = await subscriptionManager.activateFromPayment(
      amount,
      transactionCode,
      managerSource
    );

    if (!result.success || !result.subscription) {
      return { success: false, error: result.error };
    }

    const legacySub: Subscription = {
      planId: result.subscription.planId,
      activatedAt: result.subscription.activatedAt,
      expiryAt: result.subscription.expiryAt,
      transactionCode: result.subscription.transactionCode,
      source: source,
    };

    this.notifyListeners();
    return { success: true, subscription: legacySub };
  }

  /**
   * Activate by Plan ID
   */
  async activateByPlan(
    planId: PlanId,
    transactionCode: string,
    source: 'lipana' | 'mpesa' | 'manual' = 'lipana'
  ): Promise<{ success: boolean; error?: string }> {
    const plan = getPlanById(planId);
    const res = await this.activateFromPayment(plan.amount, transactionCode, source);
    return { success: res.success, error: res.error };
  }

  async openPaymentLink(planId: PlanId): Promise<boolean> {
    const plan = getPlanById(planId);
    try {
      if (plan.lipanaLink) {
        await Linking.openURL(plan.lipanaLink);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[SubscriptionService] Failed to open payment link:', error);
      return false;
    }
  }

  getPlan(planId: PlanId): SubscriptionPlan {
    return SUBSCRIPTION_PLANS[planId];
  }

  getAllPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  subscribe(listener: (state: SubscriptionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async notifyListeners(): Promise<void> {
    const state = await this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  async refresh(): Promise<SubscriptionState> {
    const state = await this.getState();
    this.notifyListeners();
    return state;
  }

  async clearAll(): Promise<void> {
    await subscriptionManager.clearSubscription();
    await offlineBillingManager.clearSubscription();
    this.notifyListeners();
  }
}

export const SubscriptionService = new SubscriptionServiceClass();
export default SubscriptionService;
