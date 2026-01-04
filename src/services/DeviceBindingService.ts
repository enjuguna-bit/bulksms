/**
 * DeviceBindingService - Prevents reinstall bypass and trial abuse
 * 
 * OFFLINE-ONLY Security Features:
 * 1. Persistent device fingerprint using Android ID (survives reinstall until factory reset)
 * 2. Trial data bound to device fingerprint hash
 * 3. Rooted/emulator device detection
 * 4. Subscription bound to device for persistent activation
 * 
 * NOTE: Android ID persists across app reinstalls, making it ideal for 
 * tracking trial usage without a server.
 */

import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { SecureStorageService } from './SecureStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  DEVICE_FINGERPRINT: 'device:fingerprint',
  INSTALLATION_ID: 'device:installationId',
  FIRST_SEEN: 'device:firstSeen',
  TRIAL_USED_HASH: 'device:trialUsedHash', // Hash of Android ID to detect reinstall
  TRIAL_STATUS: 'device:trialStatus', // ⚡ NEW: Stores trial start time
  SUBSCRIPTION_HASH: 'device:subscriptionHash',
};

// Shared Preferences key (persists across reinstall on some devices)
const SHARED_PREFS_TRIAL_KEY = 'bulksms_trial_used';

export interface DeviceInfo {
  fingerprint: string;
  androidId: string;
  installationId: string;
  firstSeen: number;
  isRooted: boolean;
  brand: string;
  model: string;
}

// Error codes for device binding failures
export type DeviceBindingErrorCode =
  | 'DEVICE_ID_UNAVAILABLE'
  | 'STORAGE_ERROR'
  | 'ROOT_DETECTED'
  | 'UNKNOWN';

export interface DeviceBindingResult {
  allowed: boolean;
  reason?: string;
  error?: string;           // Actual error message for logging
  errorCode?: DeviceBindingErrorCode;
}

export interface TrialStatus {
  used: boolean;
  startTime?: number;
  androidIdHash?: string;
}

class DeviceBindingServiceClass {
  private cachedFingerprint: string | null = null;
  private cachedDeviceInfo: DeviceInfo | null = null;

  /**
   * Structured logging for device binding events
   */
  private logEvent(event: string, data?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    console.log(`[DeviceBinding] [${timestamp}] ${event}`, data ? JSON.stringify(data) : '');
  }

  /**
   * Get stable device fingerprint that survives reinstall
   * Uses Android ID (persists until factory reset)
   */
  async getFingerprint(): Promise<string> {
    if (this.cachedFingerprint) return this.cachedFingerprint;

    if (Platform.OS !== 'android') {
      return 'non-android-device';
    }

    try {
      // Primary: Android ID (persists across reinstalls)
      const androidId = await DeviceInfo.getAndroidId();

      // Fallback: Device unique ID
      const uniqueId = await DeviceInfo.getUniqueId();

      // Create composite fingerprint
      const appId = 'com.bulksms.smsmanager';
      const fingerprint = `${androidId || uniqueId}:${appId}`;

      // Cache it
      this.cachedFingerprint = fingerprint;
      await SecureStorageService.setItem(STORAGE_KEYS.DEVICE_FINGERPRINT, fingerprint);

      return fingerprint;
    } catch (error) {
      console.error('[DeviceBinding] Failed to get fingerprint:', error);
      // Fallback to stored fingerprint if available
      const stored = await SecureStorageService.getItem(STORAGE_KEYS.DEVICE_FINGERPRINT);
      return stored || `unknown-${Date.now()}`;
    }
  }

