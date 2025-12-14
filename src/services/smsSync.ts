// ------------------------------------------------------
// 📱 src/services/smsSync.ts
// SMS synchronization service for importing existing messages
// Reads from Android SMS content provider and syncs to local database
// ------------------------------------------------------

import { Platform, PermissionsAndroid } from 'react-native';
import { runQuery } from '@/db/database/core';
import { addMessage } from '@/db/repositories/messages';
import Logger from '@/utils/logger';

/**
 * Check if SMS sync permissions are granted
 */
export async function checkSmsSyncPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const hasReadSms = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    const hasReadContacts = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);

    return hasReadSms && hasReadContacts;
  } catch (error) {
    Logger.error('SmsSync', 'Permission check failed', error);
    return false;
  }
}

/**
 * Request SMS sync permissions
 */
export async function requestSmsSyncPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS
    ];

    const results = await PermissionsAndroid.requestMultiple(permissions);

    const allGranted = Object.values(results).every(
      result => result === PermissionsAndroid.RESULTS.GRANTED
    );

    return allGranted;
  } catch (error) {
    Logger.error('SmsSync', 'Permission request failed', error);
    return false;
  }
}

/**
 * Import existing SMS messages from Android content provider
 */
export async function importExistingMessages(): Promise<{ success: boolean; imported: number; error?: string }> {
  if (Platform.OS !== 'android') {
    return { success: false, imported: 0, error: 'Android only' };
  }

  try {
    // Check permissions first
    const hasPermissions = await checkSmsSyncPermissions();
    if (!hasPermissions) {
      const granted = await requestSmsSyncPermissions();
      if (!granted) {
        return { success: false, imported: 0, error: 'SMS permissions denied' };
      }
    }

    // Import messages using native module
    const { smsReader } = require('@/native');
    const messages = await smsReader.importExistingMessages();

    if (!Array.isArray(messages)) {
      return { success: false, imported: 0, error: 'Invalid response from native module' };
    }

    let importedCount = 0;
    const CHUNK_SIZE = 100; // Batch size for SQLite

    // ⚡ OPTIMIZATION: Use Transaction & Batch Insert
    // We process in chunks to avoid memory spikes and keep UI responsive

    await runQuery('BEGIN TRANSACTION;');

    try {
      for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
        const chunk = messages.slice(i, i + CHUNK_SIZE);

        // Construct bulk INSERT query
        const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',');
        const query = `
          INSERT INTO messages (address, body, type, status, timestamp, threadId, simSlot)
          VALUES ${placeholders};
        `;

        const values: any[] = [];
        chunk.forEach(msg => {
          values.push(
            msg.address || '',
            msg.body || '',
            msg.type || 'incoming',
            msg.status || 'received',
            msg.timestamp || Date.now(),
            msg.threadId || msg.address,
            msg.simSlot || null
          );
        });

        await runQuery(query, values);
        importedCount += chunk.length;

        // Yield to event loop every 500 messages to prevent UI freeze
        if (i % 500 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      await runQuery('COMMIT;');
      Logger.info('SmsSync', `Batch imported ${importedCount} messages`);
      return { success: true, imported: importedCount };

    } catch (batchError) {
      await runQuery('ROLLBACK;');
      throw batchError;
    }

  } catch (error) {
    Logger.error('SmsSync', 'Import failed', error);
    return {
      success: false,
      imported: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get count of existing messages in Android content provider
 */
export async function getExistingMessageCount(): Promise<number> {
  if (Platform.OS !== 'android') return 0;

  try {
    const hasPermissions = await checkSmsSyncPermissions();
    if (!hasPermissions) return 0;

    const { smsReader } = require('@/native');
    return await smsReader.getMessageCount();
  } catch (error) {
    Logger.error('SmsSync', 'Failed to get message count', error);
    return 0;
  }
}

/**
 * Check if initial sync has been performed
 */
export async function hasPerformedInitialSync(): Promise<boolean> {
  try {
    const result = await runQuery(
      'SELECT COUNT(*) as count FROM messages WHERE type = "incoming" OR type = "sent"'
    );
    const item = result?.rows?.item(0);
    const count = item?.count ?? 0;
    return count > 0;
  } catch (error) {
    Logger.error('SmsSync', 'Failed to check sync status', error);
    return false;
  }
}

/**
 * Perform initial SMS sync if needed
 */
export async function performInitialSyncIfNeeded(): Promise<{ synced: boolean; imported: number }> {
  try {
    const hasSynced = await hasPerformedInitialSync();
    if (hasSynced) {
      return { synced: false, imported: 0 };
    }

    const existingCount = await getExistingMessageCount();
    if (existingCount === 0) {
      return { synced: false, imported: 0 };
    }

    Logger.info('SmsSync', `Starting initial sync for ${existingCount} messages`);
    const result = await importExistingMessages();

    return {
      synced: result.success,
      imported: result.imported
    };
  } catch (error) {
    Logger.error('SmsSync', 'Initial sync failed', error);
    return { synced: false, imported: 0 };
  }
}
