/**
 * Storage Fallback for AsyncStorage
 * Temporary solution until AsyncStorage native module is properly linked
 */

// In-memory storage fallback
const memoryStorage: Map<string, string> = new Map();

export const StorageFallback = {
  async getItem(key: string): Promise<string | null> {
    try {
      // Try AsyncStorage first
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch (e) {
      // Fall back to memory storage
      console.warn(`[StorageFallback] Using memory storage for key: ${key}`);
      return memoryStorage.get(key) || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[StorageFallback] Using memory storage for key: ${key}`);
      memoryStorage.set(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn(`[StorageFallback] Using memory storage for key: ${key}`);
      memoryStorage.delete(key);
    }
  },

  async clear(): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.clear();
    } catch (e) {
      console.warn('[StorageFallback] Clearing memory storage');
      memoryStorage.clear();
    }
  },
};
