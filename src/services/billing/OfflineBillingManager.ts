/**
 * OfflineBillingManager.ts - Complete Offline Billing System
 * 
 * Combines M-PESA payments, license keys, and local validation
 * No server required - all validation happens on device
 * 
 * Features:
 * - M-PESA payment detection and auto-activation
 * - License key activation
 * - Trial period management
 * - Grace period after expiry
 * - Device binding for security
 * - Offline validation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureStorageService } from '@/services/SecureStorageService';
import { DeviceBindingService } from '@/services/DeviceBindingService';
import { getBypassStatus, type BypassSource } from '@/services/devBypass';
import { licenseKeyValidator, type LicenseKeyPlan } from './LicenseKeyValidator';
import {
  SUBSCRIPTION_PLANS,
  getPlanByAmount,
  getPlanDurationMs,
  type PlanId
} from './SubscriptionPlans';
import 'react-native-get-random-values';
import { SignJWT, jwtVerify } from 'jose';
import * as Keychain from 'react-native-keychain';

// Storage keys
const STORAGE_KEYS = {
  subscription: 'offline_billing:subscription',
  activationHistory: 'offline_billing:history',
  trialUsed: 'offline_billing:trial_used',
  usedLicenseKeys: 'offline_billing:used_keys',
  usedTransactionCodes: 'offline_billing:used_codes',
};

// Configuration
const TRIAL_DURATION_DAYS = 7; // 7-day free trial
const GRACE_PERIOD_DAYS = 3; // 3 days grace after expiry

export interface OfflineSubscription {
  id: string;
  planId: PlanId;
  activatedAt: number;
  expiryAt: number;
  source: 'mpesa' | 'license_key' | 'trial' | 'manual';
  transactionCode?: string;
  licenseKey?: string;
  deviceFingerprint: string;
  extendedFrom?: number;
}

export type BillingStatus =
  | 'active'      // Within subscription period
  | 'trial'       // In trial period
  | 'grace'       // Expired but within grace period
  | 'expiring'    // Active but expiring soon (< 3 days)
  | 'expired'     // Fully expired
  | 'none';       // No subscription

export interface BillingState {
  status: BillingStatus;
  subscription: OfflineSubscription | null;
  daysRemaining: number;
  hoursRemaining: number;
  isInGracePeriod: boolean;
  graceDaysRemaining: number;
  canUseTrial: boolean;
  hasActiveAccess: boolean;
  // 🔐 Bypass status (surfaced in UI)
  isBypassActive: boolean;
  bypassSource: BypassSource;
}

class OfflineBillingManagerService {
  private cachedSubscription: OfflineSubscription | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds

  /**
   * Get current billing state
   */
  async getBillingState(): Promise<BillingState> {
    // 🔐 Check unified bypass status first
    const bypass = await getBypassStatus();
    if (bypass.active) {
      console.log(`[OfflineBilling] Bypass active via: ${bypass.source}`);
      return {
        status: 'active',
        subscription: null,
        daysRemaining: 999,
        hoursRemaining: 0,
        isInGracePeriod: false,
        graceDaysRemaining: 0,
        canUseTrial: false,
        hasActiveAccess: true,
        isBypassActive: true,
        bypassSource: bypass.source,
      };
    }

    const subscription = await this.getSubscription();
    const now = Date.now();

    if (!subscription) {
      const canUseTrial = await this.canStartTrial();
      return {
        status: 'none',
        subscription: null,
        daysRemaining: 0,
        hoursRemaining: 0,
        isInGracePeriod: false,
        graceDaysRemaining: 0,
        canUseTrial,
        hasActiveAccess: false,
        isBypassActive: false,
        bypassSource: null,
      };
    }

    const msRemaining = subscription.expiryAt - now;
    const daysRemaining = Math.max(0, Math.floor(msRemaining / (24 * 60 * 60 * 1000)));
    const hoursRemaining = Math.max(0, Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)));

    // Check grace period
    const graceExpiryMs = subscription.expiryAt + (GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const isInGracePeriod = msRemaining < 0 && now < graceExpiryMs;
    const graceMsRemaining = graceExpiryMs - now;
    const graceDaysRemaining = isInGracePeriod
      ? Math.max(0, Math.floor(graceMsRemaining / (24 * 60 * 60 * 1000)))
      : 0;

    // Determine status
    let status: BillingStatus;
    if (subscription.source === 'trial') {
      status = msRemaining > 0 ? 'trial' : (isInGracePeriod ? 'grace' : 'expired');
    } else if (msRemaining > 0) {
      status = daysRemaining <= 3 ? 'expiring' : 'active';
    } else if (isInGracePeriod) {
      status = 'grace';
    } else {
      status = 'expired';
    }

    const hasActiveAccess = status === 'active' || status === 'trial' || status === 'expiring' || status === 'grace';

    return {
      status,
      subscription,
      daysRemaining,
      hoursRemaining,
      isInGracePeriod,
      graceDaysRemaining,
      canUseTrial: false,
      hasActiveAccess,
      isBypassActive: false,
      bypassSource: null,
    };
  }

  /**
   * Check if user has active access
   */
  async hasActiveAccess(): Promise<boolean> {
    const state = await this.getBillingState();
    return state.hasActiveAccess;
  }

  /**
   * Activate subscription from M-PESA payment
   */
  async activateFromMpesa(
    amount: number,
    transactionCode: string
  ): Promise<{ success: boolean; subscription?: OfflineSubscription; error?: string }> {
    try {
      // Check for duplicate transaction
      if (await this.isTransactionUsed(transactionCode)) {
        return {
          success: false,
          error: `Transaction ${transactionCode} already used`
        };
      }

      // Get plan from amount
      const plan = getPlanByAmount(amount);
      if (!plan) {
        return {
          success: false,
          error: `Invalid payment amount: KES ${amount}`
        };
      }

      // Calculate expiry
      const currentSub = await this.getSubscription();
      const now = Date.now();
      let baseTime = now;
      let extendedFrom: number | undefined;

      // Extend if currently active
      if (currentSub && currentSub.expiryAt > now) {
        baseTime = currentSub.expiryAt;
        extendedFrom = currentSub.expiryAt;
      }

      const duration = getPlanDurationMs(plan.id);
      const expiryAt = baseTime + duration;

      // Create subscription
      const subscription = await this.createSubscription({
        planId: plan.id,
        activatedAt: now,
        expiryAt,
        source: 'mpesa',
        transactionCode,
        extendedFrom,
      });

      // Mark transaction as used
      await this.markTransactionUsed(transactionCode, amount);

      // Save subscription
      await this.saveSubscription(subscription);

      // Add to history
      await this.addToHistory(subscription);

      console.log(`[OfflineBilling] ✅ Activated ${plan.name} via M-PESA until ${new Date(expiryAt).toISOString()}`);

      return { success: true, subscription };
    } catch (error: any) {
      console.error('[OfflineBilling] M-PESA activation error:', error);
      return {
        success: false,
        error: error.message || 'Activation failed'
      };
    }
  }

  /**
   * Activate subscription from license key
   */
  async activateFromLicenseKey(
    licenseKey: string
  ): Promise<{ success: boolean; subscription?: OfflineSubscription; error?: string }> {
    try {
      // Check if key already used
      if (await this.isLicenseKeyUsed(licenseKey)) {
        return {
          success: false,
          error: 'License key already activated on this device'
        };
      }

      // Validate key
      const validation = await licenseKeyValidator.validateKey(licenseKey);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Invalid license key'
        };
      }

      // Map license plan to subscription plan
      const planId = this.mapLicensePlanToSubscriptionPlan(validation.plan!);

      // Create subscription
      const subscription = await this.createSubscription({
        planId,
        activatedAt: Date.now(),
        expiryAt: validation.expiryDate!,
        source: 'license_key',
        licenseKey,
      });

      // Mark key as used
      await this.markLicenseKeyUsed(licenseKey);

      // Save subscription
      await this.saveSubscription(subscription);

      // Add to history
      await this.addToHistory(subscription);

      console.log(`[OfflineBilling] ✅ Activated ${planId} via license key until ${new Date(validation.expiryDate!).toISOString()}`);

      return { success: true, subscription };
    } catch (error: any) {
      console.error('[OfflineBilling] License key activation error:', error);
      return {
        success: false,
        error: error.message || 'Activation failed'
      };
    }
  }

  /**
   * Start free trial
   */
  async startTrial(): Promise<{ success: boolean; subscription?: OfflineSubscription; error?: string }> {
    try {
      // Check if trial already used
      if (!(await this.canStartTrial())) {
        return {
          success: false,
          error: 'Trial already used on this device'
        };
      }

      const now = Date.now();
      const expiryAt = now + (TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

      // Create trial subscription
      const subscription = await this.createSubscription({
        planId: 'trial',
        activatedAt: now,
        expiryAt,
        source: 'trial',
      });

      // Mark trial as used
      await SecureStorageService.setItem(STORAGE_KEYS.trialUsed, 'true');

      // Save subscription
      await this.saveSubscription(subscription);

      // Add to history
      await this.addToHistory(subscription);

      console.log(`[OfflineBilling] ✅ Started ${TRIAL_DURATION_DAYS}-day trial until ${new Date(expiryAt).toISOString()}`);

      return { success: true, subscription };
    } catch (error: any) {
      console.error('[OfflineBilling] Trial activation error:', error);
      return {
        success: false,
        error: error.message || 'Trial activation failed'
      };
    }
  }

  /**
   * Check if trial can be started
   * ⛔ FAIL CLOSED: Returns false on storage errors
   */
  async canStartTrial(): Promise<boolean> {
    try {
      const trialUsed = await SecureStorageService.getItem(STORAGE_KEYS.trialUsed);
      return trialUsed !== 'true';
    } catch (error) {
      console.error('[OfflineBilling] ⛔ canStartTrial storage error - failing closed:', error);
      return false;  // Fail closed: deny trial on error
    }
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<OfflineSubscription | null> {
    // Check cache
    if (this.cachedSubscription && Date.now() - this.cacheTime < this.CACHE_TTL) {
      return this.cachedSubscription;
    }

    try {
      const token = await SecureStorageService.getItem(STORAGE_KEYS.subscription);
      if (!token) return null;

      // 🔐 Verify HS256 Signature
      try {
        const key = await this.getIntegrityKey();
        const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
        const subscription = payload as unknown as OfflineSubscription;

        // Verify device binding
        const currentFingerprint = await DeviceBindingService.getFingerprint();
        if (subscription.deviceFingerprint !== currentFingerprint) {
          console.warn('[OfflineBilling] ⚠️ Subscription fingerprint mismatch!');
          await this.clearSubscription();
          return null;
        }

        // Update cache
        this.cachedSubscription = subscription;
        this.cacheTime = Date.now();
        return subscription;
      } catch (e) {
        console.warn('[OfflineBilling] Signature verification failed:', e);
        await this.clearSubscription();
        return null;
      }
    } catch (error) {
      console.error('[OfflineBilling] Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * Create subscription with device binding and integrity hash
   */
  private async createSubscription(params: {
    planId: PlanId;
    activatedAt: number;
    expiryAt: number;
    source: 'mpesa' | 'license_key' | 'trial' | 'manual';
    transactionCode?: string;
    licenseKey?: string;
    extendedFrom?: number;
  }): Promise<OfflineSubscription> {
    const deviceFingerprint = await DeviceBindingService.getFingerprint();

    return {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      planId: params.planId,
      activatedAt: params.activatedAt,
      expiryAt: params.expiryAt,
      source: params.source,
      transactionCode: params.transactionCode,
      licenseKey: params.licenseKey,
      deviceFingerprint,
      extendedFrom: params.extendedFrom,
    };
  }

  /**
   * Save subscription (Signs with HS256)
   */
  private async saveSubscription(subscription: OfflineSubscription): Promise<void> {
    try {
      const key = await this.getIntegrityKey();
      const token = await new SignJWT(subscription as any)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .sign(key);

      await SecureStorageService.setItem(STORAGE_KEYS.subscription, token);
      this.cachedSubscription = subscription;
      this.cacheTime = Date.now();
    } catch (e) {
      console.error("Failed to sign subscription", e);
      throw e;
    }
  }

  /**
   * Generate integrity hash
   */
  /**
   * Get or Create HS256 Integrity Key
   */
  private async getIntegrityKey(): Promise<Uint8Array> {
    try {
      const serviceName = 'offline_billing_integrity_key';
      const creds = await Keychain.getGenericPassword({ service: serviceName });

      if (creds && creds.password) {
        const binary = global.atob ? global.atob(creds.password) : creds.password; // stored as base64
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      }

      // Generate new 32-byte key
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);

      let binary = '';
      const len = randomBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(randomBytes[i]);
      }
      const base64Key = global.btoa ? global.btoa(binary) : binary;

      await Keychain.setGenericPassword('system', base64Key, { service: serviceName });
      return randomBytes;
    } catch (e) {
      console.error("Failed to manage integrity key", e);
      throw e; // Critical security failure
    }
  }

  /**
   * Transaction tracking
   */
  private async isTransactionUsed(code: string): Promise<boolean> {
    try {
      const raw = await SecureStorageService.getItem(STORAGE_KEYS.usedTransactionCodes);
      if (!raw) return false;
      const codes = JSON.parse(raw) as string[];
      return codes.includes(code);
    } catch {
      return false;
    }
  }

  private async markTransactionUsed(code: string, amount: number): Promise<void> {
    try {
      const raw = await SecureStorageService.getItem(STORAGE_KEYS.usedTransactionCodes);
      const codes = raw ? JSON.parse(raw) : [];
      codes.push(code);
      await SecureStorageService.setItem(STORAGE_KEYS.usedTransactionCodes, JSON.stringify(codes.slice(-100)));
    } catch (error) {
      console.error('[OfflineBilling] Failed to mark transaction:', error);
    }
  }

  /**
   * License key tracking
   */
  private async isLicenseKeyUsed(key: string): Promise<boolean> {
    try {
      const raw = await SecureStorageService.getItem(STORAGE_KEYS.usedLicenseKeys);
      if (!raw) return false;
      const keys = JSON.parse(raw) as string[];
      return keys.includes(key);
    } catch {
      return false;
    }
  }

  private async markLicenseKeyUsed(key: string): Promise<void> {
    try {
      const raw = await SecureStorageService.getItem(STORAGE_KEYS.usedLicenseKeys);
      const keys = raw ? JSON.parse(raw) : [];
      keys.push(key);
      await SecureStorageService.setItem(STORAGE_KEYS.usedLicenseKeys, JSON.stringify(keys.slice(-50)));
    } catch (error) {
      console.error('[OfflineBilling] Failed to mark license key:', error);
    }
  }

  /**
   * Add to activation history
   */
  private async addToHistory(subscription: OfflineSubscription): Promise<void> {
    try {
      const raw = await SecureStorageService.getItem(STORAGE_KEYS.activationHistory);
      const history = raw ? JSON.parse(raw) : [];

      history.push({
        id: subscription.id,
        planId: subscription.planId,
        activatedAt: subscription.activatedAt,
        expiryAt: subscription.expiryAt,
        source: subscription.source,
      });

      await SecureStorageService.setItem(
        STORAGE_KEYS.activationHistory,
        JSON.stringify(history.slice(-50))
      );
    } catch (error) {
      console.error('[OfflineBilling] Failed to add to history:', error);
    }
  }

  /**
   * Map license plan to subscription plan
   */
  private mapLicensePlanToSubscriptionPlan(licensePlan: LicenseKeyPlan): PlanId {
    const mapping: Record<LicenseKeyPlan, PlanId> = {
      'TRIAL': 'trial',
      'DAILY': 'daily',
      'WEEK': 'weekly',
      'MONTH': 'monthly',
      'QRTR': 'quarterly',
      'YEAR': 'yearly',
    };
    return mapping[licensePlan];
  }

  /**
   * Clear subscription (for testing)
   */
  async clearSubscription(): Promise<void> {
    this.cachedSubscription = null;
    await SecureStorageService.removeItem(STORAGE_KEYS.subscription);
  }

  /**
   * Get activation history
   */
  async getHistory(): Promise<any[]> {
    try {
      const raw = await SecureStorageService.getItem(STORAGE_KEYS.activationHistory);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export const offlineBillingManager = new OfflineBillingManagerService();
export default offlineBillingManager;
