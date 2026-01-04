import { runQuery } from '../database/core';

export interface QueuedSMS {
    id?: number;
    to_number: string;
    body: string;
    timestamp: number;
    status?: string;
    retryCount?: number;
    sim_slot?: number;
    db_message_id?: number;
    priority?: number; // 0=normal, 1=high, 2=urgent
}

/**
 * Add a new SMS to the queue with deduplication guard and priority.
 * Prevents duplicate entries if DB insert fails repeatedly and caller retries.
 * @param to - Recipient phone number
 * @param body - Message body
 * @param simSlot - SIM slot to use (0 or 1 for dual SIM)
 * @param dbMessageId - Optional: Linked message ID from messaging DB
 * @param priority - Optional: Priority level (0=normal, 1=high, 2=urgent)
 */
export async function enqueueMessage(
    to: string, 
    body: string, 
    simSlot: number = 0, 
    dbMessageId?: number,
    priority: number = 0
): Promise<void> {
    // ✅ DEDUPE GUARD: Check if identical message already exists in queue (within last 60s)
    // Prevents duplicate entries when DB insert fails repeatedly and caller retries
    const dedupeWindow = 60 * 1000; // 60 seconds
    const recentTimestamp = Date.now() - dedupeWindow;

    const duplicateCheck = await runQuery(
        `SELECT id FROM sms_queue 
         WHERE to_number = ? 
         AND body = ? 
         AND timestamp > ? 
         AND status IN ('pending', 'failed')
         AND sim_slot = ?
         LIMIT 1`,
        [to, body, recentTimestamp, simSlot]
    );

    if (duplicateCheck.rows.length > 0) {
        const existingId = duplicateCheck.rows.item(0).id;
        console.warn(`[SmsQueue] Duplicate message detected (id=${existingId}) - skipping insert for ${to}`);
        return; // Skip insert, message already queued
    }

    // No duplicate found, safe to insert
    const sql = 'INSERT INTO sms_queue (to_number, body, timestamp, sim_slot, db_message_id, priority) VALUES (?, ?, ?, ?, ?, ?)';
    await runQuery(sql, [to, body, Date.now(), simSlot, dbMessageId || null, priority]);
}

/**
 * Get all pending messages from the queue (including failed messages eligible for retry), sorted by priority then timestamp.
 * @param maxRetries - Maximum retry attempts before a message is considered exhausted
 */
export async function getPendingMessages(maxRetries: number = 3): Promise<QueuedSMS[]> {
    const result = await runQuery(
        `SELECT * FROM sms_queue 
         WHERE (status = 'pending' OR (status = 'failed' AND COALESCE(retryCount, 0) < ?))
         AND status != 'exhausted'
         ORDER BY priority DESC, timestamp ASC`,
        [maxRetries]
    );
    return result.rows.raw();
}

/**
 * Mark a message as successfully sent.
 */
export async function markMessageSent(id: number): Promise<void> {
    await runQuery("UPDATE sms_queue SET status = 'sent' WHERE id = ?", [id]);
}

/**
 * Mark a message as failed and increment retry count.
 * If retries are exhausted, status becomes 'failed', otherwise stays 'pending' for retry.
 * @param id - Message ID
 * @param maxRetries - Maximum retry attempts (default: 3)
 */
export async function markMessageFailed(id: number, maxRetries: number = 3): Promise<void> {
    // Increment retry count first
    await runQuery(
        "UPDATE sms_queue SET retryCount = COALESCE(retryCount, 0) + 1 WHERE id = ?",
        [id]
    );

    // Check if we've exceeded max retries
    const result = await runQuery(
        "SELECT retryCount FROM sms_queue WHERE id = ?",
        [id]
    );
    const retryCount = result.rows.item(0)?.retryCount || 0;

    // Only mark as 'failed' if retries exhausted, otherwise keep as 'pending'
    if (retryCount >= maxRetries) {
        await runQuery(
            "UPDATE sms_queue SET status = 'exhausted' WHERE id = ?",
            [id]
        );
    } else {
        // Keep status as 'pending' to allow retry
        await runQuery(
            "UPDATE sms_queue SET status = 'pending' WHERE id = ?",
            [id]
        );
    }
}

/**
 * Remove a message from the queue completely.
 */
export async function removeMessage(id: number): Promise<void> {
    await runQuery('DELETE FROM sms_queue WHERE id = ?', [id]);
}

/**
 * Get queue statistics.
 */
export async function getQueueStats(): Promise<{ pending: number; failed: number; exhausted: number; total: number }> {
    const totalResult = await runQuery('SELECT COUNT(*) as count FROM sms_queue');
    const pendingResult = await runQuery("SELECT COUNT(*) as count FROM sms_queue WHERE status = 'pending'");
    const failedResult = await runQuery("SELECT COUNT(*) as count FROM sms_queue WHERE status = 'failed'");
    const exhaustedResult = await runQuery("SELECT COUNT(*) as count FROM sms_queue WHERE status = 'exhausted'");

    return {
        total: totalResult.rows.item(0).count,
        pending: pendingResult.rows.item(0).count,
        failed: failedResult.rows.item(0).count,
        exhausted: exhaustedResult.rows.item(0).count
    };
}

/**
 * Clear all sent messages from the queue.
 */
export async function clearSentMessages(): Promise<void> {
    await runQuery("DELETE FROM sms_queue WHERE status = 'sent'");
}

/**
 * Get retry count for a specific message.
 */
export async function getRetryCount(id: number): Promise<number> {
    const result = await runQuery('SELECT retryCount FROM sms_queue WHERE id = ?', [id]);
    return result.rows.item(0)?.retryCount || 0;
}

/**
 * Reset failed messages to pending for retry (where retryCount < maxRetries).
 * Returns the number of messages reset.
 */
export async function resetFailedForRetry(maxRetries: number = 3): Promise<number> {
    const result = await runQuery(
        `UPDATE sms_queue SET status = 'pending' WHERE status = 'failed' AND retryCount < ?`,
        [maxRetries]
    );
    return result.rowsAffected || 0;
}

/**
 * Get failed messages that have exceeded max retries.
 */
export async function getExhaustedMessages(maxRetries: number = 3): Promise<QueuedSMS[]> {
    const result = await runQuery(
        `SELECT * FROM sms_queue WHERE status = 'exhausted' OR (status = 'failed' AND retryCount >= ?)`,
        [maxRetries]
    );
    return result.rows.raw();
}

/**
 * Delete all messages with 'exhausted' status.
 */
export async function clearExhaustedMessages(): Promise<void> {
    await runQuery("DELETE FROM sms_queue WHERE status = 'exhausted'");
}
