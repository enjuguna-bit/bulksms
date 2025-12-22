// ============================================================================
// 📜 messageReconciliation.ts — Message Status Reconciliation Service
// P1 FIX: Handles reconciliation of messages stuck in "sent" state
// ============================================================================

import { runQuery } from '@/db/database/core';
import Logger from '@/utils/logger';

export interface StaleMessage {
    id: number;
    to_number: string;
    status: string;
    timestamp: number;
    retryCount?: number;
}

/**
 * Get messages that are stuck in 'sent' or 'pending' state for too long.
 * These may have missed delivery callbacks.
 * 
 * @param staleThresholdMs - Time in ms after which a message is considered stale (default: 2 hours)
 * @param limit - Maximum messages to return
 */
export async function getStaleMessages(
    staleThresholdMs: number = 2 * 60 * 60 * 1000,
    limit: number = 100
): Promise<StaleMessage[]> {
    const cutoff = Date.now() - staleThresholdMs;
    const result = await runQuery(
        `SELECT id, to_number, status, timestamp, retryCount 
         FROM send_logs 
         WHERE (status = 'sent' OR status = 'pending') 
         AND timestamp < ? 
         ORDER BY timestamp ASC 
         LIMIT ?`,
        [cutoff, limit]
    );
    return result.rows.raw();
}

/**
 * Mark a message as having an unknown delivery status.
 * This is used when we can't determine the actual status.
 */
export async function markMessageUnknown(id: number): Promise<void> {
    await runQuery(
        `UPDATE send_logs SET status = 'unknown' WHERE id = ?`,
        [id]
    );
}

/**
 * Mark a message as delivered (confirmed delivery).
 */
export async function markMessageDelivered(id: number): Promise<void> {
    await runQuery(
        `UPDATE send_logs SET status = 'delivered' WHERE id = ?`,
        [id]
    );
}

/**
 * Get reconciliation statistics.
 */
export async function getReconciliationStats(): Promise<{
    pending: number;
    sent: number;
    delivered: number;
    failed: number;
    unknown: number;
}> {
    const pending = await runQuery("SELECT COUNT(*) as count FROM send_logs WHERE status = 'pending'");
    const sent = await runQuery("SELECT COUNT(*) as count FROM send_logs WHERE status = 'sent'");
    const delivered = await runQuery("SELECT COUNT(*) as count FROM send_logs WHERE status = 'delivered'");
    const failed = await runQuery("SELECT COUNT(*) as count FROM send_logs WHERE status = 'failed'");
    const unknown = await runQuery("SELECT COUNT(*) as count FROM send_logs WHERE status = 'unknown'");

    return {
        pending: pending.rows.item(0)?.count || 0,
        sent: sent.rows.item(0)?.count || 0,
        delivered: delivered.rows.item(0)?.count || 0,
        failed: failed.rows.item(0)?.count || 0,
        unknown: unknown.rows.item(0)?.count || 0,
    };
}

/**
 * Run reconciliation process.
 * Checks for stale messages and updates their status.
 * 
 * Note: In a production app with external SMS provider (like Twilio),
 * this would poll the provider's API for final delivery status.
 * For local SMS sending, we can only mark as 'unknown' after timeout.
 * 
 * @param staleThresholdMs - Time after which to consider a message stale
 * @returns Number of messages reconciled
 */
export async function runReconciliation(
    staleThresholdMs: number = 2 * 60 * 60 * 1000
): Promise<{ reconciled: number; details: string }> {
    try {
        Logger.info('Reconciliation', 'Starting message status reconciliation...');

        const staleMessages = await getStaleMessages(staleThresholdMs);

        if (staleMessages.length === 0) {
            Logger.info('Reconciliation', 'No stale messages found');
            return { reconciled: 0, details: 'No stale messages' };
        }

        Logger.info('Reconciliation', `Found ${staleMessages.length} stale messages`);

        let reconciledCount = 0;

        for (const msg of staleMessages) {
            // For local Android SMS, we can't query external delivery status
            // Mark as 'unknown' - in production with Twilio/etc, would poll their API here
            await markMessageUnknown(msg.id);
            reconciledCount++;
        }

        const details = `Marked ${reconciledCount} messages as 'unknown' status`;
        Logger.info('Reconciliation', details);

        return { reconciled: reconciledCount, details };
    } catch (error) {
        Logger.error('Reconciliation', 'Failed to run reconciliation', error);
        throw error;
    }
}

/**
 * Schedule periodic reconciliation.
 * Should be called on app startup.
 * 
 * @param intervalMs - How often to run reconciliation (default: 1 hour)
 * @returns Cleanup function to stop the scheduler
 */
export function scheduleReconciliation(intervalMs: number = 60 * 60 * 1000): () => void {
    // Run immediately on startup
    runReconciliation().catch(err =>
        Logger.error('Reconciliation', 'Startup reconciliation failed', err)
    );

    // Schedule periodic runs
    const intervalId = setInterval(() => {
        runReconciliation().catch(err =>
            Logger.error('Reconciliation', 'Periodic reconciliation failed', err)
        );
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(intervalId);
}
