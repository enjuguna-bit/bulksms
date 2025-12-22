import { runQuery } from '../database/core';
import Logger from '@/utils/logger';

export interface SendLog {
    id?: number;
    to_number: string;
    body?: string;
    bodyLength?: number;
    timestamp: number;
    status: string;
    simSlot?: number;
    error?: string;
}

/**
 * Add a new send log entry.
 */
export async function addSendLog(log: SendLog): Promise<void> {
    const sql = `
    INSERT INTO send_logs (to_number, body, bodyLength, timestamp, status, simSlot, error)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
    await runQuery(sql, [
        log.to_number,
        log.body || null,
        log.bodyLength || null,
        log.timestamp,
        log.status,
        log.simSlot || null,
        log.error || null
    ]);
}

/**
 * Get send logs within the specified max age (in milliseconds).
 */
export async function getSendLogs(maxAge: number): Promise<SendLog[]> {
    const cutoff = Date.now() - maxAge;
    const result = await runQuery(
        'SELECT * FROM send_logs WHERE timestamp > ? ORDER BY timestamp DESC',
        [cutoff]
    );
    return result.rows.raw();
}

/**
 * Check if the same message was sent to the same number recently (duplicate prevention).
 * @param phoneNumber - Normalized phone number
 * @param messageBody - Message content
 * @param windowMs - Time window to check (default: 5 minutes)
 * @returns true if duplicate found, false otherwise
 */
export async function isDuplicateSend(
    phoneNumber: string,
    messageBody: string,
    windowMs: number = 5 * 60 * 1000
): Promise<boolean> {
    const cutoff = Date.now() - windowMs;
    const result = await runQuery(
        `SELECT COUNT(*) as count FROM send_logs 
         WHERE to_number = ? AND body = ? AND timestamp > ? AND status = 'success'`,
        [phoneNumber, messageBody, cutoff]
    );
    const count = result.rows.item(0)?.count || 0;
    return count > 0;
}

/**
 * Check if any message was sent to this number recently (rate limiting per recipient).
 * @param phoneNumber - Normalized phone number
 * @param windowMs - Time window to check (default: 1 minute)
 * @param maxCount - Maximum sends allowed in window (default: 1)
 * @returns true if rate limit exceeded
 */
export async function isRateLimitExceeded(
    phoneNumber: string,
    windowMs: number = 60 * 1000,
    maxCount: number = 1
): Promise<boolean> {
    const cutoff = Date.now() - windowMs;
    const result = await runQuery(
        `SELECT COUNT(*) as count FROM send_logs 
         WHERE to_number = ? AND timestamp > ?`,
        [phoneNumber, cutoff]
    );
    const count = result.rows.item(0)?.count || 0;
    return count >= maxCount;
}

/**
 * Get send logs with pagination.
 */
export async function getSendLogsPaginated(limit: number = 50, offset: number = 0): Promise<SendLog[]> {
    const result = await runQuery(
        'SELECT * FROM send_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [limit, offset]
    );
    return result.rows.raw();
}

/**
 * Delete send logs older than maxAge milliseconds.
 * Uses batching to prevent blocking the UI thread.
 */
export async function pruneSendLogs(maxAge: number): Promise<number> {
    const cutoff = Date.now() - maxAge;
    let totalDeleted = 0;
    const BATCH_SIZE = 1000;

    Logger.info('Pruning', `Starting log pruning older than ${maxAge}ms`);

    while (true) {
        // SQLite DELETE LIMIT is not enabled by default in all compilations, so we use IN (SELECT ... LIMIT)
        const sql = `
            DELETE FROM send_logs 
            WHERE id IN (
                SELECT id FROM send_logs 
                WHERE timestamp < ? 
                LIMIT ?
            )
        `;

        try {
            const result = await runQuery(sql, [cutoff, BATCH_SIZE]);
            const count = result.rowsAffected || 0;
            totalDeleted += count;

            // If we deleted fewer than the batch size, we are done
            if (count < BATCH_SIZE) {
                break;
            }

            // Yield to the JS event loop to allow UI updates/interactions
            await new Promise(resolve => setTimeout(resolve, 20));
        } catch (error) {
            Logger.error('Pruning', 'Error during batched prune', error);
            break; // Stop on error to prevent infinite loops or crashes
        }
    }

    if (totalDeleted > 0) {
        Logger.info('Pruning', `Cleaned up ${totalDeleted} old logs`);
    }
    return totalDeleted;
}

/**
 * Get send statistics for a specific phone number.
 */
export async function getStatsForNumber(phoneNumber: string): Promise<{ total: number; success: number; failed: number }> {
    const totalResult = await runQuery(
        'SELECT COUNT(*) as count FROM send_logs WHERE to_number = ?',
        [phoneNumber]
    );
    const successResult = await runQuery(
        "SELECT COUNT(*) as count FROM send_logs WHERE to_number = ? AND status = 'success'",
        [phoneNumber]
    );
    const failedResult = await runQuery(
        "SELECT COUNT(*) as count FROM send_logs WHERE to_number = ? AND status = 'error'",
        [phoneNumber]
    );

    return {
        total: totalResult.rows.item(0).count,
        success: successResult.rows.item(0).count,
        failed: failedResult.rows.item(0).count
    };
}
