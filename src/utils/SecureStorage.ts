/**
 * SecureStorage - SQLite-based storage replacement for AsyncStorage
 * 
 * Provides AsyncStorage-compatible API using SQLite for persistence.
 * More reliable and consistent with the app's existing architecture.
 */

import { openDatabase } from "@/db/sqlite";
import Logger from "@/utils/logger";

const DB_NAME = "storage.db";
const TABLE_NAME = "key_value_store";

// Initialize storage table
let initialized = false;

async function ensureInitialized() {
  if (initialized) return;

  try {
    const db = await openDatabase(DB_NAME);
    
    // Add SQLite optimizations for concurrent access
    await db.executeSql('PRAGMA journal_mode = WAL;');
    await db.executeSql('PRAGMA synchronous = NORMAL;');
    await db.executeSql('PRAGMA busy_timeout = 3000;');
    await db.executeSql('PRAGMA cache_size = -2000;'); // 2MB cache
    
    // Create key-value table if it doesn't exist
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    initialized = true;
    Logger.debug("SecureStorage", "Initialized successfully with WAL mode");
  } catch (error) {
    Logger.error("SecureStorage", "Initialization failed", error);
    throw error;
  }
}

/**
 * SecureStorage - AsyncStorage-compatible API using SQLite
 */
export const SecureStorage = {
  /**
   * Get an item from storage
   */
  async getItem(key: string): Promise<string | null> {
    try {
      await ensureInitialized();
      const db = await openDatabase(DB_NAME);
      
      const [result] = await db.executeSql(
        `SELECT value FROM ${TABLE_NAME} WHERE key = ?`,
        [key]
      );

      if (result.rows && result.rows.length > 0) {
        return result.rows.item(0).value;
      }
      
      return null;
    } catch (error) {
      Logger.error("SecureStorage", `getItem failed for key: ${key}`, error);
      return null;
    }
  },

  /**
   * Set an item in storage
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await ensureInitialized();
      const db = await openDatabase(DB_NAME);
      
      await db.executeSql(
        `INSERT OR REPLACE INTO ${TABLE_NAME} (key, value, updated_at) 
         VALUES (?, ?, strftime('%s', 'now'))`,
        [key, value]
      );
      
      Logger.debug("SecureStorage", `setItem: ${key}`);
    } catch (error) {
      Logger.error("SecureStorage", `setItem failed for key: ${key}`, error);
      throw error;
    }
  },

  /**
   * Remove an item from storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      await ensureInitialized();
      const db = await openDatabase(DB_NAME);
      
      await db.executeSql(
        `DELETE FROM ${TABLE_NAME} WHERE key = ?`,
        [key]
      );
      
      Logger.debug("SecureStorage", `removeItem: ${key}`);
    } catch (error) {
      Logger.error("SecureStorage", `removeItem failed for key: ${key}`, error);
      throw error;
    }
  },

  /**
   * Get multiple items at once
   */
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      await ensureInitialized();
      const db = await openDatabase(DB_NAME);
      
      const placeholders = keys.map(() => '?').join(',');
      const [result] = await db.executeSql(
        `SELECT key, value FROM ${TABLE_NAME} WHERE key IN (${placeholders})`,
        keys
      );

      const resultMap = new Map<string, string>();
      if (result.rows) {
        for (let i = 0; i < result.rows.length; i++) {
          const row = result.rows.item(i);
          resultMap.set(row.key, row.value);
        }
      }

      return keys.map(key => [key, resultMap.get(key) || null]);
    } catch (error) {
      Logger.error("SecureStorage", "multiGet failed", error);
      return keys.map(key => [key, null]);
    }
  },

  /**
   * Set multiple items at once
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    try {
      await ensureInitialized();
      const db = await openDatabase(DB_NAME);
      
      for (const [key, value] of keyValuePairs) {
        await db.executeSql(
          `INSERT OR REPLACE INTO ${TABLE_NAME} (key, value, updated_at) 
           VALUES (?, ?, strftime('%s', 'now'))`,
          [key, value]
        );
      }
      
      Logger.debug("SecureStorage", `multiSet: ${keyValuePairs.length} items`);
    } catch (error) {
      Logger.error("SecureStorage", "multiSet failed", error);
      throw error;
    }
  },

  /**
   * Remove multiple items at once
   */
  async multiRemove(keys: string[]): Promise<void> {
    try {
      await ensureInitialized();
      const db = await openDatabase(DB_NAME);
      
      const placeholders = keys.map(() => '?').join(',');
      await db.executeSql(
        `DELETE FROM ${TABLE_NAME} WHERE key IN (${placeholders})`,
        keys
      );
      
      Logger.debug("SecureStorage", `multiRemove: ${keys.length} items`);
    } catch (error) {
      Logger.error("SecureStorage", "multiRemove failed", error);
      throw error;
    }
  },

  /**
   * Get all keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      await ensureInitialized();
      const db = await openDatabase(DB_NAME);
      
      const [result] = await db.executeSql(
        `SELECT key FROM ${TABLE_NAME} ORDER BY key`
      );

      const keys: string[] = [];
      if (result.rows) {
        for (let i = 0; i < result.rows.length; i++) {
          keys.push(result.rows.item(i).key);
        }
      }
      
      return keys;
    } catch (error) {
      Logger.error("SecureStorage", "getAllKeys failed", error);
      return [];
    }
  },

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    try {
      await ensureInitialized();
      const db = await openDatabase(DB_NAME);
      
      await db.executeSql(`DELETE FROM ${TABLE_NAME}`);
      
      Logger.info("SecureStorage", "Cleared all data");
    } catch (error) {
      Logger.error("SecureStorage", "clear failed", error);
      throw error;
    }
  },

  /**
   * Merge an item (for objects stored as JSON)
   */
  async mergeItem(key: string, value: string): Promise<void> {
    try {
      const existing = await this.getItem(key);
      
      if (existing) {
        const existingObj = JSON.parse(existing);
        const newObj = JSON.parse(value);
        const merged = { ...existingObj, ...newObj };
        await this.setItem(key, JSON.stringify(merged));
      } else {
        await this.setItem(key, value);
      }
    } catch (error) {
      Logger.error("SecureStorage", `mergeItem failed for key: ${key}`, error);
      throw error;
    }
  },
};

// Export as default for drop-in replacement
export default SecureStorage;
