/**
 * Subscription Storage - Persistent storage for subscription data
 * @deprecated Use SubscriptionManager (SecureStorage) instead.
 * This file is kept only for migration purposes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Subscription, PlanId } from './types';

const STORAGE_KEYS = {
  SUBSCRIPTION: '@subscription:current',
  TRIAL_START: '@subscription:trialStart',
  TRIAL_END: '@subscription:trialEnd',
  HISTORY: '@subscription:history',
} as const;

const TRIAL_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

export const SubscriptionStorage = {
  async getSubscription(): Promise<Subscription | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[SubscriptionStorage] Failed to get subscription:', error);
      return null;
    }
  },

  async saveSubscription(subscription: Subscription): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SUBSCRIPTION,
        JSON.stringify(subscription)
      );
      // Also add to history
      await this.addToHistory(subscription);
    } catch (error) {
      console.error('[SubscriptionStorage] Failed to save subscription:', error);
      throw error;
    }
  },

  async clearSubscription(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION);
    } catch (error) {
      console.error('[SubscriptionStorage] Failed to clear subscription:', error);
    }
  },

  async getTrialInfo(): Promise<{ start: number; end: number } | null> {
    try {
      const [startStr, endStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TRIAL_START),
        AsyncStorage.getItem(STORAGE_KEYS.TRIAL_END),
      ]);

      if (!startStr || !endStr) return null;

      return {
        start: parseInt(startStr, 10),
        end: parseInt(endStr, 10),
      };
    } catch (error) {
      console.error('[SubscriptionStorage] Failed to get trial info:', error);
      return null;
    }
  },

  async startTrial(): Promise<{ start: number; end: number }> {
    const existing = await this.getTrialInfo();
    if (existing) return existing;

    const start = Date.now();
    const end = start + TRIAL_DURATION_MS;

    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.TRIAL_START, String(start)],
        [STORAGE_KEYS.TRIAL_END, String(end)],
      ]);
      return { start, end };
    } catch (error) {
      console.error('[SubscriptionStorage] Failed to start trial:', error);
      throw error;
    }
  },

  async isTrialActive(): Promise<boolean> {
    const trial = await this.getTrialInfo();
    if (!trial) return false;
    return trial.end > Date.now();
  },

  async getTrialDaysRemaining(): Promise<number> {
    const trial = await this.getTrialInfo();
    if (!trial) return 0;

    const remaining = trial.end - Date.now();
    if (remaining <= 0) return 0;

    return Math.ceil(remaining / (24 * 60 * 60 * 1000));
  },

  async addToHistory(subscription: Subscription): Promise<void> {
    try {
      const historyStr = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
      const history: Subscription[] = historyStr ? JSON.parse(historyStr) : [];

      history.unshift(subscription);
      // Keep only last 20 subscriptions
      const trimmed = history.slice(0, 20);

      await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('[SubscriptionStorage] Failed to add to history:', error);
    }
  },

  async getHistory(): Promise<Subscription[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[SubscriptionStorage] Failed to get history:', error);
      return [];
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.SUBSCRIPTION,
        STORAGE_KEYS.TRIAL_START,
        STORAGE_KEYS.TRIAL_END,
        STORAGE_KEYS.HISTORY,
      ]);
    } catch (error) {
      console.error('[SubscriptionStorage] Failed to clear all:', error);
    }
  },
};

export default SubscriptionStorage;
