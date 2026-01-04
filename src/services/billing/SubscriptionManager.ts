/**
 * SubscriptionManager.ts - Enhanced subscription management
 * 
 * Features:
 * - Subscription extension (pay while active extends expiry)
 * - Grace period for expiring subscriptions
 * - Promo code support
 * - Subscription analytics
 * - Enhanced error recovery
 */

import { SecureStorageService } from '@/services/SecureStorageService';
import { DeviceBindingService } from '@/services/DeviceBindingService';
import { getBypassStatus } from '@/services/devBypass';
import {
  SUBSCRIPTION_PLANS,
  getPlanByAmount,
  getPlanDurationMs,
  type PlanId,
  type SubscriptionPlan
} from './SubscriptionPlans';
import { retryAsync, DEFAULT_RETRY_CONFIG } from '@/utils/transactionErrorHandling';

// Storage keys
const STORAGE_KEYS = {
  subscription: 'subscription:data',
  history: 'subscription:history',
  promoCodes: 'subscription:promoCodes',
  analytics: 'subscription:analytics',
  graceExpiry: 'subscription:graceExpiry',
  // Removed: trialStarted - now tracked in DeviceBindingService exclusively
};

// Grace period configuration
const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days grace after expiry
const TRIAL_PERIOD_MS = 2 * 24 * 60 * 60 * 1000; // 2 days trial for new users
const RENEWAL_REMINDER_DAYS = [7, 3, 1]; // Days before expiry to show reminder

export interface Subscription {
  id: string;
  planId: PlanId;
  amount: number;
  activatedAt: number;
  expiryAt: number;
  source: 'mpesa' | 'lipana' | 'store' | 'promo';
  transactionCode?: string;
  extendedFrom?: number; // Previous expiry if extended
  promoCode?: string;
  deviceFingerprint?: string; // 🔐 Device binding for security
  _hash?: string;
}

export interface SubscriptionHistory {
  id: string;
  planId: PlanId;
  amount: number;
  activatedAt: number;
  expiryAt: number;
  source: string;
  status: 'completed' | 'expired' | 'extended';
}

export interface PromoCode {
  code: string;
  discountPercent?: number;
  bonusDays?: number;
  validUntil?: number;
  maxUses?: number;
  usedCount: number;
  planRestriction?: PlanId[];
}

export interface SubscriptionAnalytics {
  totalPayments: number;
  totalAmount: number;
  firstActivation?: number;
  lastActivation?: number;
  planHistory: { planId: PlanId; count: number }[];
  averageRenewalDays: number;
  consecutiveRenewals: number;
}

export type SubscriptionStatus =
  | 'active'      // Within subscription period
  | 'grace'       // Expired but within grace period
  | 'expiring'    // Active but expiring soon
  | 'expired'     // Fully expired
  | 'none';       // Never had subscription

export interface SubscriptionState {
  status: SubscriptionStatus;
  subscription: Subscription | null;
  daysRemaining: number;
  hoursRemaining: number;
  isInGracePeriod: boolean;
  graceDaysRemaining: number;
  renewalReminder: boolean;
}

class SubscriptionManagerService {
  private cachedSubscription: Subscription | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_TTL = 5000; // 5 second cache

  private readonly SYNC_RETRY_CONFIG = {
    ...DEFAULT_RETRY_CONFIG,
    maxAttempts: 3, // Max 3 retries
    initialDelayMs: 1000, // Start with 1 second
    maxDelayMs: 10000, // Max 10 second delay
    backoffMultiplier: 2 // Exponential backoff
  };