  /**
   * Get or create installation ID (unique per install)
   */
  async getInstallationId(): Promise<string> {
    let installId = await SecureStorageService.getItem(STORAGE_KEYS.INSTALLATION_ID);

    if (!installId) {
      installId = `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await SecureStorageService.setItem(STORAGE_KEYS.INSTALLATION_ID, installId);
    }

    return installId;
  }

  /**
   * Get first seen timestamp (when app was first installed)
   */
  async getFirstSeenTimestamp(): Promise<number> {
    const stored = await SecureStorageService.getItem(STORAGE_KEYS.FIRST_SEEN);

    if (stored) {
      return parseInt(stored, 10);
    }

    const now = Date.now();
    await SecureStorageService.setItem(STORAGE_KEYS.FIRST_SEEN, String(now));
    return now;
  }

  /**
   * Check if device is rooted/jailbroken
   */
  async isDeviceRooted(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      // react-native-device-info doesn't have isRooted, check via other means
      const tags = await DeviceInfo.getTags();
      const isEmulator = await DeviceInfo.isEmulator();

      // Emulators and test-keys builds are suspicious
      if (isEmulator) return true;
      if (tags.includes('test-keys')) return true;

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get comprehensive device info
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    if (this.cachedDeviceInfo) return this.cachedDeviceInfo;

    const [fingerprint, installationId, firstSeen, isRooted] = await Promise.all([
      this.getFingerprint(),
      this.getInstallationId(),
      this.getFirstSeenTimestamp(),
      this.isDeviceRooted(),
    ]);

    let androidId = 'unknown';
    let brand = 'unknown';
    let model = 'unknown';

    try {
      androidId = await DeviceInfo.getAndroidId();
    } catch { /* ignore */ }

    try {
      brand = DeviceInfo.getBrand();
    } catch { /* ignore */ }

    try {
      model = DeviceInfo.getModel();
    } catch { /* ignore */ }

    const info: DeviceInfo = {
      fingerprint,
      androidId,
      installationId,
      firstSeen,
      isRooted,
      brand,
      model,
    };

    this.cachedDeviceInfo = info;
    return info;
  }

  /**
   * Generate a hash from Android ID that persists across reinstalls
   * This is used to detect if trial was already used
   */
  private generateTrialHash(androidId: string): string {
    const input = `trial_used_${androidId}_bulksms`;
    let hash = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193); // FNV prime
    }
    return (hash >>> 0).toString(16);
  }

  /**
   * 🔐 Get trial status including start time
   * ⚡ NEW: Unified trial tracking (no AsyncStorage dependency)
   */
  async getTrialStatus(): Promise<TrialStatus> {
    try {
      const androidId = await DeviceInfo.getAndroidId();
      const trialHash = this.generateTrialHash(androidId);

      // Check new unified storage first
      const statusRaw = await SecureStorageService.getItem(STORAGE_KEYS.TRIAL_STATUS);
      if (statusRaw) {
        const status = JSON.parse(statusRaw) as TrialStatus;
        // Verify hash matches current device
        if (status.androidIdHash === trialHash) {
          return status;
        }
      }

      // Fallback: Check old trial hash storage
      const oldHash = await SecureStorageService.getItem(STORAGE_KEYS.TRIAL_USED_HASH);
      if (oldHash === trialHash) {
        // Migrate to new format
        const status: TrialStatus = {
          used: true,
          androidIdHash: trialHash,
          // No start time available from old data
        };
        await SecureStorageService.setItem(STORAGE_KEYS.TRIAL_STATUS, JSON.stringify(status));
        return status;
      }

      // Not used yet
      return { used: false };
    } catch (error) {
      console.error('[DeviceBinding] Error getting trial status:', error);
      return { used: false };
    }
  }

  /**
   * 🔐 Start trial and record start time
   * ⚡ NEW: Stores start time for duration tracking
   */
  async startTrial(): Promise<void> {
    try {
      const androidId = await DeviceInfo.getAndroidId();
      const trialHash = this.generateTrialHash(androidId);

      const status: TrialStatus = {
        used: true,
        startTime: Date.now(),
        androidIdHash: trialHash,
      };

      // Store in new unified format
      await SecureStorageService.setItem(STORAGE_KEYS.TRIAL_STATUS, JSON.stringify(status));

      // Also keep old format for backward compatibility
      await SecureStorageService.setItem(STORAGE_KEYS.TRIAL_USED_HASH, trialHash);
      await AsyncStorage.setItem(SHARED_PREFS_TRIAL_KEY, trialHash);

      console.log('[DeviceBinding] ✅ Trial started with timestamp');
    } catch (error) {
      console.error('[DeviceBinding] Failed to start trial:', error);
      throw error;
    }
  }

  /**
   * 🔐 Mark trial as used (backward compatibility)
   * @deprecated Use startTrial() instead
   */
  async markTrialAsUsed(): Promise<void> {
    await this.startTrial();
  }

  /**
   * 🔐 Check if trial was already used on this device
   * Detects reinstall by comparing stored hash with current Android ID hash
   * @throws Error if device binding check fails (caller must handle explicitly)
   */
  async hasTrialBeenUsed(): Promise<boolean> {
    try {
      const androidId = await DeviceInfo.getAndroidId();
      const currentHash = this.generateTrialHash(androidId);

      this.logEvent('TRIAL_CHECK', { hashPrefix: currentHash.substring(0, 8) });

      // Check SecureStorage first
      const storedHash = await SecureStorageService.getItem(STORAGE_KEYS.TRIAL_USED_HASH);
      if (storedHash === currentHash) {
        this.logEvent('TRIAL_ALREADY_USED', { source: 'SecureStorage' });
        return true;
      }

      // Fallback: Check AsyncStorage (may persist on some devices after reinstall)
      const asyncHash = await AsyncStorage.getItem(SHARED_PREFS_TRIAL_KEY);
      if (asyncHash === currentHash) {
        // Sync back to SecureStorage
        await SecureStorageService.setItem(STORAGE_KEYS.TRIAL_USED_HASH, currentHash);
        this.logEvent('TRIAL_ALREADY_USED', { source: 'AsyncStorage' });
        return true;
      }

      this.logEvent('TRIAL_NOT_USED');
      return false;
    } catch (error) {
      // ⛔ FAIL CLOSED: Throw error so callers handle explicitly
      this.logEvent('TRIAL_CHECK_ERROR', { error: String(error) });
      throw new Error(`Device binding check failed: ${error}`);
    }
  }

  /**
   * Register subscription activation (offline - just marks locally)
   */
  async registerSubscriptionOnServer(
    transactionCode: string,
    amount: number,
    expiryAt: number
  ): Promise<boolean> {
    // No server - just log and store locally for record
    try {
      const fingerprint = await this.getFingerprint();
      const record = JSON.stringify({
        fingerprint,
        transactionCode,
        amount,
        expiryAt,
        activatedAt: Date.now(),
      });

      await SecureStorageService.setItem(STORAGE_KEYS.SUBSCRIPTION_HASH, record);
      console.log('[DeviceBinding] ✅ Subscription recorded locally');
      return true;
    } catch (error) {
      console.error('[DeviceBinding] Failed to record subscription:', error);
      return false;
    }
  }

  /**
   * Check if this is a fresh install (no previous data)
   */
  async isFreshInstall(): Promise<boolean> {
    const hasFirstSeen = await SecureStorageService.getItem(STORAGE_KEYS.FIRST_SEEN);
    return !hasFirstSeen;
  }

  /**
   * 🔐 MAIN ENTRY: Can this device start a trial?
   * OFFLINE-ONLY: Uses Android ID hash to detect if trial was already used
   * ⛔ FAIL CLOSED: Returns allowed: false with error details on any failure
   */
  async canStartTrial(): Promise<DeviceBindingResult> {
    this.logEvent('CAN_START_TRIAL_CHECK');

    try {
      // 1. Check if device is rooted/emulator
      const isRooted = await this.isDeviceRooted();
      if (isRooted) {
        this.logEvent('TRIAL_BLOCKED', { reason: 'rooted_device' });
        return {
          allowed: false,
          reason: 'Trial not available on rooted/emulator devices',
          errorCode: 'ROOT_DETECTED'
        };
      }

      // 2. Check if trial was already used (survives reinstall via Android ID)
      const trialUsed = await this.hasTrialBeenUsed();
      if (trialUsed) {
        this.logEvent('TRIAL_BLOCKED', { reason: 'already_used' });
        return { allowed: false, reason: 'Trial already used on this device' };
      }

      this.logEvent('TRIAL_ALLOWED');
      return { allowed: true };
    } catch (error) {
      // ⛔ FAIL CLOSED: Block trial on device binding errors
      this.logEvent('TRIAL_BLOCKED', { reason: 'error', error: String(error) });
      return {
        allowed: false,
        reason: 'Device verification unavailable',
        error: String(error),
        errorCode: 'DEVICE_ID_UNAVAILABLE'
      };
    }
  }

  /**
   * Register trial start (marks trial as used)
   */
  async registerTrialOnServer(): Promise<boolean> {
    // No server - just mark trial as used locally
    await this.markTrialAsUsed();
    return true;
  }

  /**
   * Verify device binding on subscription data
   * Returns false if subscription was created on different device
   */
  async verifySubscriptionBinding(subscriptionFingerprint?: string): Promise<boolean> {
    if (!subscriptionFingerprint) return true; // Legacy data without fingerprint

    const currentFingerprint = await this.getFingerprint();
    return currentFingerprint === subscriptionFingerprint;
  }
}

export const DeviceBindingService = new DeviceBindingServiceClass();