  /**
   * Get current subscription state with all relevant info
   */
  async getSubscriptionState(): Promise<SubscriptionState> {
    const subscription = await this.getSubscription();
    const now = Date.now();

    if (!subscription) {
      return {
        status: 'none',
        subscription: null,
        daysRemaining: 0,
        hoursRemaining: 0,
        isInGracePeriod: false,
        graceDaysRemaining: 0,
        renewalReminder: false,
      };
    }

    const msRemaining = subscription.expiryAt - now;
    const daysRemaining = Math.max(0, Math.floor(msRemaining / (24 * 60 * 60 * 1000)));
    const hoursRemaining = Math.max(0, Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)));

    // Check if in grace period
    const graceExpiry = subscription.expiryAt + GRACE_PERIOD_MS;
    const isInGracePeriod = msRemaining < 0 && now < graceExpiry;
    const graceMsRemaining = graceExpiry - now;
    const graceDaysRemaining = isInGracePeriod
      ? Math.max(0, Math.floor(graceMsRemaining / (24 * 60 * 60 * 1000)))
      : 0;

    // Determine status
    let status: SubscriptionStatus;
    if (msRemaining > 0) {
      status = RENEWAL_REMINDER_DAYS.includes(daysRemaining) ? 'expiring' : 'active';
    } else if (isInGracePeriod) {
      status = 'grace';
    } else {
      status = 'expired';
    }

    // Check if should show renewal reminder
    const renewalReminder = RENEWAL_REMINDER_DAYS.includes(daysRemaining);

    return {
      status,
      subscription,
      daysRemaining,
      hoursRemaining,
      isInGracePeriod,
      graceDaysRemaining,
      renewalReminder,
    };
  }

  /**
   * Check if user has active access (including grace period and trial)
   * Uses unified bypass manager for admin/developer bypass
   */
  async hasActiveAccess(): Promise<boolean> {
    // 🔐 Check unified bypass status
    try {
      const bypass = await getBypassStatus();
      if (bypass.active) {
        console.log(`[SubscriptionManager] Bypass active via: ${bypass.source}`);
        return true;
      }
    } catch (e) {
      console.warn('[SubscriptionManager] Error checking bypass:', e);
    }

    const state = await this.getSubscriptionState();

    // Check active/expiring/grace subscriptions
    if (state.status === 'active' || state.status === 'expiring' || state.status === 'grace') {
      return true;
    }

    // ✨ NEW: Check trial period for users without subscription
    if (state.status === 'none' || state.status === 'expired') {
      const trialActive = await this.isTrialActive();
      if (trialActive) {
        console.log('[SubscriptionManager] Trial period active');
        return true;
      }
    }

    return false;
  }

  /**
   * Check if trial period is still active
   * ⚡ UPDATED: Uses DeviceBindingService exclusively (no AsyncStorage)
   * @returns true if within 2-day trial, false otherwise
   */
  private async isTrialActive(): Promise<boolean> {
    try {
      // 🔐 Get trial status from DeviceBinding (includes start time)
      const trialStatus = await DeviceBindingService.getTrialStatus();

      if (trialStatus.used && !trialStatus.startTime) {
        // Old device binding without start time - consider expired
        console.log('[SubscriptionManager] Trial used but no start time (migrated data)');
        return false;
      }

      // Check trial eligibility using device fingerprint
      const result = await DeviceBindingService.canStartTrial();
      if (!result.allowed) {
        console.log(`[SubscriptionManager] Trial not allowed: ${result.reason}`);
        return false;
      }

      // First time user - start trial now
      if (!trialStatus.startTime) {
        await DeviceBindingService.startTrial(); // ✅ Stores start time in DeviceBinding
        console.log('[SubscriptionManager] Starting 2-day trial (device-bound)');
        return true;
      }

      // Check if trial has expired
      const elapsed = Date.now() - trialStatus.startTime;
      const isActive = elapsed < TRIAL_PERIOD_MS;

      if (!isActive) {
        const daysElapsed = Math.floor(elapsed / (24 * 60 * 60 * 1000));
        console.log(`[SubscriptionManager] Trial expired (${daysElapsed} days ago)`);
      }

      return isActive;
    } catch (error) {
      console.error('[SubscriptionManager] Error checking trial:', error);
      // Fail closed - no trial on error
      return false;
    }
  }

  /**
   * Activate or extend subscription from payment
   * If user already has active subscription, extends from current expiry
   */
  async activateFromPayment(
    amount: number,
    transactionCode: string,
    source: 'mpesa' | 'lipana' | 'store' = 'mpesa',
    promoCode?: string
  ): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    try {
      // Get plan from amount
      const plan = getPlanByAmount(amount);
      if (!plan) {
        return {
          success: false,
          error: `Unrecognized payment amount: KES ${amount}. Contact support.`
        };
      }

      // Check for duplicate transaction
      const isDuplicate = await this.isTransactionProcessed(transactionCode);
      if (isDuplicate) {
        return {
          success: false,
          error: `Transaction ${transactionCode} already processed.`
        };
      }

      // Calculate new expiry - extend if currently active
      const currentSub = await this.getSubscription();
      const now = Date.now();
      let baseTime = now;
      let extendedFrom: number | undefined;

      // If currently active or in grace, extend from current expiry
      if (currentSub && currentSub.expiryAt > now) {
        baseTime = currentSub.expiryAt;
        extendedFrom = currentSub.expiryAt;
        console.log('[SubscriptionManager] Extending existing subscription');
      }

      // Apply promo code bonus if any
      let bonusDays = 0;
      if (promoCode) {
        const promoResult = await this.validateAndApplyPromo(promoCode, plan.id);
        if (promoResult.valid) {
          bonusDays = promoResult.bonusDays || 0;
        }
      }

      const planDuration = getPlanDurationMs(plan.id);
      const bonusDuration = bonusDays * 24 * 60 * 60 * 1000;
      const newExpiry = baseTime + planDuration + bonusDuration;

      // Get device fingerprint for binding
      const deviceFingerprint = await DeviceBindingService.getFingerprint();

      // Create subscription record
      const subscription: Subscription = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        planId: plan.id,
        amount,
        activatedAt: now,
        expiryAt: newExpiry,
        source,
        transactionCode,
        extendedFrom,
        promoCode,
        deviceFingerprint, // 🔐 Bind subscription to device
      };

      // Save subscription and mark transaction as used
      await this.saveSubscription(subscription);
      await this.markTransactionProcessed(transactionCode, amount);
      await this.addToHistory(subscription);
      await this.updateAnalytics(subscription);

      // 🔐 Register subscription on server (prevents reinstall bypass)
      await this.registerSubscriptionOnServerWithRetry(transactionCode, amount, newExpiry);

      // Clear cache
      this.cachedSubscription = null;

      console.log(`[SubscriptionManager] ✅ Activated ${plan.name} plan until ${new Date(newExpiry).toISOString()}`);

      return { success: true, subscription };
    } catch (error: any) {
      console.error('[SubscriptionManager] Activation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to activate subscription'
      };
    }
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<Subscription | null> {
    // Check cache
    if (this.cachedSubscription && Date.now() - this.cacheTime < this.CACHE_TTL) {
      return this.cachedSubscription;
    }

    try {
      const raw = await SecureStorageService.getItem(STORAGE_KEYS.subscription);
      if (!raw) return null;

      const subscription = JSON.parse(raw) as Subscription;

      // Verify integrity
      const isValid = await this.verifySubscriptionIntegrity(subscription);
      if (!isValid) {
        console.warn('[SubscriptionManager] ⚠️ Subscription data tampered!');
        await this.clearSubscription();
        return null;
      }

      // 🔐 Verify device binding (prevents copying subscription to another device)
      if (subscription.deviceFingerprint) {
        const isDeviceValid = await DeviceBindingService.verifySubscriptionBinding(
          subscription.deviceFingerprint
        );
        if (!isDeviceValid) {
          console.warn('[SubscriptionManager] ⚠️ Subscription from different device!');
          await this.clearSubscription();
          return null;
        }
      }

      // Update cache
      this.cachedSubscription = subscription;
      this.cacheTime = Date.now();

      return subscription;
    } catch (error) {
      console.error('[SubscriptionManager] Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * Save subscription with integrity hash
   */
  private async saveSubscription(subscription: Subscription): Promise<void> {
    subscription._hash = await this.generateHash(subscription);
    await SecureStorageService.setItem(
      STORAGE_KEYS.subscription,
      JSON.stringify(subscription)
    );
  }

  /**
   * Verify subscription hasn't been tampered with
   */
  private async verifySubscriptionIntegrity(subscription: Subscription): Promise<boolean> {
    if (!subscription._hash) return false;
    const computed = await this.generateHash(subscription);
    return subscription._hash === computed;
  }

  /**
   * Generate integrity hash for subscription
   * Uses device fingerprint for additional binding security
   */
  private async generateHash(subscription: Subscription): Promise<string> {
    // Include device fingerprint in hash for binding
    const deviceFingerprint = await DeviceBindingService.getFingerprint();

    const payload = JSON.stringify({
      id: subscription.id,
      planId: subscription.planId,
      amount: subscription.amount,
      activatedAt: subscription.activatedAt,
      expiryAt: subscription.expiryAt,
      source: subscription.source,
      deviceFingerprint, // 🔐 Include device in hash
    });

    // Enhanced hash algorithm (cyrb53 - fast and good distribution)
    const seed = 0x2fa9e3b7; // Fixed seed for consistency
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;

    for (let i = 0; i < payload.length; i++) {
      const ch = payload.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    // Combine into 64-bit result as hex string
    const result = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    return result;
  }

  /**
   * Check if transaction was already processed
   */
  private async isTransactionProcessed(code: string): Promise<boolean> {
    try {
      const raw = await SecureStorageService.getItem('subscription:usedCodes');
      if (!raw) return false;
      const codes = JSON.parse(raw) as { code: string; processedAt: number }[];
      return codes.some(c => c.code === code);
    } catch {
      return false;
    }
  }

  /**
   * Mark transaction as processed
   */
  private async markTransactionProcessed(code: string, amount: number): Promise<void> {
    try {
      const raw = await SecureStorageService.getItem('subscription:usedCodes');
      const codes = raw ? JSON.parse(raw) : [];
      codes.push({ code, amount, processedAt: Date.now() });

      // Keep only last 100 transactions
      const trimmed = codes.slice(-100);
      await SecureStorageService.setItem('subscription:usedCodes', JSON.stringify(trimmed));
    } catch (error) {
      console.error('[SubscriptionManager] Failed to mark transaction:', error);
    }
  }

  /**
   * Add subscription to history
   */
  private async addToHistory(subscription: Subscription): Promise<void> {
    try {
      const raw = await SecureStorageService.getItem(STORAGE_KEYS.history);
      const history: SubscriptionHistory[] = raw ? JSON.parse(raw) : [];

      history.push({
        id: subscription.id,
        planId: subscription.planId,
        amount: subscription.amount,
        activatedAt: subscription.activatedAt,
        expiryAt: subscription.expiryAt,
        source: subscription.source,
        status: 'completed',
      });

      // Keep last 50 entries
      const trimmed = history.slice(-50);
      await SecureStorageService.setItem(STORAGE_KEYS.history, JSON.stringify(trimmed));
    } catch (error) {
      console.error('[SubscriptionManager] Failed to add to history:', error);
    }
  }

  /**
   * Update analytics
   */
  private async updateAnalytics(subscription: Subscription): Promise<void> {
    try {
      const raw = await SecureStorageService.getItem(STORAGE_KEYS.analytics);
      const analytics: SubscriptionAnalytics = raw ? JSON.parse(raw) : {
        totalPayments: 0,
        totalAmount: 0,
        planHistory: [],
        averageRenewalDays: 0,
        consecutiveRenewals: 0,
      };

      analytics.totalPayments += 1;
      analytics.totalAmount += subscription.amount;
      analytics.lastActivation = subscription.activatedAt;

      if (!analytics.firstActivation) {
        analytics.firstActivation = subscription.activatedAt;
      }

      // Update plan history
      const planEntry = analytics.planHistory.find(p => p.planId === subscription.planId);
      if (planEntry) {
        planEntry.count += 1;
      } else {
        analytics.planHistory.push({ planId: subscription.planId, count: 1 });
      }

      // Track consecutive renewals
      if (subscription.extendedFrom) {
        analytics.consecutiveRenewals += 1;
      } else {
        analytics.consecutiveRenewals = 1;
      }

      await SecureStorageService.setItem(STORAGE_KEYS.analytics, JSON.stringify(analytics));
    } catch (error) {
      console.error('[SubscriptionManager] Failed to update analytics:', error);
    }
  }

  /**
   * Resolve conflicts between local and server subscription data
   * Returns the subscription that should be considered authoritative
   */
  private async resolveSubscriptionConflict(
    localSub: Subscription | null,
    serverSub: Subscription | null
  ): Promise<Subscription | null> {
    // No conflict if one is null
    if (!localSub) return serverSub;
    if (!serverSub) return localSub;

    // Prefer server subscription if local is expired and server is active
    const now = Date.now();
    const localIsActive = localSub.expiryAt > now;
    const serverIsActive = serverSub.expiryAt > now;
    
    if (!localIsActive && serverIsActive) {
      console.log('[SubscriptionManager] Resolving conflict: Using server subscription (local expired)');
      return serverSub;
    }

    // Use whichever subscription has the later expiry
    if (localSub.expiryAt !== serverSub.expiryAt) {
      const resolvedSub = localSub.expiryAt > serverSub.expiryAt ? localSub : serverSub;
      console.log(`[SubscriptionManager] Resolving expiry conflict: Using ${resolvedSub.expiryAt > localSub.expiryAt ? 'server' : 'local'} subscription`);
      return resolvedSub;
    }

    // Default: use server subscription as source of truth
    return serverSub;
  }

  /**
   * Validate and apply promo code
   */
  async validateAndApplyPromo(
    code: string,
    planId: PlanId
  ): Promise<{ valid: boolean; bonusDays?: number; discountPercent?: number; error?: string }> {
    try {
      const raw = await SecureStorageService.getItem(STORAGE_KEYS.promoCodes);
      const promoCodes: PromoCode[] = raw ? JSON.parse(raw) : [];

      const promo = promoCodes.find(p => p.code.toUpperCase() === code.toUpperCase());

      if (!promo) {
        return { valid: false, error: 'Invalid promo code' };
      }

      // Check validity
      if (promo.validUntil && Date.now() > promo.validUntil) {
        return { valid: false, error: 'Promo code has expired' };
      }

      if (promo.maxUses && promo.usedCount >= promo.maxUses) {
        return { valid: false, error: 'Promo code usage limit reached' };
      }

      if (promo.planRestriction && !promo.planRestriction.includes(planId)) {
        return { valid: false, error: 'Promo code not valid for this plan' };
      }

      // Increment usage
      promo.usedCount += 1;
      await SecureStorageService.setItem(STORAGE_KEYS.promoCodes, JSON.stringify(promoCodes));

      return {
        valid: true,
        bonusDays: promo.bonusDays,
        discountPercent: promo.discountPercent,
      };
    } catch (error) {
      console.error('[SubscriptionManager] Promo validation error:', error);
      return { valid: false, error: 'Failed to validate promo code' };
    }
  }

  /**
   * Add a promo code (admin function)
   */
  async addPromoCode(promo: Omit<PromoCode, 'usedCount'>): Promise<void> {
    try {
      const raw = await SecureStorageService.getItem(STORAGE_KEYS.promoCodes);
      const promoCodes: PromoCode[] = raw ? JSON.parse(raw) : [];

      promoCodes.push({ ...promo, usedCount: 0 });

      await SecureStorageService.setItem(STORAGE_KEYS.promoCodes, JSON.stringify(promoCodes));
    } catch (error) {
      console.error('[SubscriptionManager] Failed to add promo code:', error);
    }
  }

  /**
   * Get subscription analytics
   */
  async getAnalytics(): Promise<SubscriptionAnalytics | null> {
    try {
      const raw = await SecureStorageService.getItem(STORAGE_KEYS.analytics);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get subscription history
   */
  async getHistory(): Promise<SubscriptionHistory[]> {
    try {
      const raw = await SecureStorageService.getItem(STORAGE_KEYS.history);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear subscription (for testing/reset)
   */
  async clearSubscription(): Promise<void> {
    this.cachedSubscription = null;
    await SecureStorageService.removeItem(STORAGE_KEYS.subscription);
  }

  /**
   * Get remaining time formatted
   */
  async getRemainingTimeFormatted(): Promise<string> {
    const state = await this.getSubscriptionState();

    if (state.status === 'none' || state.status === 'expired') {
      return 'No active subscription';
    }

    if (state.status === 'grace') {
      return `Grace period: ${state.graceDaysRemaining} days remaining`;
    }

    if (state.daysRemaining > 0) {
      return `${state.daysRemaining} days, ${state.hoursRemaining} hours remaining`;
    }

    return `${state.hoursRemaining} hours remaining`;
  }

  private async syncWithServerWithRetry(
    operation: () => Promise<boolean>,
    operationName: string
  ): Promise<boolean> {
    try {
      return await retryAsync(
        async () => {
          return await operation();
        },
        this.SYNC_RETRY_CONFIG,
        (attempt, error) => {
          console.warn(`[SubscriptionManager] Retry ${attempt + 1} for ${operationName}:`, error.message);
        }
      );
    } catch (error) {
      console.error(`[SubscriptionManager] Failed after retries for ${operationName}:`, error);
      // Fail gracefully - sync will be retried later
      return false;
    }
  }

  private async registerSubscriptionOnServerWithRetry(
    transactionCode: string,
    amount: number,
    expiryAt: number
  ): Promise<void> {
    await this.syncWithServerWithRetry(
      () => DeviceBindingService.registerSubscriptionOnServer(transactionCode, amount, expiryAt),
      'registerSubscriptionOnServer'
    );
  }

  private async registerTrialOnServerWithRetry(): Promise<void> {
    await this.syncWithServerWithRetry(
      () => DeviceBindingService.registerTrialOnServer(),
      'registerTrialOnServer'
    );
  }
}

export const subscriptionManager = new SubscriptionManagerService();
export default subscriptionManager;
